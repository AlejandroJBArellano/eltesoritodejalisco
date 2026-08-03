import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe";
import { getTenantContext } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderItems, type, customerName, notes, pickupTime } = body;

    if (!orderItems || !Array.isArray(orderItems) || orderItems.length === 0) {
      return NextResponse.json(
        { error: "Debe incluir al menos un producto en la orden" },
        { status: 400 }
      );
    }

    if (!customerName) {
      return NextResponse.json(
        { error: "El nombre del cliente es obligatorio" },
        { status: 400 }
      );
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();

    const lineItems = [];
    const validatedItems = [];

    for (const item of orderItems) {
      const { data: menuItem, error: fetchError } = await supabase
        .from("menu_items")
        .select("*")
        .eq("id", item.menuItemId)
        .eq("tenant_id", tenant.id)
        .single();

      if (fetchError || !menuItem) {
        return NextResponse.json(
          { error: `El producto con ID ${item.menuItemId} no existe` },
          { status: 400 }
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
            { status: 500 }
          );
        }
      }

      lineItems.push({
        price_data: {
          currency: "mxn",
          unit_amount: Math.round(menuItem.price * 1.035 * 100),
          product: stripeProductId,
        },
        quantity: Number(item.quantity),
      });

      validatedItems.push({
        menuItemId: menuItem.id,
        quantity: Number(item.quantity),
        notes: item.notes || "",
      });
    }

    // Origin site URL from referer header to support different ports/domains (e.g. Vite dev server)
    const referer = request.headers.get("referer");
    const origin = referer 
      ? new URL(referer).origin 
      : (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000");

    const orderId = crypto.randomUUID();

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      line_items: lineItems,
      mode: "payment",
      success_url: `${origin}/?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${origin}/`,
      metadata: {
        orderId,
        tenantId: tenant.id,
        customerName,
        type, // 'takeout' | 'dine-in'
        notes: notes || "",
        orderItems: JSON.stringify(validatedItems),
        pickupTime: pickupTime || "",
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
      { status: 500 }
    );
  }
}
