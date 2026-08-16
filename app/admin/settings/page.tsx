import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { createAdminClient } from "@/lib/supabase/admin";
import { stripe } from "@/lib/stripe";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/PageHeader";
import { Sliders } from "lucide-react";

export default async function SettingsPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  const isAdmin = profile.role === "ADMIN" || profile.role === "MANAGER";
  if (!isAdmin) {
    redirect("/");
  }

  const tenant = await getTenantContext();

  // Auto-sync Stripe Connect account status directly from Stripe API on load
  if (
    tenant.stripe_account_id &&
    (!tenant.stripe_charges_enabled || !tenant.stripe_details_submitted)
  ) {
    try {
      const account = await stripe.accounts.retrieve(tenant.stripe_account_id);
      if (
        account.charges_enabled !== tenant.stripe_charges_enabled ||
        account.details_submitted !== tenant.stripe_details_submitted
      ) {
        const supabaseAdmin = createAdminClient();
        await supabaseAdmin
          .from("tenants")
          .update({
            stripe_charges_enabled: account.charges_enabled,
            stripe_details_submitted: account.details_submitted,
          })
          .eq("id", tenant.id);

        tenant.stripe_charges_enabled = account.charges_enabled;
        tenant.stripe_details_submitted = account.details_submitted;
      }
    } catch (err) {
      console.error("Error auto-syncing Stripe account status:", err);
    }
  }

  return (
    <div className="min-h-screen">
      <PageHeader
        title="Configuración de Marca y Ticket"
        subtitle="Ajusta el nombre, colores, logotipo e información fiscal del ticket de tu restaurante."
        backHref="/"
        backLabel="Inicio"
        icon={<Sliders className="h-5 w-5 text-primary" />}
      />

      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-8 sm:px-6 lg:px-8">
        {/* Form Container */}
        <SettingsForm initialTenant={tenant} />
      </main>
    </div>
  );
}

