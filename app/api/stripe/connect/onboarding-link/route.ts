import { stripe } from "@/lib/stripe";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext, invalidateTenantCache } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json(
        { error: "No autorizado para configurar pagos" },
        { status: 401 }
      );
    }

    const tenant = await getTenantContext();
    const supabase = createAdminClient();

    let stripeAccountId = tenant.stripe_account_id;

    // Create a new Express account if tenant doesn't have one yet
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "MX",
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: tenant.name,
        },
        metadata: {
          tenantId: tenant.id,
        },
      });

      stripeAccountId = account.id;

      const { error: updateError } = await supabase
        .from("tenants")
        .update({ stripe_account_id: stripeAccountId })
        .eq("id", tenant.id);

      if (updateError) {
        console.error("Error updating tenant stripe_account_id:", updateError);
        return NextResponse.json(
          { error: "No se pudo guardar la cuenta de Stripe Connect" },
          { status: 500 }
        );
      }

      invalidateTenantCache(tenant.slug);
    }

    const referer = request.headers.get("referer");
    const origin = referer
      ? new URL(referer).origin
      : process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

    const accountLink = await stripe.accountLinks.create({
      account: stripeAccountId,
      refresh_url: `${origin}/admin/settings?stripe=refresh`,
      return_url: `${origin}/admin/settings?stripe=return`,
      type: "account_onboarding",
    });

    return NextResponse.json({ url: accountLink.url });
  } catch (error) {
    console.error("Error creating Stripe Connect onboarding link:", error);
    return NextResponse.json(
      { error: "Error al generar la liga de configuración con Stripe" },
      { status: 500 }
    );
  }
}
