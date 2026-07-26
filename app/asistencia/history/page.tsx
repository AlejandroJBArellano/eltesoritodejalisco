"use client";

import { useEffect, useState, useMemo } from "react";
import { format } from "date-fns-tz";
import { differenceInMinutes } from "date-fns";
import {
  Calendar,
  Clock,
  Filter,
  Users,
  CheckCircle2,
  FileText,
  Search,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import {
  TableSearchInput,
  TableHeaderSortCell,
  TablePagination,
} from "@/components/ui/DataTableControls";

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

  // Table Sort & Pagination State
  type SortField = "name" | "role" | "date" | "check_in" | "duration" | "status";
  const [sortField, setSortField] = useState<SortField>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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
    return attendances.filter((a) => {
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        const matchName = (a.users?.name || "").toLowerCase().includes(query);
        const matchRole = (a.users?.role || "").toLowerCase().includes(query);
        const matchDate = (a.date || "").includes(query);
        if (!matchName && !matchRole && !matchDate) return false;
      }
      return true;
    });
  }, [attendances, searchQuery]);

  const sortedAttendances = useMemo(() => {
    return [...filteredAttendances].sort((a, b) => {
      let comp = 0;
      if (sortField === "name") {
        comp = (a.users?.name || "").localeCompare(b.users?.name || "");
      } else if (sortField === "role") {
        comp = (a.users?.role || "").localeCompare(b.users?.role || "");
      } else if (sortField === "date") {
        comp = (a.date || "").localeCompare(b.date || "");
      } else if (sortField === "check_in") {
        comp = new Date(a.check_in).getTime() - new Date(b.check_in).getTime();
      } else if (sortField === "duration") {
        const durA = a.check_out ? differenceInMinutes(new Date(a.check_out), new Date(a.check_in)) : 0;
        const durB = b.check_out ? differenceInMinutes(new Date(b.check_out), new Date(b.check_in)) : 0;
        comp = durA - durB;
      } else if (sortField === "status") {
        comp = a.status.localeCompare(b.status);
      }
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [filteredAttendances, sortField, sortDirection]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchQuery, sortField, sortDirection, pageSize]);

  const totalPages = Math.ceil(sortedAttendances.length / pageSize) || 1;
  const paginatedAttendances = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedAttendances.slice(start, start + pageSize);
  }, [sortedAttendances, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

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
    <div className="min-h-screen bg-[#121212] pb-16 text-[#E0E0E0]">
      {/* Header reutilizable */}
      <PageHeader
        title="Historial de Asistencia"
        subtitle="Control de entradas, salidas y duraciones de turno del personal"
        badgeColor="bg-[#FFB7CE]"
        backHref="/asistencia"
        backLabel="Checador"
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {/* Barra de Filtros */}
        <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-xs font-black text-[#E0E0E0]/50 uppercase tracking-widest flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#FFB7CE]" />
              Filtros del Historial
            </h2>
            <button
              onClick={handleApplyFilters}
              className="rounded-xl bg-[#FFB7CE] px-4 py-1.5 text-xs font-black text-black hover:brightness-105 transition-all uppercase tracking-wider flex items-center gap-1.5"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`} />
              Filtrar
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div>
              <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
                Empleado
              </label>
              <select
                value={selectedUserId}
                onChange={(e) => setSelectedUserId(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-[#E0E0E0] outline-none focus:border-[#FFB7CE]"
              >
                <option value="ALL">Todos los Empleados</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name} ({u.role})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
                Fecha Inicio
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-[#E0E0E0] outline-none focus:border-[#FFB7CE] scheme-dark"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
                Fecha Fin
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-[#E0E0E0] outline-none focus:border-[#FFB7CE] scheme-dark"
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
                Búsqueda Rápida
              </label>
              <TableSearchInput
                value={searchQuery}
                onChange={setSearchQuery}
                placeholder="Nombre, rol o fecha..."
              />
            </div>
          </div>
        </section>

        {/* Resumen Métricas */}
        <section className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Total Registros
              </p>
              <p className="mt-1 text-2xl font-black text-[#E0E0E0]">{filteredAttendances.length}</p>
            </div>
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <FileText className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Horas Totales Trabajadas
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-400">
                {totalHoursWorked.toFixed(1)} hrs
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Turnos Activos Ahora
              </p>
              <p className="mt-1 text-2xl font-black text-amber-400">{activeCount}</p>
            </div>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Users className="h-5 w-5" />
            </div>
          </div>
        </section>

        {/* TABLA CON PAGINACIÓN Y ORDENAMIENTO */}
        <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
          <div className="flex items-center justify-between border-b border-white/5 pb-3">
            <h2 className="text-base font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-[#FFB7CE]" />
              Registros de Entrada y Salida ({filteredAttendances.length})
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
                    <TableHeaderSortCell
                      field="name"
                      label="Empleado"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <TableHeaderSortCell
                      field="role"
                      label="Rol"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <TableHeaderSortCell
                      field="date"
                      label="Fecha"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <TableHeaderSortCell
                      field="check_in"
                      label="Hora Entrada"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                    />
                    <th className="py-3 px-3">Hora Salida</th>
                    <TableHeaderSortCell
                      field="duration"
                      label="Duración Total"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-right"
                    />
                    <TableHeaderSortCell
                      field="status"
                      label="Estado"
                      currentSortField={sortField}
                      sortDirection={sortDirection}
                      onSort={handleSort}
                      className="text-right"
                    />
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {paginatedAttendances.map((rec) => (
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
                  {paginatedAttendances.length === 0 && (
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

              <TablePagination
                currentPage={currentPage}
                totalPages={totalPages}
                totalItems={sortedAttendances.length}
                pageSize={pageSize}
                onPageChange={setCurrentPage}
                onPageSizeChange={setPageSize}
              />
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
