"use client";

import { Clock, FileText, Users } from "lucide-react";
import { useAsistenciaHistoryContext } from "./AsistenciaHistoryContext";

export function AsistenciaSummaryKPIs() {
  const { filteredAttendances, totalHoursWorked, activeCount } =
    useAsistenciaHistoryContext();

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
      <div className="rounded-2xl bg-card p-5 border border-border flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Total Registros
          </p>
          <p className="mt-1 text-2xl font-black text-text-light">
            {filteredAttendances.length}
          </p>
        </div>
        <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
          <FileText className="h-5 w-5" />
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 border border-border flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Horas Totales Trabajadas
          </p>
          <p className="mt-1 text-2xl font-black text-emerald-400">
            {totalHoursWorked.toFixed(1)} hrs
          </p>
        </div>
        <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
          <Clock className="h-5 w-5" />
        </div>
      </div>

      <div className="rounded-2xl bg-card p-5 border border-border flex items-center justify-between">
        <div>
          <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Turnos Activos Ahora
          </p>
          <p className="mt-1 text-2xl font-black text-amber-400">
            {activeCount}
          </p>
        </div>
        <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
          <Users className="h-5 w-5" />
        </div>
      </div>
    </section>
  );
}
