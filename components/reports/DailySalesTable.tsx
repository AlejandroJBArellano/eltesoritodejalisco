"use client";

import React from "react";
import { ExportButton } from "@/components/ui/DataTableControls";
import { DAILY_SALES_EXPORT_COLUMNS } from "./exportColumns";
import type { DailySaleExportItem, Period } from "./types";

export interface DailySalesTableProps {
  dailySalesData: DailySaleExportItem[];
  period: Period;
}

export function DailySalesTable({
  dailySalesData,
  period,
}: DailySalesTableProps) {
  const currentDateStr = new Date().toISOString().split("T")[0];

  return (
    <section className="rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-border">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            Detalle de Ventas Diarias
          </h2>
          <p className="text-xs text-text-light/60 mt-1 font-medium">
            Desglose tabular día a día con cálculo de ticket promedio y producto líder.
          </p>
        </div>
        <ExportButton
          data={dailySalesData}
          columns={DAILY_SALES_EXPORT_COLUMNS}
          filename={() => `ventas_diarias_${period}_${currentDateStr}`}
          sheetName="Ventas Diarias"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-black text-text-light/40 uppercase tracking-wider">
              <th scope="col" className="py-3 px-3">
                Fecha
              </th>
              <th scope="col" className="py-3 px-3">
                Día
              </th>
              <th scope="col" className="py-3 px-3 text-right">
                Ventas
              </th>
              <th scope="col" className="py-3 px-3 text-right">
                Órdenes
              </th>
              <th scope="col" className="py-3 px-3 text-right">
                Ticket Prom.
              </th>
              <th scope="col" className="py-3 px-3">
                Producto Estrella
              </th>
              <th scope="col" className="py-3 px-3 text-right">
                % Total
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {dailySalesData.map((row) => (
              <tr key={row.date} className="hover:bg-white/5 transition-colors">
                <td className="py-3.5 px-3 font-mono text-xs font-bold text-text-light">
                  {row.date}
                </td>
                <td className="py-3.5 px-3 text-xs font-bold text-text-light/80 uppercase">
                  {row.dayOfWeek}
                </td>
                <td className="py-3.5 px-3 text-right font-black text-emerald-400">
                  ${row.totalSales.toFixed(2)}
                </td>
                <td className="py-3.5 px-3 text-right font-bold text-text-light">
                  {row.totalOrders}
                </td>
                <td className="py-3.5 px-3 text-right font-medium text-text-light/70">
                  ${row.averageTicket.toFixed(2)}
                </td>
                <td className="py-3.5 px-3 text-xs font-medium text-amber-400">
                  {row.topProduct}
                </td>
                <td className="py-3.5 px-3 text-right font-mono text-xs font-black text-text-light/60">
                  {row.percentageOfPeriod.toFixed(1)}%
                </td>
              </tr>
            ))}
            {dailySalesData.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="py-8 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest"
                >
                  No hay ventas registradas en el período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
