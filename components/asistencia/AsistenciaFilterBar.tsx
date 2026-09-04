"use client";

import { Filter, RefreshCw } from "lucide-react";
import {
  ExportButton,
  TableSearchInput,
} from "@/components/ui/DataTableControls";
import { useAsistenciaHistoryContext } from "./AsistenciaHistoryContext";
import { ATTENDANCE_EXPORT_COLUMNS } from "./exportColumns";

export function AsistenciaFilterBar() {
  const {
    users,
    isLoading,
    selectedUserId,
    setSelectedUserId,
    startDate,
    setStartDate,
    endDate,
    setEndDate,
    searchQuery,
    setSearchQuery,
    handleApplyFilters,
    filteredAttendances,
  } = useAsistenciaHistoryContext();

  const todayStr = new Date().toISOString().split("T")[0];

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border pb-3">
        <h2 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2">
          <Filter className="h-4 w-4 text-primary" />
          Filtros del Historial
        </h2>
        <div className="flex items-center gap-2">
          <ExportButton
            data={filteredAttendances}
            columns={ATTENDANCE_EXPORT_COLUMNS}
            filename={`asistencia_historial_${todayStr}.csv`}
            label="Exportar"
          />
          <button
            onClick={handleApplyFilters}
            className="rounded-xl bg-primary px-4 py-1.5 text-xs font-black text-black hover:brightness-105 active:scale-95 transition-all duration-200 cursor-pointer uppercase tracking-wider flex items-center gap-1.5 shadow-sm"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
            Filtrar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div>
          <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1">
            Empleado
          </label>
          <select
            value={selectedUserId}
            onChange={(e) => setSelectedUserId(e.target.value)}
            className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs font-bold text-text-light outline-none focus:border-primary cursor-pointer transition-colors"
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
          <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1">
            Fecha Inicio
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs font-bold text-text-light outline-none focus:border-primary scheme-dark transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1">
            Fecha Fin
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs font-bold text-text-light outline-none focus:border-primary scheme-dark transition-colors"
          />
        </div>

        <div>
          <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1">
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
  );
}
