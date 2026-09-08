"use client";

import { useCallback, useEffect, useState } from "react";
import {
  startOfWeek,
  endOfWeek,
  addDays,
  addWeeks,
  subWeeks,
  format,
  isSameDay,
} from "date-fns";
import { es } from "date-fns/locale";
import { ChevronLeft, ChevronRight, Calendar, Clock, Loader2 } from "lucide-react";
import type { EmployeeShift } from "./types";

interface EmployeeShiftsScheduleProps {
  initialDate?: Date;
}

export function EmployeeShiftsSchedule({
  initialDate = new Date(),
}: EmployeeShiftsScheduleProps) {
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(initialDate);
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Week start on Monday (weekStartsOn: 1)
  const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekDate, { weekStartsOn: 1 });

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const fetchShifts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/shifts?start_date=${weekStartStr}&end_date=${weekEndStr}`
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Error al cargar turnos");
      }
      const data = await res.json();
      setShifts(data.shifts || []);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar turnos");
    } finally {
      setIsLoading(false);
    }
  }, [weekStartStr, weekEndStr]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  const handlePrevWeek = () => {
    setCurrentWeekDate((prev) => subWeeks(prev, 1));
  };

  const handleNextWeek = () => {
    setCurrentWeekDate((prev) => addWeeks(prev, 1));
  };

  const handleCurrentWeek = () => {
    setCurrentWeekDate(new Date());
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Header with Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-card p-4 rounded-2xl border border-border shadow-sm">
        <div className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-primary" />
          <h2 className="text-base font-black text-text-light uppercase tracking-tight">
            Rol Semanal de Turnos
          </h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrevWeek}
            className="p-2 rounded-xl border border-border hover:bg-white/5 text-text-light/70 hover:text-text-light transition-colors"
            title="Semana anterior"
            aria-label="Semana anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            onClick={handleCurrentWeek}
            className="px-3 py-1.5 rounded-xl border border-border text-xs font-bold text-text-light hover:bg-white/5 transition-colors"
          >
            Semana actual
          </button>

          <button
            onClick={handleNextWeek}
            className="p-2 rounded-xl border border-border hover:bg-white/5 text-text-light/70 hover:text-text-light transition-colors"
            title="Semana siguiente"
            aria-label="Semana siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>

          <span className="text-xs font-bold text-text-light/70 uppercase ml-2">
            {format(weekStart, "d MMM", { locale: es })} -{" "}
            {format(weekEnd, "d MMM yyyy", { locale: es })}
          </span>
        </div>
      </div>

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400 text-center">
          {error}
        </div>
      )}

      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <span className="text-xs font-bold text-text-light/50 uppercase tracking-widest">
            Cargando rol de turnos...
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-7 gap-3">
          {daysOfWeek.map((day) => {
            const dayStr = format(day, "yyyy-MM-dd");
            const dayShifts = shifts.filter((s) => s.date === dayStr);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={dayStr}
                className={`flex flex-col p-4 rounded-2xl border transition-all ${
                  isToday
                    ? "bg-primary/5 border-primary/40 shadow-sm shadow-primary/10"
                    : "bg-card border-border"
                }`}
              >
                {/* Day Header */}
                <div className="flex items-center justify-between pb-2 mb-3 border-b border-border/50">
                  <span
                    className={`text-xs font-black uppercase tracking-wider ${
                      isToday ? "text-primary" : "text-text-light/80"
                    }`}
                  >
                    {format(day, "EEE", { locale: es })}
                  </span>
                  <span
                    className={`text-xs font-mono font-bold ${
                      isToday ? "text-primary" : "text-text-light/50"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>

                {/* Day Shifts */}
                <div className="flex-1 flex flex-col gap-2">
                  {dayShifts.length > 0 ? (
                    dayShifts.map((s) => (
                      <div
                        key={s.id}
                        className="rounded-xl bg-white/5 border border-white/10 p-2.5 text-left space-y-1"
                      >
                        <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-text-light">
                          <Clock className="h-3 w-3 text-primary shrink-0" />
                          <span>
                            {s.start_time.slice(0, 5)} - {s.end_time.slice(0, 5)}
                          </span>
                        </div>
                        {s.area && (
                          <span className="inline-block rounded bg-primary/20 text-primary text-[9px] font-black uppercase px-1.5 py-0.5 tracking-wider">
                            {s.area}
                          </span>
                        )}
                        {s.notes && (
                          <p className="text-[10px] text-text-light/60 line-clamp-2 italic">
                            {s.notes}
                          </p>
                        )}
                      </div>
                    ))
                  ) : (
                    <div className="my-auto py-4 text-center">
                      <span className="inline-block rounded-full bg-white/5 text-text-light/40 border border-white/10 text-[10px] font-bold uppercase tracking-wider px-2.5 py-1">
                        Descanso
                      </span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
