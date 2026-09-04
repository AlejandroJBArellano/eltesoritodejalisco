"use client";

import { LogIn, LogOut, UserCheck, UserX } from "lucide-react";
import { format } from "date-fns-tz";
import {
  ATTENDANCE_TIMEZONE,
  type AttendanceAction,
  type AttendanceRecord,
} from "./types";
import { useOptionalAsistenciaContext } from "./AsistenciaContext";

interface EmployeeCheckInCardProps {
  activeAttendance?: AttendanceRecord | null;
  isLoading?: boolean;
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
  return (
    <div className="max-w-md mx-auto bg-card p-8 rounded-2xl border border-border shadow-sm text-center">
      <h2 className="text-xl font-black text-text-light uppercase tracking-tight mb-2">
        Control de Asistencia
      </h2>
      <p className="text-xs text-text-light/60 mb-8 font-medium">
        Registra tu hora de entrada y salida del turno actual.
      </p>

      {activeAttendance ? (
        <div>
          <div className="w-36 h-36 mx-auto rounded-full bg-emerald-500/10 border-4 border-emerald-500 flex flex-col items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
            <UserCheck className="h-8 w-8 text-emerald-400 mb-1" />
            <span className="text-emerald-400 font-black text-sm uppercase tracking-wider">
              Turno Activo
            </span>
          </div>
          <p className="text-xs text-text-light/60 font-bold uppercase tracking-wider mb-1">
            Hora de entrada
          </p>
          <p className="text-3xl font-mono font-black text-emerald-400 mb-8">
            {format(new Date(activeAttendance.check_in), "HH:mm", {
              timeZone: ATTENDANCE_TIMEZONE,
            })}
          </p>
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
          <div className="w-36 h-36 mx-auto rounded-full bg-white/5 border-4 border-border flex flex-col items-center justify-center mb-6">
            <UserX className="h-8 w-8 text-text-light/40 mb-1" />
            <span className="text-text-light/50 font-black text-sm uppercase tracking-wider">
              Fuera de Turno
            </span>
          </div>
          <p className="text-xs text-text-light/50 font-medium mb-8">
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
