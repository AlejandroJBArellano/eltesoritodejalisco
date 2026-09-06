"use client";

import React, { useState } from "react";
import type { DailyTicketRow } from "@/lib/services/performanceAnalytics";

export interface AverageTicketTrendChartProps {
  data: DailyTicketRow[];
  periodAverageTicket: number;
}

export function AverageTicketTrendChart({
  data,
  periodAverageTicket,
}: AverageTicketTrendChartProps) {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const svgWidth = 900;
  const svgHeight = 280;
  const paddingLeft = 65;
  const paddingRight = 25;
  const paddingTop = 30;
  const paddingBottom = 40;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const maxDataVal = Math.max(...data.map((d) => d.averageTicket), 0);
  const rawMax = Math.max(maxDataVal, periodAverageTicket);
  const maxVal = rawMax > 0 ? Math.ceil(rawMax * 1.2) : 100;
  const yTicks = [0, maxVal * 0.25, maxVal * 0.5, maxVal * 0.75, maxVal];

  // Calculate points
  const count = data.length;
  const points = data.map((item, i) => {
    const x =
      count === 1
        ? paddingLeft + innerWidth / 2
        : paddingLeft + (i / (count - 1)) * innerWidth;
    const y = paddingTop + innerHeight - (item.averageTicket / maxVal) * innerHeight;
    return { x, y, item, index: i };
  });

  const linePathD = points.length
    ? points.map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(" ")
    : "";

  const areaPathD = points.length
    ? `${linePathD} L ${points[points.length - 1].x.toFixed(1)} ${(paddingTop + innerHeight).toFixed(1)} L ${points[0].x.toFixed(1)} ${(paddingTop + innerHeight).toFixed(1)} Z`
    : "";

  const refY =
    periodAverageTicket > 0
      ? paddingTop + innerHeight - (periodAverageTicket / maxVal) * innerHeight
      : null;

  return (
    <section className="rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-border">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-emerald-500"></span>
            Evolución del Ticket Promedio
          </h2>
          <p className="text-xs text-text-light/60 mt-1 font-medium">
            Comportamiento del gasto medio por orden en el tiempo vs el promedio del período.
          </p>
        </div>
        {periodAverageTicket > 0 && (
          <div className="inline-flex items-center gap-2 rounded-xl bg-dark/60 border border-emerald-500/30 px-3 py-1.5 text-xs font-bold text-emerald-400 self-start sm:self-auto">
            <span className="h-2 w-2 rounded-full bg-emerald-400"></span>
            Promedio Período: ${periodAverageTicket.toFixed(2)}
          </div>
        )}
      </div>

      {data.length > 0 ? (
        <div
          className="relative h-72 w-full select-none"
          data-testid="average-ticket-trend-chart"
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
          >
            <defs>
              <linearGradient id="ticketAreaGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#10B981" stopOpacity="0.35" />
                <stop offset="100%" stopColor="#10B981" stopOpacity="0.0" />
              </linearGradient>
            </defs>

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

            {/* Reference Line for Period Average */}
            {refY !== null && refY >= paddingTop && refY <= paddingTop + innerHeight && (
              <g>
                <line
                  x1={paddingLeft}
                  y1={refY}
                  x2={svgWidth - paddingRight}
                  y2={refY}
                  stroke="#10B981"
                  strokeWidth="1.5"
                  strokeDasharray="5 4"
                  strokeOpacity="0.8"
                />
                <text
                  x={svgWidth - paddingRight}
                  y={refY - 6}
                  textAnchor="end"
                  fill="#10B981"
                  fontSize="10"
                  fontWeight="800"
                >
                  Promedio: ${periodAverageTicket.toFixed(2)}
                </text>
              </g>
            )}

            {/* Area fill */}
            {areaPathD && (
              <path
                d={areaPathD}
                fill="url(#ticketAreaGradient)"
                className="transition-all duration-300"
              />
            )}

            {/* Main Trend Line */}
            {linePathD && (
              <path
                d={linePathD}
                fill="none"
                stroke="#10B981"
                strokeWidth="3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Data points & X labels */}
            {points.map((p) => {
              const isHovered = hoveredIndex === p.index;
              return (
                <g
                  key={p.item.date}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredIndex(p.index)}
                  onMouseLeave={() => setHoveredIndex(null)}
                >
                  <circle
                    cx={p.x}
                    cy={p.y}
                    r={isHovered ? 7 : 4.5}
                    fill={isHovered ? "#34D399" : "#10B981"}
                    stroke="#0f172a"
                    strokeWidth={2}
                    className="transition-all duration-150"
                  />
                  {/* Invisible hit area */}
                  <circle cx={p.x} cy={p.y} r={18} fill="transparent" />

                  {/* X Axis Label */}
                  <text
                    x={p.x}
                    y={svgHeight - 12}
                    textAnchor="middle"
                    fill={isHovered ? "#34D399" : "#888888"}
                    fontSize="11"
                    fontWeight={isHovered ? "900" : "700"}
                  >
                    {p.item.label}
                  </text>
                </g>
              );
            })}
          </svg>

          {/* Floating Tooltip */}
          {hoveredIndex !== null && points[hoveredIndex] && (
            <div
              style={{
                left: `${(points[hoveredIndex].x / svgWidth) * 100}%`,
                top: `${Math.max(10, (points[hoveredIndex].y / svgHeight) * 100 - 28)}%`,
              }}
              className="absolute pointer-events-none -translate-x-1/2 -translate-y-full z-20 rounded-2xl border border-border bg-dark/95 p-3.5 shadow-2xl backdrop-blur-md whitespace-nowrap"
            >
              <div className="flex items-center justify-between gap-3 border-b border-border pb-1.5 mb-1.5">
                <span className="text-xs font-black text-white">
                  ${points[hoveredIndex].item.averageTicket.toFixed(2)}
                </span>
                <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">
                  Ticket Promedio
                </span>
              </div>
              <p className="text-[11px] text-text-light font-medium">
                {points[hoveredIndex].item.label}
              </p>
              <div className="mt-1 flex gap-4 text-[10px] text-text-light/70 font-semibold">
                <span>Ventas: ${points[hoveredIndex].item.sales.toLocaleString("es-MX")}</span>
                <span>Pedidos: {points[hoveredIndex].item.orders}</span>
              </div>
            </div>
          )}
        </div>
      ) : (
        <p className="py-16 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest">
          No hay órdenes registradas en el período seleccionado.
        </p>
      )}
    </section>
  );
}
