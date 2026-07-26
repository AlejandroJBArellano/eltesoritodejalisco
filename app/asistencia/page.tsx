"use client";

import { Attendance, User } from "@/types";
import { differenceInMinutes } from "date-fns";
import { format } from "date-fns-tz";
import {
  ArrowLeft,
  FileText,
  LogIn,
  LogOut,
  ShieldAlert,
  UserCheck,
  UserX
} from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { PageHeader } from "@/components/PageHeader";

const TZ = "America/Mexico_City";

export default function AsistenciaPage() {
  const [isAdmin, setIsAdmin] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [attendances, setAttendances] = useState<Attendance[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Time overrides for admin
  const [customTime, setCustomTime] = useState<string>(format(new Date(), "HH:mm", { timeZone: TZ }));

  const fetchAttendance = async () => {
    try {
      setIsLoading(true);
      const res = await fetch("/api/attendance");
      if (!res.ok) throw new Error("Error al cargar asistencia");
      const data = await res.json();
      setIsAdmin(data.isAdmin);
      setUsers(data.users || []);
      setAttendances(data.attendances || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchAttendance();
  }, []);

  const handleAction = async (action: "CHECK_IN" | "CHECK_OUT", targetUserId?: string) => {
    try {
      setIsLoading(true);

      let timestamp = undefined;
      if (isAdmin) {
        const today = format(new Date(), "yyyy-MM-dd", { timeZone: TZ });
        timestamp = new Date(`${today}T${customTime}:00-06:00`).toISOString();
      }

      const res = await fetch("/api/attendance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action, targetUserId, timestamp }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Error al registrar asistencia");
      }

      await fetchAttendance();
    } catch (err: any) {
      setError(err.message);
      setIsLoading(false);
    }
  };

  const getActiveAttendance = (userId: string) => {
    return attendances.find(a => a.user_id === userId && a.status === "ACTIVE");
  };

  const getFinishedAttendances = (userId: string) => {
    return attendances.filter(a => a.user_id === userId && a.status === "FINISHED");
  };

  const renderAdminView = () => {
    return (
      <div className="space-y-8">
        {/* Admin Bar */}
        <div className="rounded-2xl bg-[#242424] p-6 border border-white/5 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-primary" /> Modo Administrador
            </h3>
            <p className="text-xs text-[#E0E0E0]/60 mt-1 font-medium">
              Puedes registrar entradas o salidas manuales usando una hora personalizada.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs font-bold text-[#E0E0E0]/60 uppercase tracking-wider">
              Hora a registrar:
            </label>
            <input
              type="time"
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="bg-[#181818] border border-white/10 text-[#E0E0E0] px-3.5 py-2 rounded-xl text-xs outline-none focus:border-primary font-mono"
            />
          </div>
        </div>

        {/* Section Header */}
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary"></span>
            Personal & Estado de Turnos Hoy
          </h2>
          <Link
            href="/asistencia/history"
            className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-white uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md active:scale-95"
          >
            <FileText className="h-4 w-4" /> Historial Completo
          </Link>
        </div>

        {/* User Cards Grid */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {users.map(user => {
            const active = getActiveAttendance(user.id);
            const finished = getFinishedAttendances(user.id);
            const totalHoursFinished = finished.reduce((acc, curr) => {
              if (curr.check_in && curr.check_out) {
                return acc + differenceInMinutes(new Date(curr.check_out), new Date(curr.check_in)) / 60;
              }
              return acc;
            }, 0);

            return (
              <div
                key={user.id}
                className={`rounded-2xl p-6 border transition-all duration-300 flex flex-col justify-between ${active
                    ? "bg-[#242424] border-emerald-500/30 shadow-md shadow-emerald-500/5"
                    : "bg-[#242424] border-white/5 hover:border-white/10"
                  }`}
              >
                <div>
                  <div className="flex justify-between items-start mb-3">
                    <h4 className="font-black text-lg text-[#E0E0E0] uppercase tracking-tight">{user.name}</h4>
                    <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-black text-[#E0E0E0]/60 uppercase tracking-widest">
                      {user.role}
                    </span>
                  </div>

                  {active ? (
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-black bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 uppercase tracking-widest">
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                        En Turno
                      </span>
                      <p className="text-xs text-[#E0E0E0]/60 font-mono mt-2.5">
                        Entrada: <strong className="text-emerald-400">{format(new Date(active.check_in), "HH:mm", { timeZone: TZ })}</strong>
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1.5 py-1 px-3 rounded-full text-xs font-black bg-white/5 text-[#E0E0E0]/50 border border-white/10 uppercase tracking-widest">
                        Fuera de Turno
                      </span>
                    </div>
                  )}

                  {finished.length > 0 && (
                    <div className="mb-4 text-xs text-[#E0E0E0]/50 border-t border-white/5 pt-3 space-y-1 font-medium">
                      <p>Turnos completados hoy: <strong className="text-[#E0E0E0] font-bold">{finished.length}</strong></p>
                      <p>Horas totales acumuladas: <strong className="text-emerald-400 font-bold">{totalHoursFinished.toFixed(2)} hrs</strong></p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-white/5 flex gap-3">
                  {!active ? (
                    <button
                      onClick={() => handleAction("CHECK_IN", user.id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <LogIn className="h-4 w-4" /> Registrar Entrada
                    </button>
                  ) : (
                    <button
                      onClick={() => handleAction("CHECK_OUT", user.id)}
                      className="flex-1 inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 text-white font-black text-xs uppercase tracking-wider py-2.5 px-4 rounded-xl transition-all shadow-md active:scale-95 cursor-pointer"
                    >
                      <LogOut className="h-4 w-4" /> Registrar Salida
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  };

  const renderEmployeeView = () => {
    const active = attendances.find(a => a.status === "ACTIVE");

    return (
      <div className="max-w-md mx-auto bg-[#242424] p-8 rounded-2xl border border-white/5 shadow-sm text-center">
        <h2 className="text-xl font-black text-[#E0E0E0] uppercase tracking-tight mb-2">Control de Asistencia</h2>
        <p className="text-xs text-[#E0E0E0]/60 mb-8 font-medium">Registra tu hora de entrada y salida del turno actual.</p>

        {active ? (
          <div>
            <div className="w-36 h-36 mx-auto rounded-full bg-emerald-500/10 border-4 border-emerald-500 flex flex-col items-center justify-center mb-6 shadow-lg shadow-emerald-500/10">
              <UserCheck className="h-8 w-8 text-emerald-400 mb-1" />
              <span className="text-emerald-400 font-black text-sm uppercase tracking-wider">Turno Activo</span>
            </div>
            <p className="text-xs text-[#E0E0E0]/60 font-bold uppercase tracking-wider mb-1">Hora de entrada</p>
            <p className="text-3xl font-mono font-black text-emerald-400 mb-8">
              {format(new Date(active.check_in), "HH:mm", { timeZone: TZ })}
            </p>
            <button
              onClick={() => handleAction("CHECK_OUT")}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-black py-4 px-6 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-red-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <LogOut className="h-4 w-4" /> {isLoading ? "Registrando..." : "Registrar Salida"}
            </button>
          </div>
        ) : (
          <div>
            <div className="w-36 h-36 mx-auto rounded-full bg-white/5 border-4 border-white/10 flex flex-col items-center justify-center mb-6">
              <UserX className="h-8 w-8 text-[#E0E0E0]/40 mb-1" />
              <span className="text-[#E0E0E0]/50 font-black text-sm uppercase tracking-wider">Fuera de Turno</span>
            </div>
            <p className="text-xs text-[#E0E0E0]/50 font-medium mb-8">No tienes un turno activo en este momento.</p>
            <button
              onClick={() => handleAction("CHECK_IN")}
              disabled={isLoading}
              className="w-full inline-flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-black py-4 px-6 rounded-xl text-xs uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all active:scale-95 cursor-pointer"
            >
              <LogIn className="h-4 w-4" /> {isLoading ? "Registrando..." : "Registrar Entrada"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#121212] pb-16">
      {/* Header reutilizable */}
      <PageHeader
        title="Control de Asistencia"
        subtitle="Registro de entrada y salida de turnos de personal"
        badgeColor="bg-primary"
        actions={
          isAdmin ? (
            <Link
              href="/asistencia/history"
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2 text-xs font-black text-black uppercase tracking-wider hover:brightness-105 transition-all shadow-lg shadow-primary/20"
            >
              <FileText className="h-4 w-4" /> Ver Historial Completo
            </Link>
          ) : null
        }
      />

      <main className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        {isLoading && !users.length && !attendances.length ? (
          <div className="flex justify-center py-20">
            <span className="text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
              Cargando datos de asistencia...
            </span>
          </div>
        ) : error ? (
          <div className="bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold p-4 rounded-xl text-center">
            {error}
          </div>
        ) : isAdmin ? (
          renderAdminView()
        ) : (
          renderEmployeeView()
        )}
      </main>
    </div>
  );
}
