"use client";

import { LogIn, LogOut, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns-tz";
import {
  ATTENDANCE_TIMEZONE,
  type AttendanceAction,
  type AttendanceRecord,
  type EmployeeShift,
} from "./types";
import { useOptionalAsistenciaContext } from "./AsistenciaContext";
import { calculatePunctuality } from "./shiftUtils";

interface EmployeeCheckInCardProps {
  activeAttendance?: AttendanceRecord | null;
  isLoading?: boolean;
  scheduledShift?: EmployeeShift | null;
  toleranceMinutes?: number;
  onAction?: (action: AttendanceAction) => void;
}

export function EmployeeCheckInCard(props: EmployeeCheckInCardProps) {
  const context = useOptionalAsistenciaContext();
  const activeAttendance =
    props.activeAttendance !== undefined
      ? props.activeAttendance
      : context?.activeEmployeeAttendance;
  const isLoading = props.isLoading ?? context?.isSubmitting ?? false;
  const onAction = props.onAction ?? ((action) => context?.handleAction(action));

  const scheduledShift =
    props.scheduledShift !== undefined
      ? props.scheduledShift
      : context?.todayShift;

  const toleranceMinutes = props.toleranceMinutes ?? context?.toleranceMinutes ?? 10;

  const punctuality = activeAttendance
    ? calculatePunctuality(
        activeAttendance.check_in,
        scheduledShift?.start_time,
        toleranceMinutes
      )
    : null;

  return (
    <div className="max-w-md mx-auto bg-card p-8 rounded-2xl border border-border shadow-sm text-center">
      <h2 className="text-xl font-black text-text-light uppercase tracking-tight mb-1">
        Control de Asistencia
      </h2>
      <p className="text-xs text-text-light/60 mb-6 font-medium">
        Registra tu hora de entrada y salida del turno actual.
      </p>

      {/* Programmed Shift Info Card */}
      {scheduledShift ? (
        <div className="mb-6 rounded-xl bg-primary/10 border border-primary/20 p-3.5 text-left">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-black uppercase tracking-wider text-primary">
              Turno Programado Hoy
            </span>
            {scheduledShift.area && (
              <span className="rounded-md bg-white/10 px-2 py-0.5 text-[9px] font-black text-text-light uppercase tracking-wider">
                {scheduledShift.area}
              </span>
            )}
          </div>
          <p className="mt-1 font-mono text-sm font-bold text-text-light">
            {scheduledShift.start_time.slice(0, 5)} - {scheduledShift.end_time.slice(0, 5)}
          </p>
          {scheduledShift.notes && (
            <p className="mt-0.5 text-[11px] text-text-light/60">{scheduledShift.notes}</p>
          )}
        </div>
      ) : (
        <div className="mb-6 rounded-xl bg-white/5 border border-border p-3 text-left">
          <span className="text-[10px] font-black uppercase tracking-wider text-text-light/50">
            Turno de Hoy
          </span>
          <p className="mt-0.5 text-xs font-bold text-text-light/70">
            Sin turno programado (Descanso)
          </p>
        </div>
      )}

      {activeAttendance ? (
        <div>
          <div className="w-32 h-32 mx-auto rounded-full bg-emerald-500/10 border-4 border-emerald-500 flex flex-col items-center justify-center mb-4 shadow-lg shadow-emerald-500/10">
            <UserCheck className="h-8 w-8 text-emerald-400 mb-1" />
            <span className="text-emerald-400 font-black text-xs uppercase tracking-wider">
              Turno Activo
            </span>
          </div>

          <p className="text-xs text-text-light/60 font-bold uppercase tracking-wider mb-1">
            Hora de entrada
          </p>
          <p className="text-3xl font-mono font-black text-emerald-400 mb-2">
            {format(new Date(activeAttendance.check_in), "HH:mm", {
              timeZone: ATTENDANCE_TIMEZONE,
            })}
          </p>

          {/* Punctuality Badge */}
          {scheduledShift && punctuality && (
            <div className="mb-6">
              {punctuality.status === "ON_TIME" ? (
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/15 px-3 py-1 text-[11px] font-black text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                  ✓ {punctuality.label}
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 px-3 py-1 text-[11px] font-black text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  ⚠ {punctuality.label}
                </span>
              )}
            </div>
          )}

          {!scheduledShift && <div className="mb-6" />}

          <button
            onClick={() => onAction("CHECK_OUT")}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-4 px-6 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />{" "}
            {isLoading ? "Registrando..." : "Registrar Salida"}
          </button>
        </div>
      ) : (
        <div>
          <div className="w-32 h-32 mx-auto rounded-full bg-white/5 border-4 border-border flex flex-col items-center justify-center mb-4">
            <UserX className="h-8 w-8 text-text-light/40 mb-1" />
            <span className="text-text-light/50 font-black text-xs uppercase tracking-wider">
              Fuera de Turno
            </span>
          </div>
          <p className="text-xs text-text-light/50 font-medium mb-6">
            No tienes un turno activo en este momento.
          </p>
          <button
            onClick={() => onAction("CHECK_IN")}
            disabled={isLoading}
            className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-4 px-6 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
          >
            <LogIn className="h-4 w-4" />{" "}
            {isLoading ? "Registrando..." : "Registrar Entrada"}
          </button>
        </div>
      )}
    </div>
  );
}
