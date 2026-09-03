"use client";

import React from "react";
import { BarChart3, X } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  XAxis,
  YAxis,
} from "recharts";

export interface DayChartItem {
  date: string;
  total: number;
  label: string;
}

export interface DayDetailItem {
  name: string;
  quantity: number;
  revenue: number;
}

export interface SalesTrendChartProps {
  chartData: DayChartItem[];
  selectedDay: string | null;
  onSelectDay: (date: string | null) => void;
  selectedDayItems: DayDetailItem[];
}

export function SalesTrendChart({
  chartData,
  selectedDay,
  onSelectDay,
  selectedDayItems,
}: SalesTrendChartProps) {
  return (
    <section className="rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-border">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-blue-500"></span>
            Evolución Diaria de Ventas
          </h2>
          <p className="text-xs text-text-light/60 mt-1 font-medium">
            Tendencia de facturación día a día. Haz clic en cualquier barra para ver el drill-down de productos vendidos ese día.
          </p>
        </div>
        {selectedDay && (
          <button
            type="button"
            onClick={() => onSelectDay(null)}
            className="inline-flex items-center gap-1.5 rounded-xl bg-dark/60 border border-amber-500/40 px-3 py-1.5 text-xs font-bold text-amber-400 hover:bg-amber-500/10 transition-all active:scale-95 self-start sm:self-auto"
          >
            <X className="h-3.5 w-3.5" />
            Limpiar Selección ({selectedDay})
          </button>
        )}
      </div>

      {chartData.length > 0 ? (
        <div className="h-72 w-full" data-testid="sales-trend-barchart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                vertical={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                dataKey="label"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#888888", fontSize: 11, fontWeight: 700 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#888888", fontSize: 11, fontWeight: 700 }}
                tickFormatter={(value) => `$${value}`}
              />
              <RechartsTooltip
                contentStyle={{
                  backgroundColor: "#18181B",
                  borderColor: "#27272A",
                  borderRadius: "1rem",
                  color: "#FFFFFF",
                  fontSize: "12px",
                  fontWeight: 700,
                  boxShadow: "0 10px 15px -3px rgba(0,0,0,0.5)",
                }}
                formatter={(value: unknown) => [
                  `$${Number(value ?? 0).toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                  })}`,
                  "Ventas Totales",
                ]}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar
                dataKey="total"
                radius={[6, 6, 0, 0]}
                style={{ cursor: "pointer" }}
                onClick={(barData) => {
                  const date = (barData?.payload as { date?: string })?.date;
                  if (date) {
                    onSelectDay(selectedDay === date ? null : date);
                  }
                }}
              >
                {chartData.map((entry) => (
                  <Cell
                    key={entry.date}
                    fill={selectedDay === entry.date ? "#F59E0B" : "#3B82F6"}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-16 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest">
          No hay registros de ventas en el período seleccionado.
        </p>
      )}

      {/* Day Drill-Down Panel */}
      {selectedDay && (
        <div className="mt-6 rounded-2xl bg-dark/40 border border-amber-500/30 p-6">
          <h3 className="text-sm font-black text-amber-400 mb-4 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-4 w-4" /> Top Productos —{" "}
            {new Date(`${selectedDay}T12:00:00-06:00`).toLocaleDateString(
              "es-MX",
              {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
                timeZone: "America/Mexico_City",
              },
            )}
          </h3>
          {selectedDayItems.length > 0 ? (
            <div className="space-y-3">
              {selectedDayItems.map((item, i) => (
                <div
                  key={i}
                  className="flex items-center justify-between py-2 border-b border-border last:border-0"
                >
                  <div className="flex items-center gap-3">
                    <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-amber-500/20 text-xs font-black text-amber-400">
                      #{i + 1}
                    </span>
                    <span className="text-sm font-bold text-text-light">
                      {item.name}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-sm font-black text-text-light">
                      {item.quantity} vendidos
                    </span>
                    <span className="ml-3 text-xs font-semibold text-emerald-400">
                      ${item.revenue.toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-text-light/50 font-medium">
              No hay detalle de productos registrado para esta fecha.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
