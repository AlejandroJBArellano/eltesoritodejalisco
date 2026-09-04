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
      className={`rounded-2xl p-6 border transition-all duration-300 flex flex-col justify-between ${
        active
          ? "bg-card border-emerald-500/30 shadow-md shadow-emerald-500/5"
          : "bg-card border-border hover:border-border"
      }`}
    >
      <div>
        <div className="flex justify-between items-start mb-3">
          <h4 className="font-black text-lg text-text-light uppercase tracking-tight">
            {user.name}
          </h4>
          <span className="rounded-full bg-white/5 border border-border px-2.5 py-0.5 text-[10px] font-black text-text-light/60 uppercase tracking-widest">
            {user.role}
          </span>
        </div>

        {activeAttendance ? (
          <div className="mb-4">
            <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              En Turno
            </span>
            <p className="text-xs text-text-light/60 font-mono mt-2.5">
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
            <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-black bg-white/5 text-text-light/50 border border-border uppercase tracking-widest">
              Fuera de Turno
            </span>
          </div>
        )}

        {finishedAttendances.length > 0 && (
          <div className="mb-4 text-xs text-text-light/50 border-t border-border pt-3 space-y-1 font-medium">
            <p>
              Turnos completados hoy:{" "}
              <strong className="text-text-light font-bold">
                {finishedAttendances.length}
              </strong>
            </p>
            <p>
              Horas totales acumuladas:{" "}
              <strong className="text-emerald-400 font-bold">
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
            className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <LogIn className="h-4 w-4" /> Registrar Entrada
          </button>
        ) : (
          <button
            onClick={() => onAction("CHECK_OUT", user.id)}
            disabled={isLoading}
            className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
          >
            <LogOut className="h-4 w-4" /> Registrar Salida
          </button>
        )}
      </div>
    </div>
  );
}
