import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminHorariosContent } from "@/components/admin/AdminHorariosContent";
import { getTenantContext } from "@/lib/tenant";

export interface DbBusinessHours {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

async function getBusinessHours(): Promise<DbBusinessHours[]> {
  const profile = await getProfile();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
    redirect("/");
  }

  const tenant = await getTenantContext();
  const supabase = createAdminClient();
  const { data: hours, error } = await supabase
    .from("business_hours")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("day_of_week", { ascending: true });

  if (error) {
    console.error("Error fetching business hours:", error);
    return [];
  }

  return hours || [];
}

export default async function AdminHorariosPage() {
  const hours = await getBusinessHours();

  return <AdminHorariosContent initialHours={hours} />;
}
