"use client";

import React, { useMemo } from "react";
import { Clock } from "lucide-react";
import { ExportButton } from "@/components/ui/DataTableControls";
import {
  formatHourRangeLabel,
  HOURLY_SALES_EXPORT_COLUMNS,
  type HourlyAggregationMode,
  type HourlySalesRow,
  transformHourlyRowsToExportItems,
} from "@/lib/services/hourlyAnalytics";

interface HourlyBreakdownTableProps {
  rows: HourlySalesRow[];
  mode?: HourlyAggregationMode;
  periodLabel?: string;
}

export function HourlyBreakdownTable({
  rows,
  mode = "sum",
  periodLabel = "reporte",
}: HourlyBreakdownTableProps) {
  const isAvg = mode === "average";

  const exportData = useMemo(() => {
    return transformHourlyRowsToExportItems(rows);
  }, [rows]);

  if (!rows || rows.length === 0) {
    return (
      <div
        data-testid="hourly-table-empty"
        className="rounded-2xl bg-card border border-border p-8 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest"
      >
        No hay registros disponibles para la tabla de horas
      </div>
    );
  }

  return (
    <div
      data-testid="hourly-breakdown-table"
      className="rounded-2xl bg-card border border-border p-6 shadow-sm overflow-hidden"
    >
      {/* Table Header Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Clock className="h-5 w-5 text-primary" />
            Desglose Detallado por Hora
          </h3>
          <p className="text-xs text-text-light/60 mt-0.5">
            Analiza el comportamiento numérico horario y exporta a formato CSV
            o Excel.
          </p>
        </div>

        <div>
          <ExportButton
            data={exportData}
            columns={HOURLY_SALES_EXPORT_COLUMNS}
            filename={`ventas-por-hora-${periodLabel.toLowerCase().replace(/\s+/g, "-")}`}
          />
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto -mx-6">
        <table className="w-full text-left text-sm">
          <thead className="bg-dark/60 text-xs font-black uppercase tracking-wider text-text-light/60 border-y border-border">
            <tr>
              <th className="py-3 px-6">Rango Horario</th>
              <th className="py-3 px-6 text-right">
                {isAvg ? "Venta Prom./Día" : "Venta Total"}
              </th>
              <th className="py-3 px-6 text-right">% Facturación</th>
              <th className="py-3 px-6 text-right">
                {isAvg ? "Pedidos/Día" : "Pedidos"}
              </th>
              <th className="py-3 px-6 text-right">Ticket Promedio</th>
              <th className="py-3 px-6 text-center">Estado / Indicador</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/50 font-medium">
            {rows.map((row) => {
              // Row highlight if peak
              const isPeak = row.isPeakSales || row.isPeakOrders;
              const rowClass = isPeak
                ? "bg-amber-500/5 hover:bg-amber-500/10"
                : "hover:bg-white/2";

              return (
                <tr
                  key={`table-row-${row.hour}`}
                  data-testid={`hourly-table-row-${row.hour}`}
                  className={`transition-colors ${rowClass}`}
                >
                  <td className="py-3.5 px-6 font-bold text-white flex items-center gap-2">
                    <span className="text-xs text-text-light/60">
                      {String(row.hour).padStart(2, "0")}:00
                    </span>
                    <span>{formatHourRangeLabel(row.hour)}</span>
                  </td>

                  <td className="py-3.5 px-6 text-right font-black text-white">
                    ${row.sales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                  </td>

                  <td className="py-3.5 px-6 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <div className="w-16 bg-white/10 rounded-full h-1.5 overflow-hidden hidden sm:block">
                        <div
                          className="bg-amber-400 h-full rounded-full"
                          style={{
                            width: `${Math.min(100, Math.max(0, row.percentageOfSales))}%`,
                          }}
                        />
                      </div>
                      <span className="font-bold text-text-light/80 text-xs w-10">
                        {row.percentageOfSales.toFixed(1)}%
                      </span>
                    </div>
                  </td>

                  <td className="py-3.5 px-6 text-right font-bold text-text-light">
                    {row.orders}
                  </td>

                  <td className="py-3.5 px-6 text-right font-semibold text-text-light/90">
                    ${row.averageTicket.toFixed(2)}
                  </td>

                  <td className="py-3.5 px-6 text-center">
                    {row.isPeakSales && row.isPeakOrders ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-300 border border-amber-500/30">
                        Pico Ventas & Pedidos 🔥⚡
                      </span>
                    ) : row.isPeakSales ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Pico de Ventas ⚡
                      </span>
                    ) : row.isPeakOrders ? (
                      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-black bg-orange-500/20 text-orange-400 border border-orange-500/30">
                        Pico de Pedidos 🔥
                      </span>
                    ) : row.isHighActivity ? (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-bold bg-sky-500/15 text-sky-400 border border-sky-500/25">
                        Alta Actividad
                      </span>
                    ) : row.rawOrders > 0 ? (
                      <span className="text-[11px] font-medium text-text-light/60">
                        Normal
                      </span>
                    ) : (
                      <span className="text-[11px] font-medium text-text-light/30">
                        Sin Actividad
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
