import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
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
