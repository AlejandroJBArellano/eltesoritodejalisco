"use client";

import { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { format } from "date-fns-tz";
import { differenceInMinutes } from "date-fns";
import {
  ArrowLeft,
  Calendar,
  Clock,
  Filter,
  Users,
  CheckCircle2,
  FileText,
  Search,
  RefreshCw,
  Download,
} from "lucide-react";

type AttendanceRecord = {
  id: string;
  user_id: string;
  check_in: string;
  check_out: string | null;
  status: "ACTIVE" | "FINISHED";
  date: string;
  users?: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
};

type UserOption = {
  id: string;
  name: string;
  role: string;
};

const TZ = "America/Mexico_City";

export default function AttendanceHistoryPage() {
  const [attendances, setAttendances] = useState<AttendanceRecord[]>([]);
  const [users, setUsers] = useState<UserOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter states
  const [selectedUserId, setSelectedUserId] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchHistory = async () => {
    try {
      setIsLoading(true);
      setError(null);
      let url = "/api/attendance/history?";
      if (selectedUserId !== "ALL") url += `&userId=${selectedUserId}`;
      if (startDate) url += `&startDate=${startDate}`;
      if (endDate) url += `&endDate=${endDate}`;

      const res = await fetch(url);
      if (!res.ok) {
        const json = await res.json();
        throw new Error(json.error || "Error al obtener historial");
      }
      const data = await res.json();
      setAttendances(data.attendances || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch("/api/attendance");
      if (res.ok) {
        const data = await res.json();
        setUsers(data.users || []);
      }
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchUsers();
    fetchHistory();
  }, []);

  const handleApplyFilters = () => {
    fetchHistory();
  };

  const filteredAttendances = useMemo(() => {
    if (!searchQuery.trim()) return attendances;
    const query = searchQuery.toLowerCase();
    return attendances.filter(
      (a) =>
        a.users?.name.toLowerCase().includes(query) ||
        a.users?.role.toLowerCase().includes(query) ||
        a.date.includes(query)
    );
  }, [attendances, searchQuery]);

  const totalHoursWorked = useMemo(() => {
    return filteredAttendances.reduce((acc, curr) => {
      if (curr.check_in && curr.check_out) {
        const mins = differenceInMinutes(new Date(curr.check_out), new Date(curr.check_in));
        return acc + Math.max(0, mins) / 60;
      }
      return acc;
    }, 0);
  }, [filteredAttendances]);

  const activeCount = useMemo(() => {
    return filteredAttendances.filter((a) => a.status === "ACTIVE").length;
  }, [filteredAttendances]);

  const calculateDuration = (checkIn: string, checkOut: string | null) => {
    if (!checkOut) return "En curso...";
    const mins = differenceInMinutes(new Date(checkOut), new Date(checkIn));
    const hours = Math.floor(Math.max(0, mins) / 60);
    const remainingMins = Math.max(0, mins) % 60;
    return `${hours}h ${remainingMins}m`;
  };

  return (
    <div className="min-h-screen bg-[#121212] pb-16">
      {/* Header */}
      <header className="bg-[#242424] border-b border-white/5 shadow-sm mb-8">
        <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/asistencia"
              className="inline-flex items-center gap-2 text-xs font-black text-[#E0E0E0]/60 hover:text-white uppercase tracking-widest transition-colors mb-2"
            >
              <ArrowLeft className="h-3.5 w-3.5" /> Volver a Checador
            </Link>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-3">
                <span className="h-3 w-3 rounded-full bg-primary animate-pulse"></span>
                Historial de Asistencia
              </h1>
              <span className="rounded-full bg-primary/10 px-3 py-1 text-[10px] font-black text-primary uppercase tracking-widest border border-primary/20">
                Administración
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => window.print()}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-white uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <Download className="h-4 w-4" /> Imprimir / Exportar
            </button>
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl space-y-8 px-4 sm:px-6 lg:px-8">
        {/* Filter Controls Card */}
        <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5">
          <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
            <h2 className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest flex items-center gap-2">
              <Filter className="h-4 w-4 text-primary" /> Filtros de Búsqueda
            </h2>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search Input */}
            <div>
              <label className="text-xs font-bold text-[#E0E0E0]/60 uppercase tracking-wider block mb-1.5">
                Buscar por Nombre
              </label>
              <div className="relative">
                <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-[#E0E0E0]/40" />
                <input
                  type="text"
                  placeholder="Ej. Juan Pérez"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-[#181818] pl-10 pr-4 py-2 text-xs text-[#E0E0E0] placeholder-[#666666] outline-none focus:border-primary"
                />
              </div>
            </div>

            {/* Employee Filter */}
            <div>
              <label className="text-xs font-bold text-[#E0E0E0]/60 uppercase tracking-wider block mb-1.5">
                Empleado
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3.5 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary cursor-pointer"
              >
                <option value="ALL">Todos los empleados</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            {/* Start Date */}
            <div>
              <label className="text-xs font-bold text-[#E0E0E0]/60 uppercase tracking-wider block mb-1.5">
                Desde
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3.5 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary"
              />
            </div>

            {/* End Date */}
            <div>
              <label className="text-xs font-bold text-[#E0E0E0]/60 uppercase tracking-wider block mb-1.5">
                Hasta
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3.5 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary"
              />
            </div>
          </div>

          <div className="mt-4 flex items-center justify-end gap-3 pt-3 border-t border-white/5">
            <button
              onClick={handleApplyFilters}
              className="inline-flex items-center gap-2 rounded-xl bg-primary px-5 py-2 text-xs font-black text-white uppercase tracking-wider hover:bg-primary/90 transition-all shadow-md active:scale-95 cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Aplicar Filtros
            </button>
          </div>
        </section>

        {/* Summary Badges Grid */}
        <section className="grid gap-6 sm:grid-cols-3">
          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Total Registros
              </span>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <FileText className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
              {filteredAttendances.length}
            </p>
          </div>

          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Horas Totales Trabajadas
              </span>
              <div className="rounded-xl bg-success/10 p-3 text-success">
                <Clock className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
              {totalHoursWorked.toFixed(1)} <span className="text-sm font-bold text-[#E0E0E0]/50 uppercase">hrs</span>
            </p>
          </div>

          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Turnos Activos Ahora
              </span>
              <div className="rounded-xl bg-secondary/10 p-3 text-secondary">
                <Users className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-secondary tracking-tight">
              {activeCount}
            </p>
          </div>
        </section>

        {/* Detailed Attendance Table */}
        <section className="rounded-2xl bg-[#242424] p-6 sm:p-8 shadow-sm border border-white/5">
          <div className="mb-6 flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-success"></span>
              Registros de Entrada y Salida
            </h2>
          </div>

          {isLoading ? (
            <div className="py-16 text-center text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest">
              Cargando historial de asistencias...
            </div>
          ) : error ? (
            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold text-center">
              {error}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 text-xs font-black text-[#E0E0E0]/40 uppercase tracking-wider">
                    <th className="py-3 px-3">Empleado</th>
                    <th className="py-3 px-3">Rol</th>
                    <th className="py-3 px-3">Fecha</th>
                    <th className="py-3 px-3">Hora Entrada</th>
                    <th className="py-3 px-3">Hora Salida</th>
                    <th className="py-3 px-3 text-right">Duración Total</th>
                    <th className="py-3 px-3 text-right">Estado</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredAttendances.map((rec) => (
                    <tr key={rec.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-bold text-[#E0E0E0] uppercase">
                          {rec.users?.name || "Desconocido"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="rounded-full bg-white/5 border border-white/10 px-2.5 py-0.5 text-[10px] font-black text-[#E0E0E0]/60 uppercase tracking-widest">
                          {rec.users?.role || "N/A"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3 text-[#E0E0E0]/80 font-mono text-xs">
                        {rec.date}
                      </td>
                      <td className="py-3.5 px-3 text-emerald-400 font-mono text-xs font-bold">
                        {format(new Date(rec.check_in), "HH:mm:ss", { timeZone: TZ })}
                      </td>
                      <td className="py-3.5 px-3 text-red-400 font-mono text-xs font-bold">
                        {rec.check_out
                          ? format(new Date(rec.check_out), "HH:mm:ss", { timeZone: TZ })
                          : "—"}
                      </td>
                      <td className="py-3.5 px-3 text-right font-bold text-[#E0E0E0]">
                        {calculateDuration(rec.check_in, rec.check_out)}
                      </td>
                      <td className="py-3.5 px-3 text-right">
                        {rec.status === "ACTIVE" ? (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                            En Turno
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-3 py-1 text-[10px] font-black text-[#E0E0E0]/50 uppercase tracking-widest">
                            Finalizado
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredAttendances.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        className="py-12 text-center text-xs font-bold text-[#E0E0E0]/40 uppercase tracking-widest"
                      >
                        No se encontraron registros de asistencia con los filtros seleccionados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
