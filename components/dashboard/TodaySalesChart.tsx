"use client";

import React, { useState, useId } from "react";
import { TrendingUp, Clock, DollarSign, Activity } from "lucide-react";
import type { HourlySalesRow } from "@/lib/services/hourlyAnalytics";

export interface TodaySalesChartProps {
  hourlyRows: HourlySalesRow[];
  salesToday: number;
  ordersCount: number;
  tipsToday?: number;
}

export function TodaySalesChart({
  hourlyRows,
  salesToday,
  ordersCount,
  tipsToday = 0,
}: TodaySalesChartProps) {
  const gradientId = useId();
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const currencyFormatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  // Calculate Peak Hour
  const peakRow = hourlyRows.reduce<HourlySalesRow | null>((max, current) => {
    if (current.sales > 0 && (!max || current.sales > max.sales)) {
      return current;
    }
    return max;
  }, null);

  const averageTicket = ordersCount > 0 ? salesToday / ordersCount : 0;

  // Chart Dimensions
  const svgWidth = 960;
  const svgHeight = 240;
  const paddingLeft = 55;
  const paddingRight = 25;
  const paddingTop = 20;
  const paddingBottom = 35;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const maxVal = Math.max(...hourlyRows.map((r) => r.sales), 100);
  // Round to nice ceiling
  const yMax = Math.ceil(maxVal * 1.15);
  const yTicks = [0, yMax * 0.33, yMax * 0.66, yMax];

  // Generate Points for SVG
  const points = hourlyRows.map((row, index) => {
    const x =
      paddingLeft + (index / Math.max(1, hourlyRows.length - 1)) * innerWidth;
    const y = paddingTop + innerHeight - (row.sales / yMax) * innerHeight;
    return { x, y, row, index };
  });

  // Build SVG Path
  const linePath = points.reduce((acc, point, index) => {
    if (index === 0) return `M ${point.x} ${point.y}`;
    return `${acc} L ${point.x} ${point.y}`;
  }, "");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x} ${
          paddingTop + innerHeight
        } L ${points[0].x} ${paddingTop + innerHeight} Z`
      : "";

  const activePoint =
    hoveredIndex !== null && points[hoveredIndex] ? points[hoveredIndex] : null;

  return (
    <div
      data-testid="today-sales-chart"
      className="rounded-2xl bg-card border border-border/80 shadow-md p-5 sm:p-6 transition-all"
    >
      {/* Top Header Metric Bar */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-border/80 pb-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-[10px] font-black uppercase tracking-widest text-emerald-400">
              En Vivo
            </span>
            <span className="text-[10px] font-mono text-text-light/40">|</span>
            <span className="text-[10px] font-bold uppercase tracking-wider text-text-light/50">
              Ventas Intradía
            </span>
          </div>
          <div className="flex items-baseline gap-3">
            <h2 className="text-2xl sm:text-3xl font-black text-text-light tracking-tight">
              {currencyFormatter.format(salesToday)}
            </h2>
            {tipsToday > 0 && (
              <span className="text-xs font-semibold text-text-light/60">
                (+{currencyFormatter.format(tipsToday)} propinas)
              </span>
            )}
          </div>
        </div>

        {/* Quick KPI badges */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {peakRow && peakRow.sales > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400 text-xs font-semibold">
              <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
              <div className="flex flex-col">
                <span className="text-[9px] uppercase font-bold text-amber-400/80">
                  Hora Pico
                </span>
                <span className="text-xs font-black">
                  {peakRow.displayHour} (
                  {currencyFormatter.format(peakRow.sales)})
                </span>
              </div>
            </div>
          )}

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-primary/10 border border-primary/20 text-primary text-xs font-semibold">
            <DollarSign className="w-3.5 h-3.5 text-primary" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-primary/80">
                Ticket Promedio
              </span>
              <span className="text-xs font-black">
                {currencyFormatter.format(averageTicket)}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-dark/40 border border-border text-text-light/80 text-xs font-semibold">
            <Activity className="w-3.5 h-3.5 text-text-light/60" />
            <div className="flex flex-col">
              <span className="text-[9px] uppercase font-bold text-text-light/50">
                Órdenes
              </span>
              <span className="text-xs font-black text-text-light">
                {ordersCount}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* SVG Chart */}
      <div
        data-testid="today-sales-chart-body"
        className="relative pt-4 w-full select-none"
        onMouseLeave={() => setHoveredIndex(null)}
      >
        <div className="h-56 sm:h-64 w-full relative">
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="h-full w-full overflow-visible"
            preserveAspectRatio="none"
            onMouseLeave={() => setHoveredIndex(null)}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="0%"
                  stopColor="var(--color-primary, #FFB7CE)"
                  stopOpacity="0.35"
                />
                <stop
                  offset="100%"
                  stopColor="var(--color-primary, #FFB7CE)"
                  stopOpacity="0.0"
                />
              </linearGradient>
            </defs>

            {/* Y-Axis Gridlines */}
            {yTicks.map((tick, i) => {
              const y = paddingTop + innerHeight - (tick / yMax) * innerHeight;
              return (
                <g key={`ytick-${i}`}>
                  <line
                    x1={paddingLeft}
                    y1={y}
                    x2={svgWidth - paddingRight}
                    y2={y}
                    stroke="rgba(255,255,255,0.06)"
                    strokeDasharray="4 4"
                  />
                  <text
                    x={paddingLeft - 10}
                    y={y + 4}
                    textAnchor="end"
                    className="text-[10px] fill-text-light/40 font-mono"
                  >
                    $
                    {tick >= 1000
                      ? `${(tick / 1000).toFixed(1)}k`
                      : Math.round(tick)}
                  </text>
                </g>
              );
            })}

            {/* Area & Line */}
            {salesToday > 0 && areaPath && (
              <path d={areaPath} fill={`url(#${gradientId})`} />
            )}

            {salesToday > 0 && linePath && (
              <path
                d={linePath}
                fill="none"
                stroke="var(--color-primary, #FFB7CE)"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Interactive Vertical Line on Hover */}
            {activePoint && (
              <line
                x1={activePoint.x}
                y1={paddingTop}
                x2={activePoint.x}
                y2={paddingTop + innerHeight}
                stroke="var(--color-primary, #FFB7CE)"
                strokeWidth="1.5"
                strokeDasharray="2 2"
                className="opacity-80 pointer-events-none"
              />
            )}

            {/* Points on Curve */}
            {salesToday > 0 &&
              points.map((p) => {
                const isHovered = hoveredIndex === p.index;
                const hasSales = p.row.sales > 0;
                return (
                  <g key={`pt-${p.index}`}>
                    {hasSales && (
                      <circle
                        cx={p.x}
                        cy={p.y}
                        r={isHovered ? 5 : 2.5}
                        fill={
                          isHovered ? "#fff" : "var(--color-primary, #FFB7CE)"
                        }
                        stroke="var(--color-dark, #121212)"
                        strokeWidth={isHovered ? 2 : 1}
                        className="transition-all duration-150 pointer-events-none"
                      />
                    )}
                    {/* Broad invisible hover target */}
                    <rect
                      x={p.x - innerWidth / (hourlyRows.length * 2)}
                      y={paddingTop}
                      width={innerWidth / hourlyRows.length}
                      height={innerHeight}
                      fill="transparent"
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredIndex(p.index)}
                    />
                  </g>
                );
              })}

            {/* X-Axis Hour Labels */}
            {points.map((p, i) => {
              // Show label every 3 or 4 hours
              if (i % 3 !== 0 && i !== points.length - 1) return null;
              return (
                <text
                  key={`xlabel-${i}`}
                  x={p.x}
                  y={svgHeight - 10}
                  textAnchor="middle"
                  className="text-[10px] fill-text-light/40 font-mono"
                >
                  {p.row.displayHour}
                </text>
              );
            })}
          </svg>

          {/* Floating Tooltip Card */}
          {activePoint && (
            <div
              className="absolute z-20 pointer-events-none -translate-x-1/2 -translate-y-full bg-dark/95 border border-border shadow-xl rounded-xl px-3.5 py-2.5 text-xs backdrop-blur-md transition-all duration-75 min-w-36"
              style={{
                left: `${(activePoint.x / svgWidth) * 100}%`,
                top: `${(activePoint.y / svgHeight) * 100}%`,
                marginTop: "-12px",
              }}
            >
              <div className="flex items-center justify-between gap-2 border-b border-border/60 pb-1.5 mb-1.5">
                <span className="text-[10px] font-bold text-text-light/60 flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3 text-primary" />
                  {activePoint.row.hourLabel}
                </span>
                {activePoint.row.isPeakSales && (
                  <span className="text-[9px] font-black uppercase text-amber-400 bg-amber-500/10 px-1 rounded">
                    Pico
                  </span>
                )}
              </div>
              <div className="space-y-1 font-mono">
                <div className="flex justify-between items-center text-text-light">
                  <span className="text-text-light/60 text-[11px]">
                    Ventas:
                  </span>
                  <span className="font-bold text-primary">
                    {currencyFormatter.format(activePoint.row.sales)}
                  </span>
                </div>
                <div className="flex justify-between items-center text-text-light">
                  <span className="text-text-light/60 text-[11px]">
                    Órdenes:
                  </span>
                  <span className="font-semibold">
                    {activePoint.row.orders}
                  </span>
                </div>
                {activePoint.row.orders > 0 && (
                  <div className="flex justify-between items-center text-text-light">
                    <span className="text-text-light/60 text-[11px]">
                      Promedio:
                    </span>
                    <span className="text-text-light/80">
                      {currencyFormatter.format(
                        activePoint.row.sales / activePoint.row.orders,
                      )}
                    </span>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Empty State Banner if salesToday === 0 */}
          {salesToday === 0 && (
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="text-center px-4 py-3 rounded-xl bg-dark/70 border border-border/80 backdrop-blur-sm">
                <p className="text-xs font-semibold text-text-light/70">
                  Aún no hay órdenes cobradas hoy.
                </p>
                <p className="text-[11px] text-text-light/40 mt-0.5">
                  La gráfica se actualizará en tiempo real conforme ingresen
                  pedidos.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
