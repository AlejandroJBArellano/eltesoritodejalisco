"use client";

import React, { useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
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
      className="rounded-xl border border-border bg-dark/95 p-3.5 shadow-2xl backdrop-blur-md text-xs"
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

      {/* Chart Canvas */}
      <div className="h-80 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={data}
            margin={{ top: 10, right: 10, left: 10, bottom: 5 }}
          >
            <CartesianGrid
              strokeDasharray="3 3"
              stroke="var(--color-border)"
              vertical={false}
            />
            <XAxis
              dataKey="hourLabel"
              stroke="var(--color-text-light)"
              fontSize={12}
              tick={{ fill: "var(--color-text-light)" }}
            />
            <YAxis
              stroke="var(--color-text-light)"
              fontSize={12}
              tick={{ fill: "var(--color-text-light)" }}
              tickFormatter={(val) =>
                metric === "sales" ? `$${val}` : `${val}`
              }
            />
            <RechartsTooltip
              content={(props) => (
                <HourlyBarChartTooltip
                  {...props}
                  isAvg={isAvg}
                  metric={metric}
                />
              )}
            />
            <Bar
              dataKey={metric}
              radius={[6, 6, 0, 0]}
              animationDuration={800}
            >
              {data.map((entry) => {
                let fill = "#3B82F6"; // default blue
                if (metric === "sales") {
                  if (entry.isPeakSales) fill = "#F59E0B"; // gold/amber peak
                  else if (entry.isHighActivity) fill = "#38BDF8"; // sky blue
                  else fill = "#2563EB";
                } else {
                  if (entry.isPeakOrders) fill = "#EA580C"; // fiery orange peak
                  else if (entry.isHighActivity) fill = "#A855F7"; // purple
                  else fill = "#6366F1";
                }

                return <Cell key={`bar-${entry.hour}`} fill={fill} />;
              })}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Legend */}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-4 text-xs font-semibold text-text-light/70 border-t border-border pt-4">
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ backgroundColor: metric === "sales" ? "#F59E0B" : "#EA580C" }}
          />
          <span>Hora Pico {metric === "sales" ? "de Ventas" : "de Pedidos"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ backgroundColor: metric === "sales" ? "#38BDF8" : "#A855F7" }}
          />
          <span>Alta Actividad</span>
        </div>
        <div className="flex items-center gap-1.5">
          <span
            className="w-3 h-3 rounded-sm inline-block"
            style={{ backgroundColor: metric === "sales" ? "#2563EB" : "#6366F1" }}
          />
          <span>Flujo Estándar</span>
        </div>
      </div>
    </div>
  );
}
