"use client";

import React, { useState } from "react";
import { Award, BarChart3, Sparkles } from "lucide-react";
import type { WeekdaySalesRow } from "@/lib/services/performanceAnalytics";

export type WeekdayMetric = "total" | "average";

export interface WeekdaySalesChartProps {
  data: WeekdaySalesRow[];
}

export function WeekdaySalesChart({ data }: WeekdaySalesChartProps) {
  const [metric, setMetric] = useState<WeekdayMetric>("average");
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const isAvg = metric === "average";

  const svgWidth = 600;
  const svgHeight = 260;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const values = data.map((d) => (isAvg ? d.averageSales : d.totalSales));
  const rawMax = Math.max(...values, 0);
  const maxVal = rawMax > 0 ? Math.ceil(rawMax * 1.15) : 100;
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  const bestDay = data.find((d) => d.isBestDay);

  return (
    <section className="rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-border flex flex-col justify-between">
      <div>
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-black text-text-light tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-amber-500"></span>
              Ventas por Día de la Semana
            </h2>
            <p className="text-xs text-text-light/60 mt-1 font-medium">
              Identifica los días de mayor impacto comercial.
            </p>
          </div>

          {/* Metric Toggle */}
          <div className="flex items-center gap-1 bg-dark/60 p-1 rounded-xl border border-border self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setMetric("average")}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
                isAvg
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "text-text-light/60 hover:text-white"
              }`}
            >
              Promedio / Día
            </button>
            <button
              type="button"
              onClick={() => setMetric("total")}
              className={`px-3 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
                !isAvg
                  ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
                  : "text-text-light/60 hover:text-white"
              }`}
            >
              Total Facturado
            </button>
          </div>
        </div>

        {bestDay && bestDay.totalSales > 0 && (
          <div className="mb-4 inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3 py-1.5 text-xs font-bold text-amber-400">
            <Sparkles className="h-3.5 w-3.5" />
            Día más fuerte: <span className="text-white font-black">{bestDay.name}</span> (
            {isAvg
              ? `$${bestDay.averageSales.toLocaleString("es-MX", { minimumFractionDigits: 2 })} prom.`
              : `$${bestDay.totalSales.toLocaleString("es-MX", { minimumFractionDigits: 2 })} total`}
            )
          </div>
        )}

        {data.length > 0 && rawMax > 0 ? (
          <div
            className="relative h-64 w-full select-none"
            data-testid="weekday-sales-chart"
          >
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="h-full w-full overflow-visible"
              preserveAspectRatio="none"
            >
              {/* Gridlines */}
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
                      fontSize="10"
                      fontWeight="700"
                    >
                      ${Math.round(tick).toLocaleString()}
                    </text>
                  </g>
                );
              })}

              {/* Bars */}
              {data.map((day, index) => {
                const val = isAvg ? day.averageSales : day.totalSales;
                const slotWidth = innerWidth / data.length;
                const barWidth = Math.min(Math.max(slotWidth * 0.55, 16), 44);
                const xCenter = paddingLeft + (index + 0.5) * slotWidth;
                const barX = xCenter - barWidth / 2;
                const barHeight = Math.max((val / maxVal) * innerHeight, 3);
                const barY = paddingTop + innerHeight - barHeight;
                const isHovered = hoveredIndex === index;

                const fillColor = day.isBestDay
                  ? isHovered
                    ? "#FBBF24"
                    : "#F59E0B"
                  : isHovered
                    ? "#60A5FA"
                    : "#3B82F6";

                return (
                  <g
                    key={day.dayIndex}
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredIndex(index)}
                    onMouseLeave={() => setHoveredIndex(null)}
                  >
                    <rect
                      x={barX}
                      y={barY}
                      width={barWidth}
                      height={barHeight}
                      rx={6}
                      fill={fillColor}
                      className="transition-all duration-150"
                    />

                    {/* Best day star badge */}
                    {day.isBestDay && (
                      <circle
                        cx={xCenter}
                        cy={barY - 8}
                        r={3.5}
                        fill="#F59E0B"
                      />
                    )}

                    {/* X Axis Label */}
                    <text
                      x={xCenter}
                      y={svgHeight - 14}
                      textAnchor="middle"
                      fill={day.isBestDay ? "#F59E0B" : isHovered ? "#FFFFFF" : "#888888"}
                      fontSize="11"
                      fontWeight={day.isBestDay ? "900" : "700"}
                    >
                      {day.shortName}
                    </text>
                  </g>
                );
              })}
            </svg>

            {/* Tooltip */}
            {hoveredIndex !== null && data[hoveredIndex] && (
              <div
                style={{
                  left: `${
                    ((paddingLeft +
                      (hoveredIndex + 0.5) * (innerWidth / data.length)) /
                      svgWidth) *
                    100
                  }%`,
                  top: "12%",
                }}
                className="absolute pointer-events-none -translate-x-1/2 z-20 rounded-2xl border border-border bg-dark/95 p-3.5 shadow-2xl backdrop-blur-md whitespace-nowrap"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border pb-1 mb-2">
                  <span className="text-xs font-black text-white">
                    {data[hoveredIndex].name}
                  </span>
                  {data[hoveredIndex].isBestDay && (
                    <span className="text-[10px] font-black uppercase text-amber-400 bg-amber-500/20 px-1.5 py-0.5 rounded">
                      Mejor Día ⚡
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-[11px] text-text-light font-medium">
                  <div className="flex justify-between gap-4">
                    <span>Promedio / día:</span>
                    <span className="font-black text-white">
                      ${data[hoveredIndex].averageSales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Total acumulado:</span>
                    <span className="font-bold text-text-light/80">
                      ${data[hoveredIndex].totalSales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Pedidos:</span>
                    <span className="font-bold text-white">
                      {data[hoveredIndex].totalOrders}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>Ticket promedio:</span>
                    <span className="font-bold text-emerald-400">
                      ${data[hoveredIndex].averageTicket.toFixed(2)}
                    </span>
                  </div>
                  <div className="flex justify-between gap-4">
                    <span>% de la semana:</span>
                    <span className="font-bold text-amber-400">
                      {data[hoveredIndex].percentageOfSales}%
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="py-16 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest">
            Sin ventas registradas en el período.
          </p>
        )}
      </div>
    </section>
  );
}
