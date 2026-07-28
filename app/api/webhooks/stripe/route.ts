import { stripe } from "@/lib/stripe";
import type Stripe from "stripe";
import { createAdminClient } from "@/lib/supabase/admin";
import { getCurrentCDMXDate, getCurrentCDMXDay } from "@/lib/utils";
import { deductInventoryForOrder } from "@/lib/services/inventory";
import { NextRequest, NextResponse } from "next/server";

export const config = {
  api: {
    bodyParser: false, // Disables standard body parser for signature verification
  },
};

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
      { status: 400 }
    );
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

      const customerName = metadata.customerName;
      const type = metadata.type || "takeout"; // 'takeout' | 'dine-in'
      const notes = metadata.notes || "";
      const orderItems = JSON.parse(metadata.orderItems);

      const supabaseAdmin = createAdminClient();

      // 1. Generate daily order sequence (similar to api/orders/route.ts)
      const todayStart = getCurrentCDMXDay() + "T00:00:00-06:00";
      const { data: latestCut } = await supabaseAdmin
        .from("daily_cuts")
        .select("created_at")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      let query = supabaseAdmin
        .from("orders")
        .select("order_number")
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

      for (const item of orderItems) {
        const { data: menuItem } = await supabaseAdmin
          .from("menu_items")
          .select("*")
          .eq("id", item.menuItemId)
          .single();

        if (menuItem) {
          const itemPrice = menuItem.price;
          const quantity = Number(item.quantity);
          subtotal += itemPrice * quantity;

          itemsWithPrices.push({
            id: crypto.randomUUID(),
            menu_item_id: item.menuItemId,
            quantity: quantity,
            unit_price: itemPrice,
            notes: item.notes || null,
          });
        }
      }

      const total = subtotal; // tax = 0%

      // 3. Create the order
      const { data: order, error: orderError } = await supabaseAdmin
        .from("orders")
        .insert({
          id: orderId,
          order_number: orderNumber,
          source: "PICKUP_APP",
          status: "PENDING", // Appears immediately on the KDS
          table: type === "dine-in" ? "Comer Aquí" : "Para Llevar",
          notes: `${notes} (Cliente: ${customerName})`.trim(),
          subtotal: subtotal,
          tax: 0,
          total: total,
          operational_date: getCurrentCDMXDay(),
          estado_cierre: "ABIERTA",
          updated_at: getCurrentCDMXDate(),
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
            order_id: order.id,
          }))
        );

      if (itemsError) throw itemsError;

      // 5. Create payment record
      const paymentId = crypto.randomUUID();
      const { error: paymentError } = await supabaseAdmin
        .from("payments")
        .insert({
          id: paymentId,
          order_id: order.id,
          method: "CARD",
          amount: total,
          received_amount: total,
          change: 0,
          created_at: new Date().toISOString(),
        });

      if (paymentError) throw paymentError;

      // 6. Deduct inventory ingredients automatically
      await deductInventoryForOrder(order.id);

      console.log(`[Stripe Webhook] Order ${orderNumber} created successfully via checkout session.`);
    } catch (orderCreationError) {
      console.error("[Stripe Webhook] Failed to record order:", orderCreationError);
      return NextResponse.json(
        { error: "Error processing checkout database insert" },
        { status: 500 }
      );
    }
  }

  return NextResponse.json({ received: true });
}
