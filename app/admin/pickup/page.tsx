import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTenantContext, invalidateTenantCache } from "@/lib/tenant";
import { stripe } from "@/lib/stripe";
import {
  AdminPickupContent,
  type DbBusinessHours,
} from "@/components/admin/pickup/AdminPickupContent";

export const metadata = {
  title: "Kittn Pickup & Horarios | KittnOS",
  description:
    "Administración del portal web de comensales y horarios de atención al público",
};

export default async function AdminPickupPage() {
  const profile = await getProfile();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
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
        invalidateTenantCache(tenant.slug);
      }
    } catch (err) {
      console.error("Error auto-syncing Stripe account status:", err);
    }
  }

  const supabase = createAdminClient();

  const { data: hoursData, error: hoursError } = await supabase
    .from("business_hours")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("day_of_week", { ascending: true });

  if (hoursError) {
    console.error("Error fetching business hours for pickup:", hoursError);
  }

  const defaultHours: DbBusinessHours[] = Array.from({ length: 7 }, (_, i) => ({
    id: `temp-${i}`,
    day_of_week: i,
    open_time: "09:00:00",
    close_time: "22:00:00",
    is_closed: false,
  }));

  const hoursList =
    hoursData && hoursData.length > 0
      ? (hoursData as DbBusinessHours[])
      : defaultHours;

  return <AdminPickupContent initialTenant={tenant} initialHours={hoursList} />;
}
