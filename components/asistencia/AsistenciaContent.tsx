"use client";

import { PageHeader } from "@/components/PageHeader";
import { FileText } from "lucide-react";
import Link from "next/link";
import { AdminControlsBar } from "./AdminControlsBar";
import { StaffAttendanceGrid } from "./StaffAttendanceGrid";
import { EmployeeCheckInCard } from "./EmployeeCheckInCard";
import { useAsistenciaContext, AsistenciaProvider } from "./AsistenciaContext";

function AsistenciaContentInner() {
  const {
    isAdmin,
    users,
    attendances,
    isLoading,
    error,
  } = useAsistenciaContext();

  return (
    <div className="min-h-screen bg-background pb-16 text-text-light">
      <PageHeader
        title="Control de Asistencia"
        subtitle="Registro de entrada y salida de turnos de personal"
        badgeColor="bg-primary"
        actions={
          isAdmin ? (
            <Link
              href="/asistencia/history"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-black uppercase tracking-wider hover:brightness-105 transition-all shadow-lg shadow-primary/20"
            >
              <FileText className="h-4 w-4" /> Ver Historial Completo
            </Link>
          ) : null
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {isLoading && !users.length && !attendances.length ? (
          <div className="flex justify-center py-20">
            <span className="text-xs font-bold text-text-light/40 uppercase tracking-widest">
              Cargando datos de asistencia...
            </span>
          </div>
        ) : error && !users.length && !attendances.length ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-4 rounded-xl text-center">
            {error}
          </div>
        ) : (
          <>
            {error && (
              <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-4 rounded-xl text-center">
                {error}
              </div>
            )}

            {isAdmin ? (
              <div className="space-y-8">
                <AdminControlsBar />
                <StaffAttendanceGrid />
              </div>
            ) : (
              <EmployeeCheckInCard />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export function AsistenciaContent() {
  return (
    <AsistenciaProvider>
      <AsistenciaContentInner />
    </AsistenciaProvider>
  );
}
