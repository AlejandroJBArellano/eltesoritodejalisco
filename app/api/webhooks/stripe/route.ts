import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCDMXDate, getCurrentCDMXDay } from "@/lib/utils";
import { deductInventoryForOrder } from "@/lib/services/inventory";
import { invalidateTenantCache } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const bodyText = await request.text();
  const sig = request.headers.get("stripe-signature");

  let event;

  try {
    const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
    if (!webhookSecret) {
      throw new Error("STRIPE_WEBHOOK_SECRET is not configured.");
    }
    if (!sig) {
      throw new Error("stripe-signature header is missing.");
    }
    event = stripe.webhooks.constructEvent(bodyText, sig, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return NextResponse.json(
      { error: `Webhook Error: ${(err as Error).message}` },
      { status: 400 },
    );
  }

  // Handle account.updated event (Stripe Connect onboarding status change)
  if (event.type === "account.updated") {
    const account = event.data.object as Stripe.Account;
    try {
      const supabaseAdmin = createAdminClient();
      const { error: updateError } = await supabaseAdmin
        .from("tenants")
        .update({
          stripe_charges_enabled: account.charges_enabled,
          stripe_details_submitted: account.details_submitted,
          updated_at: getCurrentCDMXDate(),
        })
        .eq("stripe_account_id", account.id);

      if (updateError) {
        console.error("Error updating tenant Stripe Connect status:", updateError);
      } else {
        invalidateTenantCache();
        console.log(
          `[Stripe Webhook] Updated Connect status for account ${account.id}: charges_enabled=${account.charges_enabled}`,
        );
      }
    } catch (err) {
      console.error("Failed handling account.updated webhook:", err);
    }
  }

  // Handle checkout.session.completed event
  if (event.type === "checkout.session.completed") {
    const session = event.data.object as Stripe.Checkout.Session;
    const metadata = session.metadata;

    if (!metadata || !metadata.orderItems) {
      console.warn("Stripe Checkout Session missing order metadata.");
      return NextResponse.json({ received: true });
    }

    try {
      const orderId = metadata.orderId;
      if (!orderId) {
        throw new Error("orderId description is missing in session metadata");
      }

      const tenantId = metadata.tenantId;
      if (!tenantId) {
        throw new Error("tenantId is missing in session metadata");
      }

      const customerName = metadata.customerName;
      const type = metadata.type || "takeout"; // 'takeout' | 'dine-in'
      const notes = metadata.notes || "";
      const orderItems = JSON.parse(metadata.orderItems);
      const pickupTime = metadata.pickupTime || null;
      const tipAmount = Number(metadata.tipAmount || 0);

      const email = session.customer_details?.email || null;
      const rawPhone = session.customer_details?.phone || null;

      // Normalize phone to E.164 (preserve leading '+' and digits)
      const phone = rawPhone ? (rawPhone.startsWith("+") ? "+" : "") + rawPhone.replace(/\D/g, "") : null;

      const supabaseAdmin = createAdminClient();

      let commissionRate: number;
      if (metadata.commissionRate) {
        commissionRate = Number(metadata.commissionRate);
      } else {
        const { data: tenantData } = await supabaseAdmin
          .from("tenants")
          .select("commission_rate")
          .eq("id", tenantId)
          .single();
        commissionRate = tenantData!.commission_rate!;
      }

      // Look up or create the customer in the CRM (customers table)
      let customerId: string | null = null;
      if (email || phone) {
        try {
          let customerQuery = supabaseAdmin
            .from("customers")
            .select("id")
            .eq("tenant_id", tenantId);

          if (email && phone) {
            customerQuery = customerQuery.or(`email.eq.${email},phone.eq.${phone}`);
          } else if (email) {
            customerQuery = customerQuery.eq("email", email);
          } else if (phone) {
            customerQuery = customerQuery.eq("phone", phone);
          }

          const { data: existingCustomer, error: findError } = await customerQuery.limit(1).maybeSingle();
          if (findError) {
            console.error("Error looking up existing customer:", findError);
          }

          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            // Create new customer
            const newCustomerId = crypto.randomUUID();
            const { data: newCustomer, error: insertCustomerError } = await supabaseAdmin
              .from("customers")
              .insert({
                id: newCustomerId,
                name: customerName,
                phone: phone,
                email: email,
                tenant_id: tenantId,
                updated_at: getCurrentCDMXDate(),
              })
              .select("id")
              .single();

            if (insertCustomerError) {
              console.error("Error creating new customer:", insertCustomerError);
            } else if (newCustomer) {
              customerId = newCustomer.id;
            }
          }
        } catch (crmErr) {
          console.error("Failed CRM operation during stripe webhook:", crmErr);
        }
      }

      // 1. Generate daily order sequence (scoped to this tenant)
      const todayStart = getCurrentCDMXDay() + "T00:00:00-06:00";
      const { data: latestCut } = await supabaseAdmin
        .from("daily_cuts")
        .select("created_at")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let query = supabaseAdmin
        .from("orders")
        .select("order_number")
        .eq("tenant_id", tenantId)
        .order("created_at", { ascending: false });

      const filterDate =
        latestCut && latestCut.created_at > todayStart
          ? latestCut.created_at
          : todayStart;

      query = query.gt("created_at", filterDate);

      const { data: lastOrder } = await query.limit(1).maybeSingle();

      let nextSeq = 1;
      if (lastOrder && lastOrder.order_number) {
        const parts = lastOrder.order_number.split("-");
        const lastSeqStr = parts[parts.length - 1];
        nextSeq = parseInt(lastSeqStr, 10) + 1;
      }

      const todayStr = getCurrentCDMXDay().replace(/-/g, "").slice(2);
      const orderNumber = `${todayStr}-${nextSeq.toString().padStart(3, "0")}`;

      // 2. Fetch prices and calculate totals
      let subtotal = 0;
      const itemsWithPrices = [];
      const itemSummaries = [];

      for (const item of orderItems) {
        const { data: menuItem } = await supabaseAdmin
          .from("menu_items")
          .select("*")
          .eq("id", item.menuItemId)
          .eq("tenant_id", tenantId)
          .single();

        if (menuItem) {
          const itemPrice = Math.round(menuItem.price * (1 + commissionRate) * 100) / 100;
          const quantity = Number(item.quantity);
          subtotal += itemPrice * quantity;

          itemsWithPrices.push({
            id: crypto.randomUUID(),
            menu_item_id: item.menuItemId,
            quantity: quantity,
            unit_price: itemPrice,
            notes: item.notes || null,
          });

          itemSummaries.push(`${quantity}x ${menuItem.name}`);
        }
      }

      const total = subtotal; // tax = 0%

      // 3. Format full order notes matching Stripe description structure
      const typeLabel = type === "dine-in" ? "Comer Aquí" : "Para Llevar";
      let timeFormatted = "Voy para allá (~30 min)";
      if (pickupTime) {
        try {
          const dateObj = new Date(pickupTime);
          timeFormatted = dateObj.toLocaleString("es-MX", {
            weekday: "short",
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          });
        } catch (err) {
          console.error("Error formatting pickup time:", err);
        }
      }

      const itemsSummary = itemSummaries.join(", ");
      const notesFormatted = [
        `Cliente: ${customerName}`,
        phone ? `Tel: ${phone}` : null,
        email ? `Correo: ${email}` : null,
        itemsSummary ? `Orden: ${itemsSummary}` : null,
        `Tipo: ${typeLabel}`,
        `Hora: ${timeFormatted}`,
        notes ? `Notas: ${notes}` : null,
      ]
        .filter(Boolean)
        .join(" | ");

      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          id: orderId,
          tenant_id: tenantId,
          customer_id: customerId,
          order_number: orderNumber,
          source: "PICKUP_APP",
          status: "PENDING", // Appears immediately on the KDS
          table: type === "dine-in" ? "Comer Aquí" : "Para Llevar",
          notes: notesFormatted,
          subtotal: subtotal,
          tax: 0,
          total: total,
          operational_date: getCurrentCDMXDay(),
          estado_cierre: "ABIERTA",
          updated_at: getCurrentCDMXDate(),
          pickup_time: pickupTime ? new Date(pickupTime).toISOString() : null,
        })
        .select()
        .single();

      if (orderError) throw orderError;

      // 4. Create the order items
      const { error: itemsError } = await supabaseAdmin
        .from("order_items")
        .insert(
          itemsWithPrices.map((item) => ({
            ...item,
            tenant_id: tenantId,
            order_id: order.id,
          })),
        );

      if (itemsError) throw itemsError;

      // 5. Create payment record
      const paymentId = crypto.randomUUID();
      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          id: paymentId,
          tenant_id: tenantId,
          order_id: order.id,
          method: "CARD",
          amount: total,
          received_amount: total + Math.round(tipAmount * (1 + commissionRate) * 100) / 100,
          change: 0,
          tip_amount: tipAmount,
          created_at: new Date().toISOString(),
        });

      if (paymentError) throw paymentError;

      // 6. Deduct inventory ingredients automatically
      await deductInventoryForOrder(order.id);

      console.log(
        `[Stripe Webhook] Order ${orderNumber} created successfully via checkout session.`,
      );
    } catch (orderCreationError) {
      console.error(
        "[Stripe Webhook] Failed to record order:",
        orderCreationError,
      );
      return NextResponse.json(
        { error: "Error processing checkout database insert" },
        { status: 500 },
      );
    }
  }

  return NextResponse.json({ received: true });
}
