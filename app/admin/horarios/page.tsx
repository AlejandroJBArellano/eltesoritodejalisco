import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AdminHorariosContent } from "@/components/admin/AdminHorariosContent";
import { getTenantContext } from "@/lib/tenant";
import type { ShiftUserOption } from "@/components/admin/shifts/ShiftModal";

import { getTenantCollaborators } from "@/lib/users";

export interface DbBusinessHours {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export const metadata = {
  title: "Turnos y Horarios | KittnOS",
  description: "Gestión de turnos de colaboradores y horarios de atención",
};

async function getPageData(): Promise<{
  hours: DbBusinessHours[];
  users: ShiftUserOption[];
  toleranceMinutes: number;
}> {
  const profile = await getProfile();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
    redirect("/");
  }

  const tenant = await getTenantContext();
  const supabase = createAdminClient();

  const [hoursRes, users] = await Promise.all([
    supabase
      .from("business_hours")
      .select("*")
      .eq("tenant_id", tenant.id)
      .order("day_of_week", { ascending: true }),
    getTenantCollaborators(tenant.id),
  ]);

  if (hoursRes.error) {
    console.error("Error fetching business hours:", hoursRes.error);
  }

  return {
    hours: hoursRes.data || [],
    users: users || [],
    toleranceMinutes: tenant.attendance_tolerance_minutes ?? 10,
  };
}

export default async function AdminHorariosPage() {
  const { hours, users, toleranceMinutes } = await getPageData();

  return (
    <AdminHorariosContent
      initialHours={hours}
      initialUsers={users}
      initialToleranceMinutes={toleranceMinutes}
    />
  );
}
