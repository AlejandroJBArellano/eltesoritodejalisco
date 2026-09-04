"use client";

import React, { useState } from "react";
import { BarChart3, X } from "lucide-react";

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
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  // SVG Chart Dimensions & Calculations
  const svgWidth = 900;
  const svgHeight = 280;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const rawMax = Math.max(...chartData.map((d) => d.total), 0);
  const maxVal = rawMax > 0 ? Math.ceil(rawMax * 1.15) : 100;
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

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
        <div
          className="relative h-72 w-full select-none"
          data-testid="sales-trend-barchart"
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
          >
            {/* Gridlines and Y-axis labels */}
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
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    fill="#888888"
                    fontSize="11"
                    fontWeight="700"
                  >
                    ${Math.round(tick).toLocaleString()}
                  </text>
                </g>
              );
            })}

            {/* Bars */}
            {chartData.map((entry, index) => {
              const count = chartData.length;
              const slotWidth = innerWidth / count;
              const barWidth = Math.min(Math.max(slotWidth * 0.6, 12), 48);
              const xCenter = paddingLeft + (index + 0.5) * slotWidth;
              const barX = xCenter - barWidth / 2;
              const barHeight = Math.max((entry.total / maxVal) * innerHeight, 2);
              const barY = paddingTop + innerHeight - barHeight;
              const isSelected = selectedDay === entry.date;
              const isHovered = hoveredIndex === index;

              const fillColor = isSelected
                ? "#F59E0B"
                : isHovered
                  ? "#60A5FA"
                  : "#3B82F6";

              return (
                <g
                  key={entry.date}
                  className="cursor-pointer transition-opacity"
                  onClick={() =>
                    onSelectDay(isSelected ? null : entry.date)
                  }
                  onMouseEnter={() => setHoveredIndex(index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <rect
                    x={barX}
                    y={barY}
                    width={barWidth}
                    height={barHeight}
                    rx={5}
                    fill={fillColor}
                    className="transition-all duration-150"
                  />
                  {/* X-axis Label */}
                  <text
                    x={xCenter}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fill={isSelected ? "#F59E0B" : "#888888"}
                    fontSize="11"
                    fontWeight={isSelected ? "900" : "700"}
                  >
                    {entry.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Floating Native Tooltip */}
          {hoveredIndex !== null && chartData[hoveredIndex] && (
            <div
              style={{
                left: `${
                  ((paddingLeft +
                    (hoveredIndex + 0.5) *
                      (innerWidth / chartData.length)) /
                    svgWidth) *
                  100
                }%`,
                top: "15%",
              }}
              className="absolute pointer-events-none -translate-x-1/2 z-20 rounded-2xl border border-border bg-dark/95 p-3 shadow-2xl backdrop-blur-md whitespace-nowrap"
            >
              <p className="text-xs font-black text-white">
                $
                {chartData[hoveredIndex].total.toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
              <p className="text-[10px] font-bold text-text-light/60 mt-0.5">
                Ventas Totales • {chartData[hoveredIndex].label}
              </p>
            </div>
          )}
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
