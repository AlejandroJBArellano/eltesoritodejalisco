"use client";

import React, { useState } from "react";
import { DollarSign, Flame, ShoppingBag } from "lucide-react";
import type {
  HourlyAggregationMode,
  HourlySalesRow,
} from "@/lib/services/hourlyAnalytics";
import { formatHourRangeLabel } from "@/lib/services/hourlyAnalytics";

export type ChartMetric = "sales" | "orders";

interface HourlySalesBarChartProps {
  data: HourlySalesRow[];
  metric?: ChartMetric;
  onMetricChange?: (metric: ChartMetric) => void;
  mode?: HourlyAggregationMode;
}

export function HourlyBarChartTooltip({
  active,
  payload,
  isAvg = false,
  metric = "sales",
}: {
  active?: boolean;
  payload?: readonly { payload?: HourlySalesRow }[];
  isAvg?: boolean;
  metric?: ChartMetric;
}) {
  if (!active || !payload || !payload.length || !payload[0].payload) return null;
  const row = payload[0].payload;
  return (
    <div
      data-testid="hourly-chart-tooltip"
      className="rounded-xl border border-border bg-dark/95 p-3.5 shadow-2xl backdrop-blur-md text-xs whitespace-nowrap z-30"
    >
      <div className="font-black text-white text-sm mb-2 flex items-center justify-between gap-3 border-b border-border pb-1.5">
        <span>{formatHourRangeLabel(row.hour)}</span>
        {row.isPeakSales && metric === "sales" && (
          <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
            Pico ⚡
          </span>
        )}
        {row.isPeakOrders && metric === "orders" && (
          <span className="text-[10px] font-black uppercase text-orange-400 bg-orange-500/20 px-1.5 py-0.5 rounded border border-orange-500/30">
            Pico 🔥
          </span>
        )}
      </div>
      <div className="space-y-1">
        <div className="flex justify-between gap-4 text-text-light">
          <span>Ventas:</span>
          <span className="font-black text-white">
            ${row.sales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            {isAvg ? " / día" : ""}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-text-light">
          <span>Pedidos:</span>
          <span className="font-black text-white">
            {row.orders} {isAvg ? " / día" : ""}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-text-light">
          <span>% del Período:</span>
          <span className="font-black text-amber-400">
            {metric === "sales"
              ? `${row.percentageOfSales}%`
              : `${row.percentageOfOrders}%`}
          </span>
        </div>
        <div className="flex justify-between gap-4 text-text-light">
          <span>Ticket Promedio:</span>
          <span className="font-bold text-white">
            ${row.averageTicket.toFixed(2)}
          </span>
        </div>
      </div>
    </div>
  );
}

export function HourlySalesBarChart({
  data,
  metric: controlledMetric,
  onMetricChange,
  mode = "sum",
}: HourlySalesBarChartProps) {
  const [internalMetric, setInternalMetric] = useState<ChartMetric>("sales");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const metric = controlledMetric ?? internalMetric;

  const handleMetricChange = (m: ChartMetric) => {
    if (onMetricChange) {
      onMetricChange(m);
    } else {
      setInternalMetric(m);
    }
  };

  const isAvg = mode === "average";

  if (!data || data.length === 0) {
    return (
      <div
        data-testid="hourly-bar-chart-empty"
        className="rounded-2xl bg-card border border-border p-8 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest"
      >
        No hay datos de ventas por hora para este período
      </div>
    );
  }

  // SVG Chart Dimensions
  const svgWidth = 960;
  const svgHeight = 280;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 40;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const rawMax = Math.max(...data.map((d) => d[metric] || 0), 0);
  const maxVal = rawMax > 0 ? Math.ceil(rawMax * 1.15) : 10;
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  return (
    <div
      data-testid="hourly-bar-chart"
      className="rounded-2xl bg-card border border-border p-6 shadow-sm"
    >
      {/* Header with Title and Metric Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-black text-white flex items-center gap-2">
            <Flame className="h-5 w-5 text-amber-400" />
            Flujo por Hora del Día
          </h3>
          <p className="text-xs text-text-light/60 mt-0.5">
            {isAvg
              ? "Promedio diario por hora durante el período seleccionado."
              : "Acumulado total por hora durante el período seleccionado."}
          </p>
        </div>

        {/* Metric Selector Toggle */}
        <div className="flex items-center bg-dark/60 p-1 rounded-xl border border-border self-start sm:self-auto">
          <button
            type="button"
            data-testid="metric-btn-sales"
            onClick={() => handleMetricChange("sales")}
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
            data-testid="metric-btn-orders"
            onClick={() => handleMetricChange("orders")}
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

      {/* Responsive Native SVG Canvas */}
      <div className="relative h-80 w-full select-none">
        <svg
          viewBox={`0 0 ${svgWidth} ${svgHeight}`}
          className="h-full w-full overflow-visible"
          preserveAspectRatio="none"
        >
          {/* Y-Axis Gridlines & Labels */}
          {yTicks.map((tick, i) => {
            const y = paddingTop + innerHeight - (tick / maxVal) * innerHeight;
            return (
              <g key={`ytick-${i}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={svgWidth - paddingRight}
                  y2={y}
                  stroke="rgba(255,255,255,0.06)"
                  strokeDasharray="3 3"
                />
                <text
                  x={paddingLeft - 8}
                  y={y + 4}
                  textAnchor="end"
                  fill="#888888"
                  fontSize="11"
                  fontWeight="700"
                >
                  {metric === "sales"
                    ? `$${Math.round(tick).toLocaleString()}`
                    : Math.round(tick)}
                </text>
              </g>
            );
          })}

          {/* Bars */}
          {data.map((entry, index) => {
            const slotWidth = innerWidth / data.length;
            const barWidth = Math.min(Math.max(slotWidth * 0.7, 8), 34);
            const xCenter = paddingLeft + (index + 0.5) * slotWidth;
            const barX = xCenter - barWidth / 2;
            const barHeight = Math.max(
              ((entry[metric] || 0) / maxVal) * innerHeight,
              2,
            );
            const barY = paddingTop + innerHeight - barHeight;

            let fill = "#3B82F6";
            if (metric === "sales") {
              if (entry.isPeakSales) fill = "#F59E0B";
              else if (entry.isHighActivity) fill = "#38BDF8";
              else fill = "#2563EB";
            } else {
              if (entry.isPeakOrders) fill = "#EA580C";
              else if (entry.isHighActivity) fill = "#A855F7";
              else fill = "#6366F1";
            }

            return (
              <g
                key={`bar-${entry.hour}`}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIndex(index)}
                onMouseLeave={() => setHoveredIndex(null)}
              >
                <rect
                  x={barX}
                  y={barY}
                  width={barWidth}
                  height={barHeight}
                  rx={4}
                  fill={fill}
                  className="transition-all duration-150 hover:brightness-110"
                />
                <text
                  x={xCenter}
                  y={svgHeight - 12}
                  textAnchor="middle"
                  fill="#888888"
                  fontSize="10"
                  fontWeight="700"
                >
                  {entry.displayHour || entry.hourLabel}
                </text>
              </g>
            );
          })}
        </svg>

        {/* Floating Tooltip */}
        {hoveredIndex !== null && data[hoveredIndex] && (
          <div
            style={{
              left: `${
                ((paddingLeft +
                  (hoveredIndex + 0.5) * (innerWidth / data.length)) /
                  svgWidth) *
                100
              }%`,
              top: "10%",
            }}
            className="absolute pointer-events-none -translate-x-1/2"
          >
            <HourlyBarChartTooltip
              active={true}
              payload={[{ payload: data[hoveredIndex] }]}
              isAvg={isAvg}
              metric={metric}
            />
          </div>
        )}
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-text-light/70 border-t border-border pt-4">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{
              backgroundColor: metric === "sales" ? "#F59E0B" : "#EA580C",
            }}
          />
          <span>
            Hora Pico {metric === "sales" ? "de Ventas" : "de Pedidos"}
          </span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{
              backgroundColor: metric === "sales" ? "#38BDF8" : "#A855F7",
            }}
          />
          <span>Alta Actividad</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{
              backgroundColor: metric === "sales" ? "#2563EB" : "#6366F1",
            }}
          />
          <span>Flujo Estándar</span>
        </div>
      </div>
    </div>
  );
}
