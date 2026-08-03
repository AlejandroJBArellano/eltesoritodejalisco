import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { SettingsForm } from "@/components/admin/SettingsForm";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

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

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-12 sm:px-6 lg:px-8">
        
        {/* Page Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-1.5 mb-2">
              <Link
                href="/"
                className="text-[#E0E0E0]/40 hover:text-white flex items-center gap-0.5 text-xs font-bold uppercase tracking-wider transition"
              >
                <ChevronLeft className="h-4 w-4" /> Inicio
              </Link>
            </div>
            <h1 className="text-2xl sm:text-4xl font-black text-white tracking-tight uppercase">
              Configuración de Marca y Ticket
            </h1>
            <p className="text-xs sm:text-sm font-medium text-[#E0E0E0]/50 mt-1">
              Ajusta el nombre, colores, logotipo e información fiscal del ticket de tu restaurante.
            </p>
          </div>
        </div>

        {/* Form Container */}
        <SettingsForm initialTenant={tenant} />

      </main>
    </div>
  );
}
