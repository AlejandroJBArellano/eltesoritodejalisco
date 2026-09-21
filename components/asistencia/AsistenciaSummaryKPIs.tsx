"use client";

import { Clock, FileText, Users } from "lucide-react";
import { useAsistenciaHistoryContext } from "./AsistenciaHistoryContext";

export function AsistenciaSummaryKPIs() {
  const { filteredAttendances, totalHoursWorked, activeCount } =
    useAsistenciaHistoryContext();

  return (
    <section className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
      <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex items-center justify-between shadow-xs">
        <div>
          <p className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider">
            Total Registros
          </p>
          <p className="mt-1.5 text-xl sm:text-2xl font-mono font-bold text-text-light tabular-nums">
            {filteredAttendances.length}
          </p>
        </div>
        <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400 shrink-0">
          <FileText className="h-4 w-4" />
        </div>
      </div>

      <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex items-center justify-between shadow-xs">
        <div>
          <p className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider">
            Horas Totales Trabajadas
          </p>
          <p className="mt-1.5 text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums">
            {totalHoursWorked.toFixed(1)} hrs
          </p>
        </div>
        <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 shrink-0">
          <Clock className="h-4 w-4" />
        </div>
      </div>

      <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex items-center justify-between shadow-xs">
        <div>
          <p className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider">
            Turnos Activos Ahora
          </p>
          <p className="mt-1.5 text-xl sm:text-2xl font-mono font-bold text-amber-400 tabular-nums">
            {activeCount}
          </p>
        </div>
        <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 shrink-0">
          <Users className="h-4 w-4" />
        </div>
      </div>
    </section>
  );
}
