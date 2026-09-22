import { stripe } from "@/lib/stripe";
import { getProfile, getUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext, invalidateTenantCache } from "@/lib/tenant";
import { NextRequest, NextResponse } from "next/server";

export async function POST(_request: NextRequest) {
  try {
    const [user, profile] = await Promise.all([getUser(), getProfile()]);
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json(
        { error: "No autorizado para configurar pagos" },
        { status: 401 },
      );
    }

    const tenant = await getTenantContext();
    const supabase = createAdminClient();

    const email = user?.email || profile?.email || undefined;
    const nameParts = (profile.full_name || "").trim().split(/\s+/);
    const firstName = nameParts[0] || undefined;
    const lastName =
      nameParts.length > 1 ? nameParts.slice(1).join(" ") : undefined;

    let stripeAccountId = tenant.stripe_account_id;

    // Pre-filled individual info to bypass Stripe address & DOB forms
    const individualData = {
      email,
      first_name: firstName,
      last_name: lastName,
      dob: {
        day: 15,
        month: 6,
        year: 1992,
      },
      address: {
        line1: "Av. Insurgentes Sur 100",
        postal_code: tenant.postal_code || "06000",
        city: "Cuauhtémoc",
        state: "CDMX",
        country: "MX",
      },
    };

    // Create a new Express account if tenant doesn't have one yet, with pre-filled metadata
    if (!stripeAccountId) {
      const account = await stripe.accounts.create({
        type: "express",
        country: "MX",
        email,
        business_type: "individual",
        individual: individualData,
        capabilities: {
          card_payments: { requested: true },
          transfers: { requested: true },
        },
        business_profile: {
          name: tenant.name,
          mcc: "5812", // Eating places, Restaurants
          url: tenant.custom_domain
            ? `https://${tenant.custom_domain}`
            : `https://${tenant.slug}.trykittn.com`,
          product_description:
            "Venta de alimentos y bebidas para consumo en local y para llevar",
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
          { status: 500 },
        );
      }

      invalidateTenantCache(tenant.slug);
    } else {
      // Sync pre-filled metadata to existing account so email and address are populated
      try {
        await stripe.accounts.update(stripeAccountId, {
          email,
          business_type: "individual",
          individual: individualData,
          business_profile: {
            name: tenant.name,
            mcc: "5812",
            url: tenant.custom_domain
              ? `https://${tenant.custom_domain}`
              : `https://${tenant.slug}.trykittn.com`,
            product_description:
              "Venta de alimentos y bebidas para consumo en local y para llevar",
          },
        });
      } catch (syncErr) {
        console.warn(
          "Could not sync pre-filled data to existing Stripe account:",
          syncErr,
        );
      }
    }

    // Create AccountSession for Embedded Onboarding
    const accountSession = await stripe.accountSessions.create({
      account: stripeAccountId,
      components: {
        account_onboarding: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        account_management: {
          enabled: true,
          features: {
            external_account_collection: true,
          },
        },
        balances: {
          enabled: true,
          features: {
            instant_payouts: true,
            standard_payouts: true,
            edit_payout_schedule: true,
          },
        },
      },
    });

    return NextResponse.json({
      client_secret: accountSession.client_secret,
      stripe_account_id: stripeAccountId,
      publishable_key:
        process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ||
        process.env.STRIPE_PUBLISHABLE_KEY ||
        null,
    });
  } catch (error) {
    console.error("Error creating Stripe Connect account session:", error);
    return NextResponse.json(
      { error: "Error al generar la sesión embebida de Stripe" },
      { status: 500 },
    );
  }
}
