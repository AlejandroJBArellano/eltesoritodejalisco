import { getProfile } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getTenantContext } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/admin/SettingsForm";
import { PageHeader } from "@/components/PageHeader";
import { Sliders } from "lucide-react";

export default async function SettingsPage() {
  const profile = await getProfile();

  if (!profile) {
    redirect("/login");
  }

  const canManage =
    profile.role === "ADMIN" ||
    profile.role === "MANAGER" ||
    hasPermission(profile, "settings.manage_restaurant");

  if (!canManage) {
    redirect("/");
  }

  const tenant = await getTenantContext();

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
