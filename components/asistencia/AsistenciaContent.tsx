"use client";

import { PageHeader } from "@/components/PageHeader";
import { FileText, Calendar, Clock } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { AdminControlsBar } from "./AdminControlsBar";
import { StaffAttendanceGrid } from "./StaffAttendanceGrid";
import { EmployeeCheckInCard } from "./EmployeeCheckInCard";
import { EmployeeShiftsSchedule } from "./EmployeeShiftsSchedule";
import { useAsistenciaContext, AsistenciaProvider } from "./AsistenciaContext";

function AsistenciaContentInner() {
  const {
    isAdmin,
    users,
    attendances,
    isLoading,
    error,
  } = useAsistenciaContext();

  const [employeeTab, setEmployeeTab] = useState<"checkin" | "schedule">("checkin");

  return (
    <div className="min-h-screen bg-background pb-16 text-text-light">
      <PageHeader
        title="Control de Asistencia"
        subtitle="Registro de entrada y salida de turnos de personal"
        badgeColor="bg-primary"
        actions={
          isAdmin ? (
            <div className="flex items-center gap-2">
              <Link
                href="/admin/horarios"
                className="inline-flex items-center gap-2 rounded-xl bg-white/10 border border-white/15 px-4 py-2 text-xs font-black text-white uppercase tracking-wider hover:bg-white/20 transition-all"
              >
                <Calendar className="h-4 w-4 text-primary" /> Programar Turnos
              </Link>
              <Link
                href="/asistencia/history"
                className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-black uppercase tracking-wider hover:brightness-105 transition-all shadow-lg shadow-primary/20"
              >
                <FileText className="h-4 w-4" /> Ver Historial
              </Link>
            </div>
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
              <div className="space-y-6">
                {/* Employee Navigation Tabs */}
                <div className="flex justify-center">
                  <div className="inline-flex p-1 rounded-2xl bg-card border border-border shadow-sm">
                    <button
                      onClick={() => setEmployeeTab("checkin")}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        employeeTab === "checkin"
                          ? "bg-primary text-black shadow-md shadow-primary/20"
                          : "text-text-light/70 hover:text-text-light"
                      }`}
                    >
                      <Clock className="h-3.5 w-3.5" /> Registrar Asistencia
                    </button>
                    <button
                      onClick={() => setEmployeeTab("schedule")}
                      className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                        employeeTab === "schedule"
                          ? "bg-primary text-black shadow-md shadow-primary/20"
                          : "text-text-light/70 hover:text-text-light"
                      }`}
                    >
                      <Calendar className="h-3.5 w-3.5" /> Mis Turnos
                    </button>
                  </div>
                </div>

                {employeeTab === "checkin" ? (
                  <EmployeeCheckInCard />
                ) : (
                  <EmployeeShiftsSchedule />
                )}
              </div>
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
