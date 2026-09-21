"use client";

import { LogIn, LogOut } from "lucide-react";
import { format } from "date-fns-tz";
import {
  ATTENDANCE_TIMEZONE,
  type AttendanceAction,
  type AttendanceRecord,
  type AttendanceUserOption,
} from "./types";

interface StaffAttendanceCardProps {
  user: AttendanceUserOption;
  activeAttendance?: AttendanceRecord;
  finishedAttendances: AttendanceRecord[];
  totalHoursFinished: number;
  isLoading: boolean;
  onAction: (action: AttendanceAction, targetUserId: string) => void;
}

export function StaffAttendanceCard({
  user,
  activeAttendance,
  finishedAttendances,
  totalHoursFinished,
  isLoading,
  onAction,
}: StaffAttendanceCardProps) {
  const active = Boolean(activeAttendance);

  return (
    <div
      className={`rounded-xl p-6 border transition-all duration-200 flex flex-col justify-between ${
        active
          ? "bg-card border-emerald-500/30 shadow-xs"
          : "bg-card border-border hover:border-border/80"
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-bold text-base text-text-light tracking-tight">
            {user.name}
          </h4>
          <span className="rounded-md bg-secondary border border-border px-2 py-0.5 text-[10px] font-bold text-text-light/60 uppercase tracking-wider">
            {user.role}
          </span>
        </div>

        {activeAttendance ? (
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En Turno
            </span>
            <p className="text-xs text-text-light/60 font-mono mt-2.5 tabular-nums">
              Entrada:{" "}
              <strong className="text-emerald-400">
                {format(new Date(activeAttendance.check_in), "HH:mm", {
                  timeZone: ATTENDANCE_TIMEZONE,
                })}
              </strong>
            </p>
          </div>
        ) : (
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 py-0.5 px-2.5 rounded-full text-[11px] font-bold bg-secondary text-text-light/50 border border-border uppercase tracking-wider">
              Fuera de Turno
            </span>
          </div>
        )}

        {finishedAttendances.length > 0 && (
          <div className="mb-4 text-xs text-text-light/60 border-t border-border pt-3 space-y-1 font-medium">
            <p className="flex justify-between items-center">
              <span>Turnos completados hoy:</span>
              <strong className="text-text-light font-bold font-mono tabular-nums">
                {finishedAttendances.length}
              </strong>
            </p>
            <p className="flex justify-between items-center">
              <span>Horas acumuladas:</span>
              <strong className="text-emerald-400 font-bold font-mono tabular-nums">
                {totalHoursFinished.toFixed(2)} hrs
              </strong>
            </p>
          </div>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-border flex gap-3">
        {!active ? (
          <button
            onClick={() => onAction("CHECK_IN", user.id)}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <LogIn className="h-4 w-4" /> Registrar Entrada
          </button>
        ) : (
          <button
            onClick={() => onAction("CHECK_OUT", user.id)}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold text-xs uppercase tracking-wider py-2.5 px-4 rounded-lg transition-all shadow-xs active:scale-[0.98] cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Registrar Salida
          </button>
        )}
      </div>
    </div>
  );
}
