"use client";

import React from "react";
import type { PrimordialTask, TaskCategory } from "@/types";
import {
  TableSearchInput,
  TableHeaderSortCell,
  TablePagination,
  ExportButton,
} from "@/components/ui/DataTableControls";
import { Edit3, Trash2 } from "lucide-react";
import { TASKS_CONFIG_EXPORT_COLUMNS } from "./adminExportColumns";
import { useOptionalAdminTareasContext } from "./AdminTareasContext";
import type { TaskSortField, SortDir } from "./types";

export interface AdminTaskConfigTabProps {
  tasks?: PrimordialTask[];
  filteredTasks?: PrimordialTask[];
  sortedTasks?: PrimordialTask[];
  paginatedTasks?: PrimordialTask[];
  categories?: TaskCategory[];
  search?: string;
  onSearchChange?: (v: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (v: string) => void;
  frequencyFilter?: string;
  onFrequencyFilterChange?: (v: string) => void;
  sortField?: TaskSortField;
  sortDir?: SortDir;
  onSort?: (field: TaskSortField) => void;
  page?: number;
  pageSize?: number;
  totalPages?: number;
  onPageChange?: (p: number) => void;
  onPageSizeChange?: (s: number) => void;
  onEditTask?: (task: PrimordialTask) => void;
  onDeleteTask?: (id: string) => Promise<void> | void;
  armedTaskId?: string | null;
}

export function AdminTaskConfigTab(props: AdminTaskConfigTabProps) {
  const context = useOptionalAdminTareasContext();

  const filteredTasks =
    props.filteredTasks ?? context?.filteredTasks ?? [];
  const sortedTasks = props.sortedTasks ?? context?.sortedTasks ?? [];
  const paginatedTasks =
    props.paginatedTasks ?? context?.paginatedTasks ?? [];
  const categories = props.categories ?? context?.categories ?? [];
  const search = props.search ?? context?.taskSearch ?? "";
  const onSearchChange =
    props.onSearchChange ?? context?.setTaskSearch ?? (() => {});
  const categoryFilter =
    props.categoryFilter ?? context?.taskCatFilter ?? "ALL";
  const onCategoryFilterChange =
    props.onCategoryFilterChange ?? context?.setTaskCatFilter ?? (() => {});
  const frequencyFilter =
    props.frequencyFilter ?? context?.taskFreqFilter ?? "ALL";
  const onFrequencyFilterChange =
    props.onFrequencyFilterChange ?? context?.setTaskFreqFilter ?? (() => {});
  const sortField = props.sortField ?? context?.taskSortField ?? "name";
  const sortDir = props.sortDir ?? context?.taskSortDir ?? "asc";
  const onSort =
    props.onSort ??
    ((f: TaskSortField) => {
      if (context) {
        context.setTaskSortField(f);
        context.setTaskSortDir((d) => (d === "asc" ? "desc" : "asc"));
      }
    });
  const page = props.page ?? context?.taskPage ?? 1;
  const pageSize = props.pageSize ?? context?.taskPageSize ?? 10;
  const totalPages = props.totalPages ?? context?.taskTotalPages ?? 1;
  const onPageChange =
    props.onPageChange ?? context?.setTaskPage ?? (() => {});
  const onPageSizeChange =
    props.onPageSizeChange ?? context?.setTaskPageSize ?? (() => {});
  const onEditTask =
    props.onEditTask ?? context?.openEditTaskModal ?? (() => {});
  const onDeleteTask =
    props.onDeleteTask ?? context?.handleDeleteTask ?? (() => {});
  const armedTaskId = props.armedTaskId ?? context?.armedTaskId ?? null;

  return (
    <div className="space-y-6">
      <div className="rounded-2xl bg-card p-6 border border-border space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <h2 className="text-base font-black text-white uppercase tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-primary" />
            Catálogo de Tareas Primordiales ({filteredTasks.length})
          </h2>
          <ExportButton
            data={sortedTasks}
            columns={TASKS_CONFIG_EXPORT_COLUMNS}
            filename={() =>
              `catalogo_tareas_${new Date().toISOString().split("T")[0]}`
            }
            sheetName="Tareas Primordiales"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-dark/40 p-4 rounded-xl border border-border">
          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
              Buscar Tarea
            </label>
            <TableSearchInput
              value={search}
              onChange={onSearchChange}
              placeholder="Buscar por nombre de tarea..."
            />
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
              Categoría
            </label>
            <select
              value={categoryFilter}
              onChange={(e) => onCategoryFilterChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary"
            >
              <option value="ALL">Todas las Categorías</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-gray-400 uppercase tracking-widest block mb-1">
              Frecuencia
            </label>
            <select
              value={frequencyFilter}
              onChange={(e) => onFrequencyFilterChange(e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs font-bold text-white outline-none focus:border-primary"
            >
              <option value="ALL">Todas las Frecuencias</option>
              <option value="DAILY">Diario</option>
              <option value="CONTINUOUS">Continuo</option>
              <option value="ROUTINE">Rutina</option>
              <option value="WEEKLY">Semanal</option>
              <option value="CLOSING">Cierre</option>
              <option value="VARIABLE">Variable</option>
            </select>
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-border">
          <table className="w-full text-left text-sm text-gray-300">
            <thead className="bg-dark/40 text-xs font-black text-white uppercase tracking-wider border-b border-border">
              <tr>
                <TableHeaderSortCell
                  field="name"
                  label="Nombre de la Tarea"
                  currentSortField={sortField}
                  sortDirection={sortDir}
                  onSort={(f) => onSort(f as TaskSortField)}
                />
                <TableHeaderSortCell
                  field="category"
                  label="Categoría"
                  currentSortField={sortField}
                  sortDirection={sortDir}
                  onSort={(f) => onSort(f as TaskSortField)}
                />
                <TableHeaderSortCell
                  field="frequency"
                  label="Frecuencia"
                  currentSortField={sortField}
                  sortDirection={sortDir}
                  onSort={(f) => onSort(f as TaskSortField)}
                />
                <th className="py-3 px-4 font-bold">Evidencia / Timeout</th>
                <th className="py-3 px-4 font-bold text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {paginatedTasks.map((t) => (
                <tr key={t.id} className="hover:bg-white/[0.02]">
                  <td className="py-3 px-4 font-bold text-white">{t.name}</td>
                  <td className="py-3 px-4">
                    <span className="rounded-lg bg-white/5 border border-border px-2.5 py-1 text-xs font-bold text-gray-300">
                      {t.category?.name || "Sin categoría"}
                    </span>
                  </td>
                  <td className="py-3 px-4 font-mono text-xs uppercase text-primary font-bold">
                    {t.frequency_type}
                  </td>
                  <td className="py-3 px-4 text-xs text-gray-400">
                    {t.requires_photo ? "📷 Requiere Foto" : "Sin Foto"} |{" "}
                    {t.timeout_minutes} min
                  </td>
                  <td className="py-3 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => onEditTask(t)}
                        className="rounded-lg bg-blue-500/10 border border-blue-500/20 p-2 text-blue-400 hover:bg-blue-500/20 transition-colors"
                        title="Editar Tarea"
                      >
                        <Edit3 className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => onDeleteTask(t.id)}
                        className={`rounded-lg border p-2 transition-colors ${
                          armedTaskId === t.id
                            ? "bg-red-500 text-white border-red-600 animate-pulse"
                            : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                        }`}
                        title={
                          armedTaskId === t.id
                            ? "¿Confirmar eliminación?"
                            : "Desactivar Tarea"
                        }
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {paginatedTasks.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="py-8 text-center text-xs text-gray-500 italic"
                  >
                    No hay tareas configuradas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          currentPage={page}
          totalPages={totalPages}
          totalItems={sortedTasks.length}
          pageSize={pageSize}
          onPageChange={onPageChange}
          onPageSizeChange={onPageSizeChange}
        />
      </div>
    </div>
  );
}
