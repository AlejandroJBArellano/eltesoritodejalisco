"use client";

import React from "react";
import { ExportButton } from "@/components/ui/DataTableControls";
import { PERFORMANCE_EXPORT_COLUMNS } from "./adminExportColumns";
import { useOptionalAdminTareasContext } from "./AdminTareasContext";
import type { StaffPerformanceMetric } from "./types";

export interface AdminStaffPerformanceTabProps {
  selectedDate?: string;
  metrics?: StaffPerformanceMetric[];
}

export function AdminStaffPerformanceTab(props: AdminStaffPerformanceTabProps) {
  const context = useOptionalAdminTareasContext();

  const selectedDate = props.selectedDate ?? context?.selectedDate ?? "";
  const metrics = props.metrics ?? context?.metrics ?? [];

  return (
    <div className="space-y-4 rounded-2xl bg-card p-6 border border-border">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <h2 className="text-base font-black text-white uppercase tracking-wider">
          Resumen de Rendimiento de Personal - {selectedDate}
        </h2>
        {metrics.length > 0 && (
          <ExportButton
            data={metrics}
            columns={PERFORMANCE_EXPORT_COLUMNS}
            filename={() => `rendimiento_personal_${selectedDate}`}
            sheetName="Rendimiento de Personal"
          />
        )}
      </div>
      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-sm text-gray-300">
          <thead className="bg-dark/40 text-xs font-black text-white uppercase tracking-wider border-b border-border">
            <tr>
              <th className="py-3 px-4">Colaborador</th>
              <th className="py-3 px-4">Tareas Completadas</th>
              <th className="py-3 px-4">Duración Promedio</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {metrics.map((collab) => (
              <tr key={collab.userId} className="hover:bg-white/[0.02]">
                <td className="py-3 px-4 text-white font-bold">
                  {collab.name}
                </td>
                <td className="py-3 px-4 text-gray-400 font-mono">
                  {collab.completedCount} tareas
                </td>
                <td className="py-3 px-4 font-bold text-white font-mono">
                  {collab.avgDurationMinutes} min / tarea
                </td>
              </tr>
            ))}
            {metrics.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="py-8 text-center text-xs text-gray-500 italic"
                >
                  No hay métricas registradas para esta fecha.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
