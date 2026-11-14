import { stripe } from "@/lib/stripe";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";
import {
  CustomizationError,
  resolveOrderItems,
  type OrderItemInput,
} from "@/lib/customization/server";
import { saveCheckoutDraft } from "@/lib/customization/checkoutDraft";
import { formatSelectionLine } from "@/lib/customization";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderItems,
      type,
      customerName,
      notes,
      pickupTime,
      tipAmount,
      locale,
    } = body;

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json(
        { error: "Debe incluir al menos un producto en la orden" },
        { status: 400 },
      );
    }

    if (!customerName) {
      return NextResponse.json(
        { error: "El nombre del cliente es obligatorio" },
        { status: 400 },
      );
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();

    if (
      !tenant.stripe_account_id ||
      !tenant.stripe_charges_enabled ||
      tenant.commission_rate == null
    ) {
      return NextResponse.json(
        {
          error:
            "El restaurante aún no ha configurado sus pagos digitales con Stripe Connect",
        },
        { status: 400 },
      );
    }

    const commissionRate = tenant.commission_rate;

    const lineItems = [];
    const validatedItems = [];
    const descriptionItems = [];

    const referer = request.headers.get("referer");
    const origin =
      request.headers.get("origin") ||
      (referer ? new URL(referer).origin : null) ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "https://trykittn.com";
    const isEn = locale === "en";

    // Validar personalización y calcular precios en el servidor
    let resolvedItems;
    try {
      resolvedItems = await resolveOrderItems(
        tenant.id,
        orderItems.map(
          (item: {
            menuItemId: string;
            quantity: number | string;
            notes?: string;
            selections?: { optionId: string; quantity: number }[];
          }): OrderItemInput => ({
            menuItemId: item.menuItemId,
            quantity: Number(item.quantity),
            notes: item.notes || "",
            selections: item.selections || [],
          }),
        ),
        { includeModifiersInDiscount: true },
      );
    } catch (err) {
      if (err instanceof CustomizationError) {
        return NextResponse.json({ error: err.message }, { status: 400 });
      }
      throw err;
    }

    for (const [index, item] of orderItems.entries()) {
      const resolved = resolvedItems[index];
      const { data: menuItem, error: fetchError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", item.menuItemId)
        .eq("tenant_id", tenant.id)
        .single();

      if (fetchError || !menuItem) {
        return NextResponse.json(
          { error: `El producto con ID ${item.menuItemId} no existe` },
          { status: 400 },
        );
      }

      if (menuItem.is_available === false) {
        return NextResponse.json(
          {
            error: isEn
              ? `Item "${menuItem.name}" is currently sold out or unavailable`
              : `El producto "${menuItem.name}" está agotado o no disponible en este momento`,
          },
          { status: 400 },
        );
      }

      if (type === "takeout" && menuItem.show_in_takeaway === false) {
        return NextResponse.json(
          {
            error: isEn
              ? `Item "${menuItem.name}" is only available for dine-in`
              : `El producto "${menuItem.name}" solo está disponible para consumo en el restaurante`,
          },
          { status: 400 },
        );
      }

      if (type === "dine-in" && menuItem.show_in_dine_in === false) {
        return NextResponse.json(
          {
            error: isEn
              ? `Item "${menuItem.name}" is only available for takeout`
              : `El producto "${menuItem.name}" solo está disponible para llevar`,
          },
          { status: 400 },
        );
      }

      let stripeProductId = menuItem.stripe_product_id;

      // Fallback: If stripe_product_id is missing, create it on Stripe on the fly
      if (!stripeProductId) {
        try {
          const stripeProduct = await stripe.products.create({
            name: menuItem.name,
            description: menuItem.description || undefined,
            active: menuItem.is_available,
          });
          stripeProductId = stripeProduct.id;

          // Save back to local DB
          await supabase
            .from("menu_items")
            .update({ stripe_product_id: stripeProductId })
            .eq("id", menuItem.id);
        } catch (stripeErr) {
          console.error("Error creating Stripe product fallback:", stripeErr);
          return NextResponse.json(
            { error: "No se pudo sincronizar el producto con Stripe" },
            { status: 500 },
          );
        }
      }

      const selectionLine = formatSelectionLine(resolved.options);
      lineItems.push({
        price_data: selectionLine
          ? {
              // Personalizado: el nombre muestra la selección en el recibo
              currency: "mxn",
              unit_amount: Math.round(resolved.unitPrice * 100),
              product_data: {
                name: `${menuItem.name} (${selectionLine})`.slice(0, 250),
              },
            }
          : {
              currency: "mxn",
              unit_amount: Math.round(resolved.unitPrice * 100),
              product: stripeProductId,
            },
        quantity: resolved.quantity,
      });

      validatedItems.push({
        menuItemId: menuItem.id,
        quantity: resolved.quantity,
        notes: item.notes || "",
      });

      descriptionItems.push({
        name: selectionLine ? `${menuItem.name} (${selectionLine})` : menuItem.name,
        quantity: resolved.quantity,
      });
    }

    const rawTip = Number(tipAmount);
    const validatedTipAmount = Number.isFinite(rawTip)
      ? Math.max(0, Math.min(Math.round(rawTip * 100) / 100, 10000))
      : 0;
    if (validatedTipAmount > 0) {
      lineItems.push({
        price_data: {
          currency: "mxn",
          unit_amount: Math.round(validatedTipAmount * 100),
          product_data: {
            name: isEn ? "Tip" : "Propina",
          },
        },
        quantity: 1,
      });
    }

    // Calculate base total amount in cents and add separate Comisión por servicio digital line item
    const baseTotalAmountCents = lineItems.reduce(
      (acc, item) => acc + item.price_data.unit_amount * item.quantity,
      0,
    );
    const digitalFeeCents = Math.round(baseTotalAmountCents * commissionRate);

    if (digitalFeeCents > 0) {
      lineItems.push({
        price_data: {
          currency: "mxn",
          unit_amount: digitalFeeCents,
          product_data: {
            name: isEn
              ? "Digital service fee"
              : "Comisión por servicio digital",
          },
        },
        quantity: 1,
      });
    }

    const applicationFeeAmount = digitalFeeCents;

    const orderId = crypto.randomUUID();

    const typeLabel =
      type === "dine-in"
        ? isEn
          ? "Dine-in"
          : "Comer aquí"
        : isEn
          ? "Takeout"
          : "Para llevar";

    let timeFormatted = isEn
      ? "I'm on my way (~30 min)"
      : "Voy para allá (~30 min)";
    if (pickupTime) {
      try {
        const dateObj = new Date(pickupTime);
        timeFormatted = dateObj.toLocaleString(isEn ? "en-US" : "es-MX", {
          weekday: "short",
          month: "short",
          day: "numeric",
          hour: "2-digit",
          minute: "2-digit",
          hour12: isEn,
        });
      } catch (err) {
        console.error("Error formatting pickup time:", err);
      }
    }

    const itemsSummary = descriptionItems
      .map((i) => `${i.quantity}x ${i.name}`)
      .join(", ");

    const paymentDescription = isEn
      ? `Customer: ${customerName} | Order: ${itemsSummary} | Type: ${typeLabel} | Time: ${timeFormatted}${notes ? ` | Notes: ${notes}` : ""}`
      : `Cliente: ${customerName} | Orden: ${itemsSummary} | Tipo: ${typeLabel} | Hora: ${timeFormatted}${notes ? ` | Notas: ${notes}` : ""}`;

    const paymentDescriptionTruncated = paymentDescription.substring(0, 1000);

    const submitMessage = isEn
      ? `Order for ${customerName} (${typeLabel}). Date: ${timeFormatted}.`
      : `Orden para ${customerName} (${typeLabel}). Fecha: ${timeFormatted}.`;

    const compactOrderItems = validatedItems.map((item) =>
      item.notes
        ? [item.menuItemId, item.quantity, item.notes.slice(0, 100)]
        : [item.menuItemId, item.quantity],
    );

    // Carrito validado y con precio ⇒ borrador (la metadata solo lleva el id).
    const draftId = await saveCheckoutDraft(
      createAdminClient(),
      tenant.id,
      orderId,
      resolvedItems,
    );
    const hasCustomization = resolvedItems.some((i) => i.hasCustomization);
    if (!draftId && hasCustomization) {
      return NextResponse.json(
        { error: "No se pudo preparar el pago. Intenta de nuevo." },
        { status: 500 },
      );
    }
    const legacyItemsJson = JSON.stringify(compactOrderItems);
    if (!draftId && legacyItemsJson.length > 500) {
      // Sin borrador y sin espacio en la metadata no habría cómo crear la orden.
      return NextResponse.json(
        { error: "No se pudo preparar el pago. Intenta de nuevo." },
        { status: 500 },
      );
    }

    const stripeLocale = isEn ? "en" : "es-419";

    const session = await stripe.checkout.sessions.create({
      line_items: lineItems,
      mode: "payment",
      locale: stripeLocale,
      phone_number_collection: {
        enabled: true,
      },
      payment_intent_data: {
        description: paymentDescriptionTruncated,
        application_fee_amount: applicationFeeAmount,
        transfer_data: {
          destination: tenant.stripe_account_id,
        },
      },
      custom_text: {
        submit: {
          message: submitMessage,
        },
      },
      success_url: `${origin}/?order_id=${orderId}&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: {
        orderId,
        tenantId: tenant.id,
        customerName: (customerName || "").slice(0, 100),
        type, // 'takeout' | 'dine-in'
        notes: (notes || "").slice(0, 300),
        ...(draftId ? { draftId } : {}),
        // Compatibilidad: solo si cabe en el límite de 500 caracteres de Stripe
        ...(!hasCustomization && legacyItemsJson.length <= 500
          ? { orderItems: legacyItemsJson }
          : {}),
        pickupTime: pickupTime || "",
        tipAmount: validatedTipAmount.toString(),
        commissionRate: commissionRate.toString(),
      },
    });

    return NextResponse.json({
      sessionId: session.id,
      url: session.url,
    });
  } catch (error) {
    console.error("Error creating Stripe checkout session:", error);
    return NextResponse.json(
      { error: "Error interno al iniciar el pago" },
      { status: 500 },
    );
  }
}
