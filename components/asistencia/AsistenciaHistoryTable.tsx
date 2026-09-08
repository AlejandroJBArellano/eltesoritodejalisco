"use client";

import {
  TableHeaderSortCell,
  TablePagination,
} from "@/components/ui/DataTableControls";
import { useAsistenciaHistoryContext } from "./AsistenciaHistoryContext";
import {
  formatAttendanceDuration,
  formatAttendanceTime,
} from "./exportColumns";

export function AsistenciaHistoryTable() {
  const {
    isLoading,
    error,
    filteredAttendances,
    sortedAttendances,
    paginatedAttendances,
    sortField,
    sortDirection,
    handleSort,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalPages,
  } = useAsistenciaHistoryContext();

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-base font-black text-text-light tracking-tight uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Registros de Entrada y Salida ({filteredAttendances.length})
        </h2>
      </div>

      {isLoading ? (
        <div className="py-16 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest">
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
              <tr className="border-b border-border text-xs font-black text-text-light/40 uppercase tracking-wider">
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
            <tbody className="divide-y divide-border">
              {paginatedAttendances.map((rec) => (
                <tr
                  key={rec.id}
                  className="hover:bg-white/2 transition-colors"
                >
                  <td className="py-3.5 px-3">
                    <span className="font-bold text-text-light uppercase">
                      {rec.users?.name || "Desconocido"}
                    </span>
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="rounded-full bg-white/5 border border-border px-2.5 py-0.5 text-[10px] font-black text-text-light/60 uppercase tracking-widest">
                      {rec.users?.role || "N/A"}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-text-light/80 font-mono text-xs">
                    {rec.date}
                  </td>
                  <td className="py-3.5 px-3 text-emerald-400 font-mono text-xs font-bold">
                    {formatAttendanceTime(rec.check_in)}
                  </td>
                  <td className="py-3.5 px-3 text-red-400 font-mono text-xs font-bold">
                    {formatAttendanceTime(rec.check_out)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-text-light">
                    {formatAttendanceDuration(rec.check_in, rec.check_out)}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    {rec.status === "ACTIVE" ? (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-3 py-1 text-[10px] font-black text-emerald-400 uppercase tracking-widest">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                        En Turno
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/5 border border-border px-3 py-1 text-[10px] font-black text-text-light/50 uppercase tracking-widest">
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
                    className="py-12 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest"
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
  );
}
