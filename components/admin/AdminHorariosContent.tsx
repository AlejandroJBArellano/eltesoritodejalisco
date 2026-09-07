"use client";

import type { DbBusinessHours } from "@/app/admin/horarios/page";
import { PageHeader } from "@/components/PageHeader";
import {
  AlertCircle,
  ArrowLeft,
  CheckCircle,
  Clock,
  Loader2,
  Save,
  Users,
} from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { WeeklyShiftPlanner } from "./shifts/WeeklyShiftPlanner";
import type { ShiftUserOption } from "./shifts/ShiftModal";

interface AdminHorariosContentProps {
  initialHours: DbBusinessHours[];
  initialUsers?: ShiftUserOption[];
  initialToleranceMinutes?: number;
}

const DAYS_OF_WEEK_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function AdminHorariosContent({
  initialHours,
  initialUsers = [],
  initialToleranceMinutes = 10,
}: AdminHorariosContentProps) {
  const [activeTab, setActiveTab] = useState<"shifts" | "business_hours">("shifts");
  const [hoursList, setHoursList] = useState<DbBusinessHours[]>(initialHours);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const handleToggleClosed = (index: number) => {
    setHoursList((prev) =>
      prev.map((h, i) => (i === index ? { ...h, is_closed: !h.is_closed } : h))
    );
  };

  const handleTimeChange = (
    index: number,
    field: "open_time" | "close_time",
    value: string
  ) => {
    // Append seconds ":00" if not present to match PostgreSQL Time type format
    const formattedTime = value.length === 5 ? `${value}:00` : value;
    setHoursList((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: formattedTime } : h))
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    // Validate times: open must be before close for all open days
    for (let i = 0; i < hoursList.length; i++) {
      const day = hoursList[i];
      if (!day.is_closed) {
        if (day.open_time >= day.close_time) {
          setError(
            `El horario de apertura debe ser anterior al de cierre para el día ${DAYS_OF_WEEK_NAMES[day.day_of_week]}.`
          );
          setIsSaving(false);
          return;
        }
      }
    }

    try {
      const response = await fetch("/api/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: hoursList }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Error al guardar horarios");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado"
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimeForInput = (timeStr: string) => {
    return timeStr.slice(0, 5);
  };

  return (
    <div className="min-h-screen bg-background text-zinc-100 pb-16">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6">
        {/* Back Link */}
        <div className="mb-4">
          <Link
            href="/"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-zinc-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Volver al Panel
          </Link>
        </div>

        <PageHeader
          title={
            activeTab === "shifts"
              ? "Turnos de Personal"
              : "Horarios de Atención"
          }
          subtitle={
            activeTab === "shifts"
              ? "Programa, asigna y consulta los turnos de los colaboradores por semana"
              : "Define las horas y días disponibles en el portal para programar pedidos de pickup"
          }
          badgeColor={activeTab === "shifts" ? "bg-primary" : "bg-amber-500"}
        />

        {/* Tab Navigation */}
        <div className="mt-6 mb-8 flex justify-center sm:justify-start">
          <div className="inline-flex p-1 rounded-2xl bg-zinc-900/80 border border-zinc-800 shadow-sm">
            <button
              onClick={() => setActiveTab("shifts")}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "shifts"
                  ? "bg-primary text-black shadow-md shadow-primary/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Users className="h-4 w-4" /> Turnos de Personal
            </button>
            <button
              onClick={() => setActiveTab("business_hours")}
              className={`inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
                activeTab === "business_hours"
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              <Clock className="h-4 w-4" /> Horarios de Atención
            </button>
          </div>
        </div>

        {/* Tab Content */}
        {activeTab === "shifts" ? (
          <WeeklyShiftPlanner
            initialUsers={initialUsers}
            initialToleranceMinutes={initialToleranceMinutes}
          />
        ) : (
          <div className="max-w-4xl">
            {error && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-sm text-red-200">
                <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            {success && (
              <div className="mb-6 flex items-center gap-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-sm text-emerald-200">
                <CheckCircle className="h-5 w-5 text-emerald-400 shrink-0" />
                <p>Horarios comerciales actualizados exitosamente.</p>
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-6">
              <div className="rounded-2xl border border-zinc-800 bg-zinc-900/40 backdrop-blur-sm overflow-hidden">
                <div className="divide-y divide-zinc-800/80">
                  {hoursList.map((dayHours, idx) => {
                    const dayName = DAYS_OF_WEEK_NAMES[dayHours.day_of_week];
                    return (
                      <div
                        key={dayHours.id}
                        className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 hover:bg-zinc-900/10 transition-all"
                      >
                        {/* Day & Closed Toggle */}
                        <div className="flex items-center gap-4 min-w-50">
                          <input
                            type="checkbox"
                            id={`closed-${dayHours.id}`}
                            checked={!dayHours.is_closed}
                            onChange={() => handleToggleClosed(idx)}
                            className="h-4.5 w-4.5 rounded border-zinc-700 bg-zinc-950 text-amber-500 focus:ring-amber-500 cursor-pointer"
                          />
                          <label
                            htmlFor={`closed-${dayHours.id}`}
                            className={`text-sm font-black uppercase tracking-wider cursor-pointer transition-colors ${
                              dayHours.is_closed
                                ? "text-zinc-600 line-through"
                                : "text-zinc-200"
                            }`}
                          >
                            {dayName}
                          </label>
                          {dayHours.is_closed && (
                            <span className="rounded-full bg-red-500/10 border border-red-500/20 px-2 py-0.5 text-[9px] font-black text-red-400 uppercase tracking-widest">
                              Cerrado
                            </span>
                          )}
                        </div>

                        {/* Time Selectors */}
                        <div className="flex items-center gap-3">
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                              Apertura:
                            </span>
                            <input
                              type="time"
                              disabled={dayHours.is_closed}
                              value={formatTimeForInput(dayHours.open_time)}
                              onChange={(e) =>
                                handleTimeChange(idx, "open_time", e.target.value)
                              }
                              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 outline-none transition disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </div>

                          <div className="flex items-center gap-2">
                            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">
                              Cierre:
                            </span>
                            <input
                              type="time"
                              disabled={dayHours.is_closed}
                              value={formatTimeForInput(dayHours.close_time)}
                              onChange={(e) =>
                                handleTimeChange(idx, "close_time", e.target.value)
                              }
                              className="rounded-xl border border-zinc-800 bg-zinc-950 px-3 py-2 text-sm text-zinc-200 focus:border-amber-500 outline-none transition disabled:opacity-30 disabled:cursor-not-allowed"
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="flex justify-end gap-3">
                <Link
                  href="/"
                  className="rounded-xl border border-zinc-800 px-5 py-3 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-900/30 transition-all"
                >
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="rounded-xl bg-amber-500 px-6 py-3 text-xs font-black uppercase tracking-wider text-zinc-950 hover:brightness-105 transition-all shadow-lg shadow-amber-500/10 flex items-center gap-2 disabled:opacity-50 cursor-pointer"
                >
                  {isSaving ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" /> Guardando...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4" /> Guardar Horarios de Atención
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
