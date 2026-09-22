import { getProfile } from "@/lib/auth";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { AdminUsersSubnav } from "@/components/admin/users/AdminUsersSubnav";
import { Users } from "lucide-react";
import React from "react";

export const metadata = {
  title: "Gestión de Equipo | KittnOS",
  description:
    "Administración centralizada de colaboradores, roles, horarios, turnos y control de tareas",
};

export default async function AdminUsersLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-background text-text-light">
      <PageHeader
        title="Gestión de Equipo"
        subtitle="Control de colaboradores, permisos, horarios semanales, asistencia y checklist operativo"
        badgeColor="bg-primary"
        icon={<Users className="h-5 w-5 text-primary" />}
      />

      <AdminUsersSubnav />

      {children}
    </div>
  );
}
