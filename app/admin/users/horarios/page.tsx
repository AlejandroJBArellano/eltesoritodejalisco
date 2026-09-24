import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { getTenantContext } from "@/lib/tenant";
import { getTenantCollaborators } from "@/lib/users";
import { AdminHorariosTurnosTab } from "@/components/admin/shifts/AdminHorariosTurnosTab";

export const metadata = {
  title: "Horarios | KittnOS",
  description: "Planeación de turnos y asistencia",
};

export default async function AdminUsersHorariosPage() {
  const profile = await getProfile();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
    redirect("/");
  }

  const tenant = await getTenantContext();
  const users = await getTenantCollaborators(tenant.id);

  return (
    <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <AdminHorariosTurnosTab
        initialUsers={users || []}
        initialToleranceMinutes={tenant.attendance_tolerance_minutes ?? 10}
      />
    </main>
  );
}
