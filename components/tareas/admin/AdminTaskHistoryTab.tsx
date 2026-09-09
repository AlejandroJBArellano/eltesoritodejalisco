"use client";

import React from "react";
import type { TaskExecution } from "@/types";
import {
  TableSearchInput,
  TableHeaderSortCell,
  TablePagination,
  ExportButton,
} from "@/components/ui/DataTableControls";
import { EXECUTIONS_EXPORT_COLUMNS } from "./adminExportColumns";
import { useOptionalAdminTareasContext } from "./AdminTareasContext";
import type { ExecComplianceFilter, CollaboratorOption, ExecSortField, SortDir } from "./types";

export interface AdminTaskHistoryTabProps {
  selectedDate?: string;
  loading?: string | null;
  executions?: TaskExecution[];
  paginatedExecutions?: TaskExecution[];
  sortedExecutions?: TaskExecution[];
  search?: string;
  onSearchChange?: (v: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (v: string) => void;
  userFilter?: string;
  onUserFilterChange?: (v: string) => void;
  complianceFilter?: ExecComplianceFilter;
  onComplianceFilterChange?: (v: ExecComplianceFilter) => void;
  collaborators?: CollaboratorOption[];
  sortField?: ExecSortField;
  sortDir?: SortDir;
  onSort?: (field: ExecSortField) => void;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  onApprove?: (id: string) => Promise<void> | void;
}

export function AdminTaskHistoryTab(props: AdminTaskHistoryTabProps) {
  const context = useOptionalAdminTareasContext();

  const selectedDate =
    props.selectedDate ?? context?.selectedDate ?? "";
  const loading = props.loading ?? context?.loading ?? null;
  const sortedExecutions =
    props.sortedExecutions ?? context?.sortedExecutions ?? [];
  const paginatedExecutions =
    props.paginatedExecutions ?? context?.paginatedExecutions ?? [];
  const search = props.search ?? context?.execSearch ?? "";
  const onSearchChange =
    props.onSearchChange ?? context?.setExecSearch ?? (() => {});
  const statusFilter =
    props.statusFilter ?? context?.execStatusFilter ?? "ALL";
  const onStatusFilterChange =
    props.onStatusFilterChange ?? context?.setExecStatusFilter ?? (() => {});
  const userFilter =
    props.userFilter ?? context?.execUserFilter ?? "ALL";
  const onUserFilterChange =
    props.onUserFilterChange ?? context?.setExecUserFilter ?? (() => {});
  const complianceFilter =
    props.complianceFilter ?? context?.execComplianceFilter ?? "ALL";
  const onComplianceFilterChange =
    props.onComplianceFilterChange ??
    context?.setExecComplianceFilter ??
    (() => {});
  const collaborators =
    props.collaborators ?? context?.collaborators ?? [];
  const sortField = props.sortField ?? context?.execSortField ?? "task";
  const sortDir = props.sortDir ?? context?.execSortDir ?? "asc";
  const onSort =
    props.onSort ??
    ((f: ExecSortField) => {
      if (context) {
        context.setExecSortField(f);
        context.setExecSortDir((d) => (d === "asc" ? "desc" : "asc"));
      }
    });
  const page = props.page ?? context?.execPage ?? 1;
  const pageSize = props.pageSize ?? context?.execPageSize ?? 10;
  const totalPages = props.totalPages ?? context?.execTotalPages ?? 1;
  const onPageChange =
    props.onPageChange ?? context?.setExecPage ?? (() => {});
  const onPageSizeChange =
    props.onPageSizeChange ?? context?.setExecPageSize ?? (() => {});
  const onApprove =
    props.onApprove ?? context?.handleApprove ?? (() => {});

  return (
    <div className="space-y-4 rounded-2xl bg-card p-6 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary" />
          Ejecución de Tareas - {selectedDate}
        </h2>
        <div className="flex items-center gap-3">
          {loading === "data" && (
            <span className="text-xs text-primary animate-pulse font-bold">
              Cargando...
            </span>
          )}
          <ExportButton
            data={sortedExecutions}
            columns={EXECUTIONS_EXPORT_COLUMNS}
            filename={() => `reporte_tareas_${selectedDate || "historico"}`}
            sheetName="Reporte de Tareas"
          />
        </div>
      </div>

      <div className="flex flex-col gap-3 bg-dark/40 p-4 rounded-xl border border-border">
        <div className="flex items-center gap-1.5 bg-dark/60 p-1 rounded-xl border border-border w-fit">
          <button
            type="button"
            onClick={() => onComplianceFilterChange("ALL")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              complianceFilter === "ALL"
                ? "bg-primary text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Todas
          </button>
          <button
            type="button"
            onClick={() => onComplianceFilterChange("COMPLETED")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              complianceFilter === "COMPLETED"
                ? "bg-primary text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            Completadas
          </button>
          <button
            type="button"
            onClick={() => onComplianceFilterChange("NOT_DONE")}
            className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all cursor-pointer ${
              complianceFilter === "NOT_DONE"
                ? "bg-primary text-black shadow-md"
                : "text-gray-400 hover:text-white"
            }`}
          >
            No Realizadas
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
              Buscar Ejecución
            </label>
            <TableSearchInput
              value={search}
              onChange={onSearchChange}
              placeholder="Buscar por tarea o colaborador..."
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
              Colaborador
            </label>
            <select
              value={userFilter}
              onChange={(e) => onUserFilterChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary"
            >
              <option value="ALL">Todos los Colaboradores</option>
              <option value="UNASSIGNED">Sin Asignar</option>
              {collaborators.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
              Estado
            </label>
            <select
              value={statusFilter}
              onChange={(e) => onStatusFilterChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary"
            >
              <option value="ALL">Todos los Estados</option>
              <option value="COMPLETED">Listo para Aprobar</option>
              <option value="APPROVED">Aprobado</option>
              <option value="IN_PROGRESS">En Progreso</option>
              <option value="NOT_DONE">No Realizada</option>
            </select>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-dark/40 text-xs font-black text-white uppercase tracking-wider border-b border-border">
            <tr>
              <TableHeaderSortCell
                field="task"
                label="Tarea"
                currentSortField={sortField}
                sortDirection={sortDir}
                onSort={(f) => onSort(f as ExecSortField)}
              />
              <TableHeaderSortCell
                field="user"
                label="Colaborador"
                currentSortField={sortField}
                sortDirection={sortDir}
                onSort={(f) => onSort(f as ExecSortField)}
              />
              <TableHeaderSortCell
                field="status"
                label="Estado"
                currentSortField={sortField}
                sortDirection={sortDir}
                onSort={(f) => onSort(f as ExecSortField)}
              />
              <th className="py-3 px-4 font-bold">Inicio</th>
              <TableHeaderSortCell
                field="duration"
                label="Duración"
                currentSortField={sortField}
                sortDirection={sortDir}
                onSort={(f) => onSort(f as ExecSortField)}
              />
              <th className="py-3 px-4 font-bold">Evidencia</th>
              <th className="py-3 px-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedExecutions.map((exec) => (
              <tr
                key={exec.id}
                className="hover:bg-white/2 transition-colors"
              >
                <td className="py-3 px-4 text-white font-bold">
                  {exec.task?.name || "Desconocida"}
                </td>
                <td className="py-3 px-4 text-gray-400">
                  {exec.status === "NOT_DONE"
                    ? "Sin Asignar"
                    : exec.user?.full_name || "Sin Asignar"}
                </td>
                <td className="py-3 px-4">
                  <span
                    className={`px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                      exec.status === "COMPLETED"
                        ? "bg-green-500/10 text-green-400 border border-green-500/20"
                        : exec.status === "APPROVED"
                          ? "bg-blue-500/10 text-blue-400 border border-blue-500/20"
                          : exec.status === "IN_PROGRESS"
                            ? "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20"
                            : exec.status === "NOT_DONE"
                              ? "bg-red-500/10 text-red-400 border border-red-500/20"
                              : "bg-gray-500/10 text-gray-400 border border-gray-500/20"
                    }`}
                  >
                    {exec.status === "COMPLETED"
                      ? "Listo para Aprobar"
                      : exec.status === "APPROVED"
                        ? "Aprobado"
                        : exec.status === "IN_PROGRESS"
                          ? "En Progreso"
                          : exec.status === "NOT_DONE"
                            ? "No Realizada"
                            : exec.status}
                  </span>
                </td>
                <td className="py-3 px-4 font-mono text-xs text-gray-400">
                  {exec.start_time
                    ? new Date(exec.start_time).toLocaleTimeString("es-MX", {
                        hour: "2-digit",
                        minute: "2-digit",
                      })
                    : "-"}
                </td>
                <td className="py-3 px-4 font-bold text-white">
                  {exec.status === "NOT_DONE"
                    ? "-"
                    : exec.net_duration_minutes !== undefined
                      ? `${exec.net_duration_minutes} min`
                      : "-"}
                </td>
                <td className="py-3 px-4">
                  {exec.photo_url ? (
                    <a
                      href={exec.photo_url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-primary hover:underline font-bold text-xs"
                    >
                      Ver Foto
                    </a>
                  ) : (
                    <span className="text-gray-600">-</span>
                  )}
                </td>
                <td className="py-3 px-4 text-right">
                  {exec.status === "COMPLETED" && (
                    <button
                      onClick={() => onApprove(exec.id)}
                      disabled={loading === exec.id}
                      className="bg-primary hover:bg-primary/95 text-black text-xs font-black uppercase tracking-widest px-3 py-1.5 rounded-lg transition-all"
                    >
                      Aprobar
                    </button>
                  )}
                </td>
              </tr>
            ))}
            {paginatedExecutions.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-xs text-gray-500 italic"
                >
                  No hay ejecuciones registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={page}
        totalPages={totalPages}
        totalItems={sortedExecutions.length}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />
    </div>
  );
}
