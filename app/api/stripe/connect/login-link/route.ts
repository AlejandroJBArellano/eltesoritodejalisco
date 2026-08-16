import { stripe } from "@/lib/stripe";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function POST() {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json(
        { error: "No autorizado para consultar Stripe" },
        { status: 401 }
      );
    }

    const tenant = await getTenantContext();

    if (!tenant.stripe_account_id) {
      return NextResponse.json(
        { error: "El restaurante no tiene una cuenta de Stripe Connect configurada" },
        { status: 400 }
      );
    }

    const loginLink = await stripe.accounts.createLoginLink(
      tenant.stripe_account_id
    );

    return NextResponse.json({ url: loginLink.url });
  } catch (error) {
    console.error("Error creating Stripe Connect login link:", error);
    return NextResponse.json(
      { error: "Error al generar la liga de acceso a Stripe" },
      { status: 500 }
    );
  }
}
