"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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
import {
  ChevronLeft,
  ChevronRight,
  Calendar,
  Clock,
  Copy,
  Download,
  Plus,
  Loader2,
  CheckCircle,
  AlertCircle,
  Settings,
  User,
} from "lucide-react";
import { toPng } from "html-to-image";
import { ShiftModal, type ShiftUserOption } from "./ShiftModal";
import type { EmployeeShift } from "@/components/asistencia/types";

interface WeeklyShiftPlannerProps {
  initialUsers?: ShiftUserOption[];
  initialToleranceMinutes?: number;
  initialDate?: Date;
}

export function WeeklyShiftPlanner({
  initialUsers = [],
  initialToleranceMinutes = 10,
  initialDate = new Date(),
}: WeeklyShiftPlannerProps) {
  const [currentWeekDate, setCurrentWeekDate] = useState<Date>(initialDate);
  const [shifts, setShifts] = useState<EmployeeShift[]>([]);
  const [users, setUsers] = useState<ShiftUserOption[]>(initialUsers);
  const [toleranceMinutes, setToleranceMinutes] = useState<number>(
    initialToleranceMinutes
  );
  const [savingTolerance, setSavingTolerance] = useState(false);

  const [isLoading, setIsLoading] = useState(true);
  const [isDuplicating, setIsDuplicating] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingShift, setEditingShift] = useState<EmployeeShift | null>(null);
  const [modalDefaultDate, setModalDefaultDate] = useState<string | undefined>();
  const [modalDefaultUserId, setModalDefaultUserId] = useState<string | undefined>();

  const printRef = useRef<HTMLDivElement>(null);

  // Calculate Monday to Sunday of the active week
  const weekStart = startOfWeek(currentWeekDate, { weekStartsOn: 1 });
  const weekEnd = endOfWeek(currentWeekDate, { weekStartsOn: 1 });

  const weekStartStr = format(weekStart, "yyyy-MM-dd");
  const weekEndStr = format(weekEnd, "yyyy-MM-dd");

  const daysOfWeek = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const showFeedback = (msg: string, isError = false) => {
    if (isError) {
      setError(msg);
      setSuccess(null);
    } else {
      setSuccess(msg);
      setError(null);
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  const fetchShifts = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      const res = await fetch(
        `/api/shifts?start_date=${weekStartStr}&end_date=${weekEndStr}`
      );
      if (!res.ok) {
        const json = await res.json().catch(() => ({}));
        throw new Error(json.error || "Error al cargar los turnos");
      }
      const data = await res.json();
      setShifts(data.shifts || []);
      if (data.users && data.users.length > 0) {
        setUsers(data.users);
      }
      if (typeof data.toleranceMinutes === "number") {
        setToleranceMinutes(data.toleranceMinutes);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al cargar los turnos");
    } finally {
      setIsLoading(false);
    }
  }, [weekStartStr, weekEndStr]);

  useEffect(() => {
    fetchShifts();
  }, [fetchShifts]);

  // Week navigation
  const handlePrevWeek = () => setCurrentWeekDate((prev) => subWeeks(prev, 1));
  const handleNextWeek = () => setCurrentWeekDate((prev) => addWeeks(prev, 1));
  const handleCurrentWeek = () => setCurrentWeekDate(new Date());

  // Modal actions
  const handleOpenNewShift = (dateStr?: string, userId?: string) => {
    setEditingShift(null);
    setModalDefaultDate(dateStr || weekStartStr);
    setModalDefaultUserId(userId || (users[0]?.id ?? ""));
    setIsModalOpen(true);
  };

  const handleEditShift = (shift: EmployeeShift) => {
    setEditingShift(shift);
    setModalDefaultDate(shift.date);
    setModalDefaultUserId(shift.user_id);
    setIsModalOpen(true);
  };

  const handleSaveShift = async (shiftData: {
    id?: string;
    user_id: string;
    date: string;
    start_time: string;
    end_time: string;
    area?: string;
    notes?: string;
  }) => {
    const res = await fetch("/api/shifts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(shiftData),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Error al guardar el turno");
    }

    showFeedback("Turno guardado correctamente");
    await fetchShifts();
  };

  const handleDeleteShift = async (shiftId: string) => {
    const res = await fetch(`/api/shifts?id=${shiftId}`, {
      method: "DELETE",
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || "Error al eliminar el turno");
    }

    showFeedback("Turno eliminado correctamente");
    await fetchShifts();
  };

  // Duplicate Previous Week
  const handleDuplicatePreviousWeek = async () => {
    const prevWeekMonday = format(subWeeks(weekStart, 1), "yyyy-MM-dd");
    const confirmMsg = `¿Deseas duplicar todos los turnos de la semana anterior (${prevWeekMonday}) a la semana actual (${weekStartStr})? Si ya existen turnos esta semana, serán reemplazados.`;
    if (!window.confirm(confirmMsg)) return;

    try {
      setIsDuplicating(true);
      setError(null);
      const res = await fetch("/api/shifts/duplicate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          source_week_start: prevWeekMonday,
          target_week_start: weekStartStr,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al duplicar turnos");
      }

      showFeedback(`Se duplicaron ${data.count} turnos con éxito.`);
      await fetchShifts();
    } catch (err) {
      showFeedback(
        err instanceof Error ? err.message : "Error al duplicar turnos",
        true
      );
    } finally {
      setIsDuplicating(false);
    }
  };

  // Export Weekly Matrix as PNG
  const handleExportImage = async () => {
    if (!printRef.current) return;
    try {
      setIsExporting(true);
      const dataUrl = await toPng(printRef.current, {
        cacheBust: true,
        backgroundColor: "#09090b",
      });
      const link = document.createElement("a");
      link.download = `rol-turnos-${weekStartStr}.png`;
      link.href = dataUrl;
      link.click();
      showFeedback("Imagen descargada exitosamente");
    } catch (err) {
      console.error("Error al exportar imagen:", err);
      showFeedback("No se pudo generar la imagen del rol", true);
    } finally {
      setIsExporting(false);
    }
  };

  // Save tolerance settings
  const handleSaveTolerance = async () => {
    try {
      setSavingTolerance(true);
      const res = await fetch("/api/shifts/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ attendance_tolerance_minutes: toleranceMinutes }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al guardar tolerancia");
      }
      showFeedback("Tolerancia actualizada exitosamente");
    } catch (err) {
      showFeedback(
        err instanceof Error ? err.message : "Error al guardar tolerancia",
        true
      );
    } finally {
      setSavingTolerance(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Notifications */}
      {error && (
        <div className="flex items-center gap-3 rounded-xl bg-red-950/40 border border-red-500/30 p-4 text-xs font-bold text-red-200">
          <AlertCircle className="h-4 w-4 text-red-400 shrink-0" />
          <p>{error}</p>
        </div>
      )}

      {success && (
        <div className="flex items-center gap-3 rounded-xl bg-emerald-950/40 border border-emerald-500/30 p-4 text-xs font-bold text-emerald-200">
          <CheckCircle className="h-4 w-4 text-emerald-400 shrink-0" />
          <p>{success}</p>
        </div>
      )}

      {/* Control Bar: Week Navigator & Actions */}
      <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-4 bg-zinc-900/50 p-4 rounded-2xl border border-zinc-800 backdrop-blur-sm">
        {/* Week navigation */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-zinc-950 p-1 rounded-xl border border-zinc-800">
            <button
              onClick={handlePrevWeek}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
              title="Semana anterior"
              aria-label="Semana anterior"
            >
              <ChevronLeft className="h-4 w-4" />
            </button>
            <button
              onClick={handleCurrentWeek}
              className="px-3 py-1 rounded-lg text-xs font-bold text-zinc-300 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
            >
              Hoy
            </button>
            <button
              onClick={handleNextWeek}
              className="p-1.5 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800/80 transition-colors cursor-pointer"
              title="Semana siguiente"
              aria-label="Semana siguiente"
            >
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>

          <div className="flex items-center gap-2 ml-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-xs font-black uppercase tracking-wider text-zinc-200 capitalize">
              {format(weekStart, "d MMM", { locale: es })} -{" "}
              {format(weekEnd, "d MMM yyyy", { locale: es })}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap items-center gap-2.5">
          {/* Tolerance Input */}
          <div className="flex items-center gap-1.5 bg-zinc-950 px-3 py-1.5 rounded-xl border border-zinc-800 text-xs">
            <Settings className="h-3.5 w-3.5 text-zinc-500" />
            <span className="text-[10px] font-black uppercase tracking-wider text-zinc-400">
              Tolerancia:
            </span>
            <input
              type="number"
              min={0}
              max={60}
              value={toleranceMinutes}
              onChange={(e) => setToleranceMinutes(Number(e.target.value))}
              className="w-12 bg-transparent text-center font-mono font-bold text-zinc-100 outline-none border-b border-zinc-700 focus:border-primary"
            />
            <span className="text-[10px] text-zinc-500">min</span>
            <button
              onClick={handleSaveTolerance}
              disabled={savingTolerance}
              aria-label="Guardar tolerancia"
              className="ml-1 text-[10px] font-black text-primary hover:underline disabled:opacity-50 cursor-pointer"
            >
              {savingTolerance ? "..." : "Guardar"}
            </button>
          </div>

          {/* Duplicate Button */}
          <button
            onClick={handleDuplicatePreviousWeek}
            disabled={isDuplicating || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-black uppercase tracking-wider text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Copiar turnos de la semana anterior"
          >
            {isDuplicating ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Copy className="h-3.5 w-3.5 text-primary" />
            )}
            Duplicar Anterior
          </button>

          {/* Export to Image Button */}
          <button
            onClick={handleExportImage}
            disabled={isExporting || isLoading}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-black uppercase tracking-wider text-zinc-200 transition-colors cursor-pointer disabled:opacity-50"
            title="Descargar imagen para imprimir o WhatsApp"
          >
            {isExporting ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <Download className="h-3.5 w-3.5 text-emerald-400" />
            )}
            Exportar Rol
          </button>

          {/* New Shift Button */}
          <button
            onClick={() => handleOpenNewShift()}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-primary text-xs font-black uppercase tracking-wider text-black hover:brightness-105 transition-all shadow-lg shadow-primary/20 cursor-pointer"
          >
            <Plus className="h-3.5 w-3.5" /> Asignar Turno
          </button>
        </div>
      </div>

      {/* Weekly Schedule Grid */}
      <div
        ref={printRef}
        className="rounded-2xl border border-zinc-800 bg-zinc-950 overflow-hidden shadow-sm"
      >
        <div className="p-4 bg-zinc-900/60 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <h3 className="text-xs font-black uppercase tracking-wider text-zinc-200">
              Programación Semanal de Colaboradores
            </h3>
          </div>
          <span className="text-[11px] font-bold text-zinc-500 uppercase tracking-widest">
            {format(weekStart, "d MMMM", { locale: es })} -{" "}
            {format(weekEnd, "d MMMM yyyy", { locale: es })}
          </span>
        </div>

        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 gap-3">
            <Loader2 className="h-7 w-7 animate-spin text-primary" />
            <span className="text-xs font-bold text-zinc-500 uppercase tracking-widest">
              Cargando cuadrícula de turnos...
            </span>
          </div>
        ) : users.length === 0 ? (
          <div className="text-center py-16 text-zinc-500 text-xs font-bold uppercase tracking-wider">
            No hay colaboradores registrados en este restaurante.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[900px]">
              <thead>
                <tr className="border-b border-zinc-800 bg-zinc-900/30 text-[11px] font-black uppercase tracking-wider text-zinc-400">
                  <th className="p-3.5 min-w-[170px] sticky left-0 bg-zinc-950 z-10 border-r border-zinc-800/80">
                    Colaborador
                  </th>
                  {daysOfWeek.map((day) => {
                    const isToday = isSameDay(day, new Date());
                    return (
                      <th
                        key={day.toISOString()}
                        className={`p-3 text-center min-w-[130px] border-r border-zinc-800/40 last:border-r-0 ${
                          isToday ? "bg-primary/10 text-primary" : ""
                        }`}
                      >
                        <div className="font-black">
                          {format(day, "EEEE", { locale: es })}
                        </div>
                        <div className="text-[10px] font-mono text-zinc-500 font-medium">
                          {format(day, "d MMM", { locale: es })}
                        </div>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-xs">
                {users.map((u) => {
                  return (
                    <tr key={u.id} className="hover:bg-zinc-900/20 transition-colors">
                      {/* Collaborator Name & Role */}
                      <td className="p-3.5 sticky left-0 bg-zinc-950 z-10 border-r border-zinc-800/80 font-bold">
                        <div className="flex items-center gap-2">
                          <div className="h-7 w-7 rounded-full bg-zinc-800 flex items-center justify-center text-zinc-300 shrink-0">
                            <User className="h-3.5 w-3.5" />
                          </div>
                          <div>
                            <div className="text-zinc-200 text-xs font-bold leading-tight">
                              {u.name}
                            </div>
                            {u.role && (
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-wider">
                                {u.role}
                              </span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Day Cells */}
                      {daysOfWeek.map((day) => {
                        const dayStr = format(day, "yyyy-MM-dd");
                        const userDayShifts = shifts.filter(
                          (s) => s.user_id === u.id && s.date === dayStr
                        );
                        const isToday = isSameDay(day, new Date());

                        return (
                          <td
                            key={dayStr}
                            className={`p-2 align-top border-r border-zinc-800/40 last:border-r-0 ${
                              isToday ? "bg-primary/5" : ""
                            }`}
                          >
                            <div className="min-h-[75px] flex flex-col justify-between group">
                              <div className="space-y-1.5">
                                {userDayShifts.map((s) => (
                                  <div
                                    key={s.id}
                                    onClick={() => handleEditShift(s)}
                                    className="rounded-lg bg-zinc-900 border border-zinc-800 hover:border-primary/60 p-2 text-left transition-all cursor-pointer shadow-sm hover:scale-[1.02]"
                                    title="Haz clic para editar o eliminar"
                                  >
                                    <div className="font-mono text-[11px] font-black text-zinc-200 flex items-center gap-1">
                                      <Clock className="h-2.5 w-2.5 text-primary shrink-0" />
                                      <span>
                                        {s.start_time.slice(0, 5)} -{" "}
                                        {s.end_time.slice(0, 5)}
                                      </span>
                                    </div>
                                    {s.area && (
                                      <span className="inline-block mt-1 rounded bg-primary/15 text-primary text-[8px] font-black uppercase px-1 py-0.2 tracking-wider">
                                        {s.area}
                                      </span>
                                    )}
                                    {s.notes && (
                                      <p className="mt-0.5 text-[9px] text-zinc-500 truncate">
                                        {s.notes}
                                      </p>
                                    )}
                                  </div>
                                ))}

                                {userDayShifts.length === 0 && (
                                  <div className="text-center py-4">
                                    <span className="text-[10px] font-bold text-zinc-600 uppercase tracking-wider">
                                      Descanso
                                    </span>
                                  </div>
                                )}
                              </div>

                              {/* Add shift shortcut button on cell */}
                              <button
                                onClick={() => handleOpenNewShift(dayStr, u.id)}
                                className="mt-1 w-full py-1 rounded bg-zinc-900/60 hover:bg-primary/20 text-zinc-500 hover:text-primary border border-dashed border-zinc-800 hover:border-primary/40 text-[9px] font-bold uppercase transition-all opacity-0 group-hover:opacity-100 flex items-center justify-center gap-1 cursor-pointer"
                                title="Agregar turno a este día"
                              >
                                <Plus className="h-2.5 w-2.5" /> Turno
                              </button>
                            </div>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Shift Modal for Create / Edit */}
      <ShiftModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onSave={handleSaveShift}
        onDelete={handleDeleteShift}
        initialShift={editingShift}
        defaultDate={modalDefaultDate}
        defaultUserId={modalDefaultUserId}
        users={users}
      />
    </div>
  );
}
