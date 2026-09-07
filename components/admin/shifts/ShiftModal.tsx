"use client";

import { useState } from "react";
import { X, Clock, Trash2, Loader2, Save } from "lucide-react";
import type { EmployeeShift } from "@/components/asistencia/types";

export interface ShiftUserOption {
  id: string;
  name: string;
  role?: string;
}

interface ShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (shiftData: {
    id?: string;
    user_id: string;
    date: string;
    start_time: string;
    end_time: string;
    area?: string;
    notes?: string;
  }) => Promise<void>;
  onDelete?: (shiftId: string) => Promise<void>;
  initialShift?: EmployeeShift | null;
  defaultDate?: string;
  defaultUserId?: string;
  users: ShiftUserOption[];
}

const SHIFT_PRESETS = [
  { label: "Matutino", start: "08:00", end: "16:00" },
  { label: "Vespertino", start: "15:00", end: "23:00" },
  { label: "Mixto", start: "12:00", end: "20:00" },
  { label: "Apertura", start: "07:00", end: "15:00" },
  { label: "Cierre", start: "16:00", end: "00:00" },
];

const COMMON_AREAS = ["Cocina", "Caja", "Barra", "Piso", "Limpieza"];

export function ShiftModal({
  isOpen,
  onClose,
  onSave,
  onDelete,
  initialShift,
  defaultDate,
  defaultUserId,
  users,
}: ShiftModalProps) {
  const [userId, setUserId] = useState<string>(
    initialShift?.user_id || defaultUserId || (users[0]?.id ?? "")
  );
  const [date, setDate] = useState<string>(
    initialShift?.date || defaultDate || new Date().toISOString().split("T")[0]
  );
  const [startTime, setStartTime] = useState<string>(
    initialShift?.start_time ? initialShift.start_time.slice(0, 5) : "08:00"
  );
  const [endTime, setEndTime] = useState<string>(
    initialShift?.end_time ? initialShift.end_time.slice(0, 5) : "16:00"
  );
  const [area, setArea] = useState<string>(initialShift?.area || "");
  const [notes, setNotes] = useState<string>(initialShift?.notes || "");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleApplyPreset = (preset: { start: string; end: string }) => {
    setStartTime(preset.start);
    setEndTime(preset.end);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!userId) {
      setError("Debes seleccionar un colaborador");
      return;
    }
    if (!date) {
      setError("Debes seleccionar una fecha");
      return;
    }
    if (!startTime || !endTime) {
      setError("Debes ingresar horario de inicio y fin");
      return;
    }

    try {
      setIsSubmitting(true);
      await onSave({
        id: initialShift?.id,
        user_id: userId,
        date,
        start_time: startTime,
        end_time: endTime,
        area: area.trim() || undefined,
        notes: notes.trim() || undefined,
      });
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar el turno");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    if (!initialShift?.id || !onDelete) return;
    if (!window.confirm("¿Seguro que deseas eliminar este turno asignado?")) return;

    try {
      setIsDeleting(true);
      setError(null);
      await onDelete(initialShift.id);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al eliminar el turno");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div className="relative w-full max-w-lg bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 text-zinc-100 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            <h3 className="text-base font-black uppercase tracking-tight">
              {initialShift ? "Editar Turno" : "Asignar Nuevo Turno"}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800 transition-colors"
            aria-label="Cerrar modal"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-bold text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* User selection */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
              Colaborador
            </label>
            <select
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              disabled={Boolean(initialShift)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-bold text-zinc-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition disabled:opacity-50"
            >
              {users.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} {u.role ? `(${u.role})` : ""}
                </option>
              ))}
            </select>
          </div>

          {/* Date selection */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
              Fecha del Turno
            </label>
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-bold text-zinc-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
            />
          </div>

          {/* Preset Buttons */}
          <div>
            <label className="block text-[10px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
              Atajos Rápidos de Horario
            </label>
            <div className="flex flex-wrap gap-1.5">
              {SHIFT_PRESETS.map((preset) => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => handleApplyPreset(preset)}
                  className="px-2.5 py-1 rounded-lg border border-zinc-800 bg-zinc-950 text-[10px] font-bold text-zinc-300 hover:border-primary hover:text-primary transition-colors cursor-pointer"
                >
                  {preset.label} ({preset.start}-{preset.end})
                </button>
              ))}
            </div>
          </div>

          {/* Times */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                Hora Inicio
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-mono font-bold text-zinc-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
              />
            </div>
            <div>
              <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
                Hora Fin
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                required
                className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs font-mono font-bold text-zinc-100 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
              />
            </div>
          </div>

          {/* Area / Station */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
              Área o Estación (Opcional)
            </label>
            <input
              type="text"
              value={area}
              onChange={(e) => setArea(e.target.value)}
              placeholder="Ej. Cocina, Barra, Caja, Piso..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition"
            />
            <div className="flex flex-wrap gap-1 mt-1.5">
              {COMMON_AREAS.map((commonArea) => (
                <button
                  key={commonArea}
                  type="button"
                  onClick={() => setArea(commonArea)}
                  className="px-2 py-0.5 rounded bg-zinc-800/80 text-[9px] font-bold text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
                >
                  +{commonArea}
                </button>
              ))}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-[11px] font-black uppercase tracking-wider text-zinc-400 mb-1.5">
              Notas / Instrucciones (Opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Observaciones particulares para el turno..."
              className="w-full rounded-xl border border-zinc-800 bg-zinc-950 px-3.5 py-2 text-xs text-zinc-100 placeholder:text-zinc-600 focus:border-primary focus:ring-1 focus:ring-primary outline-none transition resize-none"
            />
          </div>

          {/* Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-zinc-800">
            {initialShift && onDelete ? (
              <button
                type="button"
                onClick={handleDelete}
                disabled={isDeleting || isSubmitting}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-red-500/10 border border-red-500/20 text-xs font-black text-red-400 hover:bg-red-500/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {isDeleting ? (
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                ) : (
                  <Trash2 className="h-3.5 w-3.5" />
                )}
                Eliminar
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting || isDeleting}
                className="px-4 py-2 rounded-xl border border-zinc-800 text-xs font-black uppercase tracking-wider text-zinc-400 hover:text-white hover:bg-zinc-800/50 transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting || isDeleting}
                aria-label="Guardar turno"
                className="inline-flex items-center gap-2 px-5 py-2 rounded-xl bg-primary text-xs font-black uppercase tracking-wider text-black hover:brightness-105 transition-all shadow-lg shadow-primary/20 cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-3.5 w-3.5 animate-spin" /> Guardando...
                  </>
                ) : (
                  <>
                    <Save className="h-3.5 w-3.5" /> Guardar Turno
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
