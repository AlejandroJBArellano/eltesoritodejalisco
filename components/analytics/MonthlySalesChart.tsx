"use client";

import React, { useState } from "react";
import { ArrowDownRight, ArrowUpRight, Trophy } from "lucide-react";
import type { MonthlySalesRow } from "@/lib/services/performanceAnalytics";

export interface MonthlySalesChartProps {
  data: MonthlySalesRow[];
}

export function MonthlySalesChart({ data }: MonthlySalesChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const svgWidth = 600;
  const svgHeight = 260;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const rawMax = Math.max(...data.map((d) => d.totalSales), 0);
  const maxVal = rawMax > 0 ? Math.ceil(rawMax * 1.15) : 100;
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  const recordMonth = data.find((d) => d.isRecordMonth);

  return (
    <section className="rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-border flex flex-col justify-between">
      <div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-border pb-4">
          <div>
            <h2 className="text-base font-black text-text-light tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500"></span>
              Ventas Mensuales (Últimos 12 Meses)
            </h2>
            <p className="text-xs text-text-light/60 mt-1 font-medium">
              Evolución comercial histórica a largo plazo y variación intermensual.
            </p>
          </div>
          {recordMonth && recordMonth.totalSales > 0 && (
            <div className="inline-flex items-center gap-1.5 rounded-xl bg-purple-500/10 border border-purple-500/30 px-3 py-1.5 text-xs font-bold text-purple-400 self-start sm:self-auto">
              <Trophy className="h-3.5 w-3.5" />
              Mes Récord: <span className="text-white font-black">{recordMonth.monthName}</span>
            </div>
          )}
        </div>

        {data.length > 0 && rawMax > 0 ? (
          <div
            className="relative h-64 w-full select-none"
            data-testid="monthly-sales-chart"
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
              {data.map((m, index) => {
                const slotWidth = innerWidth / data.length;
                const barWidth = Math.min(Math.max(slotWidth * 0.55, 12), 34);
                const xCenter = paddingLeft + (index + 0.5) * slotWidth;
                const barX = xCenter - barWidth / 2;
                const barHeight = Math.max((m.totalSales / maxVal) * innerHeight, 3);
                const barY = paddingTop + innerHeight - barHeight;
                const isHovered = hoveredIndex === index;

                const fillColor = m.isRecordMonth
                  ? isHovered
                    ? "#C084FC"
                    : "#A855F7"
                  : isHovered
                    ? "#818CF8"
                    : "#6366F1";

                return (
                  <g
                    key={m.monthKey}
                    className="cursor-pointer"
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

                    {/* Record month indicator dot */}
                    {m.isRecordMonth && (
                      <circle
                        cx={xCenter}
                        cy={barY - 7}
                        r={3}
                        fill="#A855F7"
                      />
                    )}

                    {/* X Axis Label */}
                    <text
                      x={xCenter}
                      y={svgHeight - 14}
                      textAnchor="middle"
                      fill={m.isRecordMonth ? "#C084FC" : isHovered ? "#FFFFFF" : "#888888"}
                      fontSize="10"
                      fontWeight={m.isRecordMonth ? "900" : "700"}
                    >
                      {m.shortMonthName}
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
                  top: "12%",
                }}
                className="absolute pointer-events-none -translate-x-1/2 z-20 rounded-2xl border border-border bg-dark/95 p-3.5 shadow-2xl backdrop-blur-md whitespace-nowrap"
              >
                <div className="flex items-center justify-between gap-3 border-b border-border pb-1 mb-2">
                  <span className="text-xs font-black text-white">
                    {data[hoveredIndex].monthName}
                  </span>
                  {data[hoveredIndex].isRecordMonth && (
                    <span className="text-[10px] font-black uppercase text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">
                      Récord 🏆
                    </span>
                  )}
                </div>
                <div className="space-y-1 text-[11px] text-text-light font-medium">
                  <div className="flex justify-between gap-4">
                    <span>Ventas del mes:</span>
                    <span className="font-black text-white">
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
                  {data[hoveredIndex].growthPercentage !== null && (
                    <div className="flex justify-between items-center gap-4 pt-1 border-t border-border">
                      <span>Vs mes anterior:</span>
                      <span
                        className={`font-black flex items-center gap-0.5 ${
                          data[hoveredIndex].growthPercentage! >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        {data[hoveredIndex].growthPercentage! >= 0 ? (
                          <ArrowUpRight className="h-3 w-3" />
                        ) : (
                          <ArrowDownRight className="h-3 w-3" />
                        )}
                        {data[hoveredIndex].growthPercentage! > 0 ? "+" : ""}
                        {data[hoveredIndex].growthPercentage}%
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        ) : (
          <p className="py-16 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest">
            Sin historial de facturación en los últimos 12 meses.
          </p>
        )}
      </div>
    </section>
  );
}
