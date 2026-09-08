"use client";

import React, { useMemo, useState } from "react";
import { Calendar, DollarSign, ShoppingBag } from "lucide-react";
import {
  DAYS_OF_WEEK,
  formatHourLabel,
  type HeatmapCell,
  type HourlyAggregationMode,
} from "@/lib/services/hourlyAnalytics";

interface HourlySalesHeatmapProps {
  cells: HeatmapCell[];
  mode?: HourlyAggregationMode;
  initialMetric?: "sales" | "orders";
}

export function HourlySalesHeatmap({
  cells,
  mode = "sum",
  initialMetric = "sales",
}: HourlySalesHeatmapProps) {
  const [metric, setMetric] = useState<"sales" | "orders">(initialMetric);
  const [hoveredCell, setHoveredCell] = useState<HeatmapCell | null>(null);

  const isAvg = mode === "average";

  // Calculate max for the selected metric to calculate relative intensity
  const maxMetricValue = useMemo(() => {
    let max = 0;
    cells.forEach((c) => {
      const val = metric === "sales" ? c.sales : c.orders;
      if (val > max) max = val;
    });
    return max;
  }, [cells, metric]);

  // Group cells by dayIndex for quick row access
  const cellsByDay = useMemo(() => {
    const map = new Map<number, HeatmapCell[]>();
    for (let d = 0; d < 7; d++) {
      map.set(d, []);
    }
    cells.forEach((c) => {
      map.get(c.dayIndex)?.push(c);
    });
    // Sort each day by hour 0..23
    map.forEach((dayCells) => {
      dayCells.sort((a, b) => a.hour - b.hour);
    });
    return map;
  }, [cells]);

  if (!cells || cells.length === 0) {
    return (
      <div
        data-testid="hourly-heatmap-empty"
        className="rounded-2xl bg-card border border-border p-8 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest"
      >
        No hay datos suficientes para generar el mapa de calor semanal
      </div>
    );
  }

  const hoursHeader = Array.from({ length: 24 }, (_, i) => i);

  return (
    <div
      data-testid="hourly-heatmap"
      className="rounded-2xl bg-card border border-border p-6 shadow-sm"
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Calendar className="h-5 w-5 text-amber-400" />
            Mapa de Calor Semanal (Día vs Hora)
          </h3>
          <p className="text-xs text-text-light/60 mt-0.5">
            Detecta patrones de concurrencia y los momentos más activos por día
            de la semana.
          </p>
        </div>

        {/* Metric Selector */}
        <div className="flex items-center bg-dark/60 p-1 rounded-xl border border-border self-start sm:self-auto">
          <button
            type="button"
            data-testid="heatmap-metric-sales"
            onClick={() => setMetric("sales")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              metric === "sales"
                ? "bg-amber-500 text-black shadow-sm"
                : "text-text-light/60 hover:text-white"
            }`}
          >
            <DollarSign className="h-3.5 w-3.5" />
            Ventas ($)
          </button>
          <button
            type="button"
            data-testid="heatmap-metric-orders"
            onClick={() => setMetric("orders")}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-black transition-all ${
              metric === "orders"
                ? "bg-orange-500 text-white shadow-sm"
                : "text-text-light/60 hover:text-white"
            }`}
          >
            <ShoppingBag className="h-3.5 w-3.5" />
            Pedidos (#)
          </button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="overflow-x-auto pb-2 -mx-2 px-2">
        <div className="min-w-190">
          {/* Header Row: Hours */}
          <div className="flex items-center mb-2">
            <div className="w-12 shrink-0 text-xs font-bold text-text-light/40"></div>
            <div className="grid grid-cols-24 gap-1 flex-1">
              {hoursHeader.map((h) => (
                <div
                  key={`header-h-${h}`}
                  className="text-center text-[10px] font-bold text-text-light/50"
                >
                  {h % 2 === 0 ? `${h}h` : ""}
                </div>
              ))}
            </div>
          </div>

          {/* Days Rows */}
          <div className="space-y-1.5">
            {DAYS_OF_WEEK.map((day) => {
              const dayCells = cellsByDay.get(day.index) || [];

              return (
                <div
                  key={`day-row-${day.index}`}
                  className="flex items-center"
                >
                  <div className="w-12 shrink-0 text-xs font-bold text-text-light/70 pr-2">
                    {day.short}
                  </div>
                  <div className="grid grid-cols-24 gap-1 flex-1">
                    {dayCells.map((cell) => {
                      const val = metric === "sales" ? cell.sales : cell.orders;
                      const ratio =
                        maxMetricValue > 0 ? val / maxMetricValue : 0;

                      // Color interpolation based on ratio
                      let bgStyle: string;
                      let borderStyle = "border-transparent";

                      if (ratio === 0) {
                        bgStyle = "rgba(255, 255, 255, 0.03)";
                      } else if (ratio < 0.25) {
                        bgStyle = "rgba(245, 158, 11, 0.2)";
                      } else if (ratio < 0.5) {
                        bgStyle = "rgba(245, 158, 11, 0.45)";
                      } else if (ratio < 0.75) {
                        bgStyle = "rgba(245, 158, 11, 0.7)";
                      } else {
                        // Peak hot
                        bgStyle = "rgba(245, 158, 11, 0.95)";
                        borderStyle = "border-amber-300";
                      }

                      return (
                        <div
                          key={`cell-${day.index}-${cell.hour}`}
                          data-testid={`heatmap-cell-${day.index}-${cell.hour}`}
                          onMouseEnter={() => setHoveredCell(cell)}
                          onMouseLeave={() => setHoveredCell(null)}
                          style={{ backgroundColor: bgStyle }}
                          className={`h-7 rounded transition-transform hover:scale-110 cursor-pointer border ${borderStyle} flex items-center justify-center relative group`}
                          title={`${day.name} ${formatHourLabel(cell.hour)}: ${
                            metric === "sales"
                              ? `$${cell.sales.toFixed(2)}`
                              : `${cell.orders} pedidos`
                          }`}
                        >
                          {ratio >= 0.85 && (
                            <span className="text-[9px] font-black text-black select-none">
                              ⚡
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Hover Information Banner / Detail */}
      <div className="mt-4 pt-4 border-t border-border flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="text-xs text-text-light/70 h-6 flex items-center">
          {hoveredCell ? (
            <span className="flex items-center gap-2">
              <span className="font-black text-white">
                {hoveredCell.dayName} a las {hoveredCell.hourLabel}
              </span>
              <span>—</span>
              <span className="text-amber-400 font-bold">
                ${hoveredCell.sales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                {isAvg ? " / día" : ""}
              </span>
              <span>•</span>
              <span className="text-white font-bold">
                {hoveredCell.orders} pedidos {isAvg ? " / día" : ""}
              </span>
            </span>
          ) : (
            <span className="italic text-text-light/50">
              Pasa el cursor sobre cualquier celda para ver el detalle.
            </span>
          )}
        </div>

        {/* Heatmap Legend */}
        <div className="flex items-center gap-2 text-[11px] font-medium text-text-light/60 self-end sm:self-auto">
          <span>Bajo</span>
          <div className="flex gap-1 items-center">
            <span
              className="w-3.5 h-3.5 rounded-sm"
              style={{ backgroundColor: "rgba(255, 255, 255, 0.05)" }}
            />
            <span
              className="w-3.5 h-3.5 rounded-sm"
              style={{ backgroundColor: "rgba(245, 158, 11, 0.2)" }}
            />
            <span
              className="w-3.5 h-3.5 rounded-sm"
              style={{ backgroundColor: "rgba(245, 158, 11, 0.45)" }}
            />
            <span
              className="w-3.5 h-3.5 rounded-sm"
              style={{ backgroundColor: "rgba(245, 158, 11, 0.7)" }}
            />
            <span
              className="w-3.5 h-3.5 rounded-sm"
              style={{ backgroundColor: "rgba(245, 158, 11, 0.95)" }}
            />
          </div>
          <span>Pico ⚡</span>
        </div>
      </div>
    </div>
  );
}
