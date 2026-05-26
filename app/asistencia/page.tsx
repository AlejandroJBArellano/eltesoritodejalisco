"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { format } from "date-fns-tz";
import { differenceInHours, differenceInMinutes } from "date-fns";
import { Attendance, User } from "@/types";

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
      // If admin is modifying someone else or themselves, use custom time
      if (isAdmin) {
        // Construct ISO string from customTime
        const today = format(new Date(), "yyyy-MM-dd", { timeZone: TZ });
        // basic construction of local timestamp assuming today's date
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
      alert(err.message);
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
      <div className="space-y-6">
        <div className="flex items-center gap-4 bg-[#242424] p-4 rounded-lg border border-[#333]">
          <div className="flex-1">
            <h3 className="text-lg font-bold text-white mb-1">Modo Administrador</h3>
            <p className="text-sm text-gray-400">Puedes registrar la entrada o salida de tu equipo usando una hora personalizada.</p>
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-1 uppercase tracking-wider">Hora a registrar</label>
            <input 
              type="time" 
              value={customTime}
              onChange={(e) => setCustomTime(e.target.value)}
              className="bg-[#121212] border border-[#333] text-white px-3 py-2 rounded-md focus:outline-none focus:border-blue-500"
            />
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
              <div key={user.id} className="bg-[#181818] p-5 rounded-xl border border-[#333] flex flex-col justify-between">
                <div>
                  <div className="flex justify-between items-start mb-2">
                    <h4 className="font-bold text-lg text-white">{user.name}</h4>
                    <span className="text-xs bg-[#242424] text-gray-400 px-2 py-1 rounded-full">{user.role}</span>
                  </div>
                  
                  {active ? (
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        En Turno
                      </span>
                      <p className="text-sm text-gray-400 mt-2">
                        Entrada: {format(new Date(active.check_in), "HH:mm", { timeZone: TZ })}
                      </p>
                    </div>
                  ) : (
                    <div className="mb-4">
                      <span className="inline-flex items-center gap-1.5 py-1 px-2 rounded-md text-xs font-medium bg-gray-500/10 text-gray-400 border border-gray-500/20">
                        Fuera de Turno
                      </span>
                    </div>
                  )}

                  {finished.length > 0 && (
                    <div className="mb-4 text-xs text-gray-500 border-t border-[#333] pt-2">
                      <p>Turnos completados hoy: {finished.length}</p>
                      <p>Horas totales: {totalHoursFinished.toFixed(2)} hrs</p>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-[#333] flex gap-2">
                  {!active ? (
                    <button 
                      onClick={() => handleAction("CHECK_IN", user.id)}
                      className="flex-1 bg-green-600 hover:bg-green-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      Entrada
                    </button>
                  ) : (
                    <button 
                      onClick={() => handleAction("CHECK_OUT", user.id)}
                      className="flex-1 bg-red-600 hover:bg-red-500 text-white font-bold py-2 px-4 rounded-lg transition-colors text-sm"
                    >
                      Salida
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
    // Current logged in user is the only one in attendances (if any)
    const active = attendances.find(a => a.status === "ACTIVE");
    
    return (
      <div className="max-w-md mx-auto bg-[#181818] p-8 rounded-2xl border border-[#333] shadow-xl text-center">
        <h2 className="text-2xl font-bold text-white mb-2">Control de Asistencia</h2>
        <p className="text-gray-400 mb-8">Registra tu hora de entrada y salida del turno actual.</p>
        
        {active ? (
          <div>
            <div className="w-32 h-32 mx-auto rounded-full bg-green-500/10 border-4 border-green-500 flex items-center justify-center mb-6">
              <span className="text-green-400 font-bold text-xl">Activo</span>
            </div>
            <p className="text-lg text-white mb-1">Hora de entrada</p>
            <p className="text-3xl font-mono text-green-400 mb-8">
              {format(new Date(active.check_in), "HH:mm", { timeZone: TZ })}
            </p>
            <button 
              onClick={() => handleAction("CHECK_OUT")}
              disabled={isLoading}
              className="w-full bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg shadow-red-500/20 transition-all"
            >
              {isLoading ? "Registrando..." : "Registrar Salida"}
            </button>
          </div>
        ) : (
          <div>
            <div className="w-32 h-32 mx-auto rounded-full bg-gray-500/10 border-4 border-gray-500 flex items-center justify-center mb-6">
              <span className="text-gray-400 font-bold text-lg">Inactivo</span>
            </div>
            <p className="text-gray-500 mb-8">No tienes un turno activo en este momento.</p>
            <button 
              onClick={() => handleAction("CHECK_IN")}
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-500 disabled:opacity-50 text-white font-bold py-4 px-6 rounded-xl text-lg shadow-lg shadow-green-500/20 transition-all"
            >
              {isLoading ? "Registrando..." : "Registrar Entrada"}
            </button>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-[#121212] pb-12">
      {/* Header */}
      <header className="bg-[#242424] shadow-sm border-b border-[#333]">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/"
              className="text-sm text-blue-500 hover:text-blue-400 mb-1 inline-block"
            >
              ← Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-[#E0E0E0]">
              Asistencia
            </h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        {isLoading && !users.length && !attendances.length ? (
          <div className="flex justify-center py-20">
            <span className="text-gray-400">Cargando datos...</span>
          </div>
        ) : error ? (
          <div className="bg-red-900/50 border border-red-500 text-red-200 p-4 rounded-lg">
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
