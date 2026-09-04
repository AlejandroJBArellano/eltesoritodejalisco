"use client";

import { FileText } from "lucide-react";
import Link from "next/link";
import { StaffAttendanceCard } from "./StaffAttendanceCard";
import { useAsistenciaContext } from "./AsistenciaContext";

export function StaffAttendanceGrid() {
  const {
    users,
    getActiveAttendance,
    getFinishedAttendances,
    getEmployeeHours,
    isSubmitting,
    handleAction,
  } = useAsistenciaContext();

  return (
    <div className="space-y-6">
      {/* Section Header */}
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-secondary" />
          Personal & Estado de Turnos Hoy
        </h2>
        <Link
          href="/asistencia/history"
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-black uppercase tracking-wider hover:brightness-105 transition-all shadow-md active:scale-95"
        >
          <FileText className="h-4 w-4" /> Historial Completo
        </Link>
      </div>

      {/* Grid */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {users.map((user) => (
          <StaffAttendanceCard
            key={user.id}
            user={user}
            activeAttendance={getActiveAttendance(user.id)}
            finishedAttendances={getFinishedAttendances(user.id)}
            totalHoursFinished={getEmployeeHours(user.id)}
            isLoading={isSubmitting}
            onAction={handleAction}
          />
        ))}
      </div>
    </div>
  );
}
