"use client";

import React, { useState } from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
import { useGastosContextNullable } from "./GastosContext";
import type { CategoryExpenseItem, DailyExpenseTrendItem } from "./types";

export interface GastosChartsSectionProps {
  currentMonth?: string;
  fixedExpensesTotal?: number;
  variableExpensesTotal?: number;
  dailyExpensesData?: DailyExpenseTrendItem[];
  categoryExpensesData?: CategoryExpenseItem[];
}

export const formatYAxisCurrency = (v: number | string) => `$${v}`;
export const formatExpenseTooltip = (val: unknown) => [
  `$${Number(val ?? 0).toFixed(2)}`,
  "",
];
export const formatCategoryTooltip = (val: unknown) => [
  `$${Number(val ?? 0).toFixed(2)}`,
  "Gasto Acumulado",
];

export function GastosChartsSection(props: GastosChartsSectionProps = {}) {
  const context = useGastosContextNullable();
  const currentMonth = props.currentMonth ?? context?.currentMonth ?? "";
  const fixedExpensesTotal =
    props.fixedExpensesTotal ?? context?.summary.fixedExpensesTotal ?? 0;
  const variableExpensesTotal =
    props.variableExpensesTotal ?? context?.summary.variableExpensesTotal ?? 0;
  const dailyExpensesData =
    props.dailyExpensesData ?? context?.dailyExpensesData ?? [];
  const categoryExpensesData =
    props.categoryExpensesData ?? context?.categoryExpensesData ?? [];

  const [hoveredDailyIndex, setHoveredDailyIndex] = useState<number | null>(
    null,
  );
  const [hoveredCategory, setHoveredCategory] =
    useState<CategoryExpenseItem | null>(null);

  // Dimensions for daily line chart
  const svgWidth = 900;
  const svgHeight = 260;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 35;

  const innerWidth = svgWidth - paddingLeft - paddingRight;
  const innerHeight = svgHeight - paddingTop - paddingBottom;

  const maxDaily = Math.max(
    ...dailyExpensesData.map((d) => Math.max(d.fijos, d.variables)),
    0,
  );
  const maxDailyVal = maxDaily > 0 ? Math.ceil(maxDaily * 1.15) : 100;
  const yTicks = [
    0,
    maxDailyVal * 0.25,
    maxDailyVal * 0.5,
    maxDailyVal * 0.75,
    maxDailyVal,
  ];

  // Calculate coordinates for points in line chart
  const getPointX = (index: number) => {
    if (dailyExpensesData.length <= 1) return paddingLeft + innerWidth / 2;
    return paddingLeft + (index / (dailyExpensesData.length - 1)) * innerWidth;
  };

  const getPointY = (val: number) => {
    return paddingTop + innerHeight - (val / maxDailyVal) * innerHeight;
  };

  const fijosPoints = dailyExpensesData.map((d, i) => ({
    x: getPointX(i),
    y: getPointY(d.fijos),
  }));

  const variablesPoints = dailyExpensesData.map((d, i) => ({
    x: getPointX(i),
    y: getPointY(d.variables),
  }));

  const createPathD = (points: { x: number; y: number }[]) => {
    if (points.length === 0) return "";
    return points.reduce(
      (acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x} ${p.y}`,
      "",
    );
  };

  const fijosPathD = createPathD(fijosPoints);
  const variablesPathD = createPathD(variablesPoints);

  // Category horizontal max
  const maxCategory = Math.max(
    ...categoryExpensesData.map((c) => c.value),
    0,
  );
  const maxCategoryVal = maxCategory > 0 ? maxCategory : 1;

  return (
    <div className="space-y-8">
      {/* 1. Gráfica Lineal: Gastos Fijos vs Gastos Variables */}
      <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
          <h2 className="text-base font-black text-text-light uppercase tracking-wider flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-amber-400" />
            Tendencia de Egresos: Gastos Fijos vs Variables ({currentMonth})
          </h2>

          {/* Leyendas con totales */}
          <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
            <div className="flex items-center gap-2 bg-dark/40 px-3 py-1.5 rounded-xl border border-border">
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400"></span>
              <div>
                <span className="text-text-light/40 font-bold uppercase text-[9px] block">
                  Gastos Fijos
                </span>
                <span className="text-amber-400 font-black">
                  ${fixedExpensesTotal.toFixed(2)}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 bg-dark/40 px-3 py-1.5 rounded-xl border border-border">
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400"></span>
              <div>
                <span className="text-text-light/40 font-bold uppercase text-[9px] block">
                  Gastos Variables
                </span>
                <span className="text-emerald-400 font-black">
                  ${variableExpensesTotal.toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className="h-72 w-full" data-testid="gastos-trend-linechart">
          {dailyExpensesData.length > 0 ? (
            <div className="relative h-full w-full select-none">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="h-full w-full overflow-visible"
                preserveAspectRatio="none"
              >
                {/* Y-Axis Gridlines & Labels */}
                {yTicks.map((tick, i) => {
                  const y =
                    paddingTop +
                    innerHeight -
                    (tick / maxDailyVal) * innerHeight;
                  return (
                    <g key={`daily-ytick-${i}`}>
                      <line
                        x1={paddingLeft}
                        y1={y}
                        x2={svgWidth - paddingRight}
                        y2={y}
                        stroke="rgba(255,255,255,0.05)"
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
                        {formatYAxisCurrency(Math.round(tick))}
                      </text>
                    </g>
                  );
                })}

                {/* Lines */}
                <path
                  d={fijosPathD}
                  fill="none"
                  stroke="#FBBF24"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
                <path
                  d={variablesPathD}
                  fill="none"
                  stroke="#34D399"
                  strokeWidth="2.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />

                {/* Point circles & X-axis labels */}
                {dailyExpensesData.map((d, i) => {
                  const x = getPointX(i);
                  const isHovered = hoveredDailyIndex === i;

                  return (
                    <g
                      key={`point-group-${i}`}
                      className="cursor-pointer"
                      onMouseEnter={() => setHoveredDailyIndex(i)}
                      onMouseLeave={() => setHoveredDailyIndex(null)}
                    >
                      {/* Vertical highlight line on hover */}
                      {isHovered && (
                        <line
                          x1={x}
                          y1={paddingTop}
                          x2={x}
                          y2={paddingTop + innerHeight}
                          stroke="rgba(255,255,255,0.15)"
                          strokeDasharray="2 2"
                        />
                      )}

                      {/* Dots */}
                      <circle
                        cx={x}
                        cy={fijosPoints[i]?.y}
                        r={isHovered ? 5 : 3.5}
                        fill="#FBBF24"
                        className="transition-all"
                      />
                      <circle
                        cx={x}
                        cy={variablesPoints[i]?.y}
                        r={isHovered ? 5 : 3.5}
                        fill="#34D399"
                        className="transition-all"
                      />

                      {/* X label */}
                      <text
                        x={x}
                        y={svgHeight - 10}
                        textAnchor="middle"
                        fill="#888888"
                        fontSize="10"
                        fontWeight="700"
                      >
                        {d.date}
                      </text>

                      {/* Transparent hit area */}
                      <rect
                        x={x - 15}
                        y={paddingTop}
                        width={30}
                        height={innerHeight}
                        fill="transparent"
                      />
                    </g>
                  );
                })}
              </svg>

              {/* Floating Tooltip */}
              {hoveredDailyIndex !== null &&
                dailyExpensesData[hoveredDailyIndex] && (
                  <div
                    style={{
                      left: `${
                        (getPointX(hoveredDailyIndex) / svgWidth) * 100
                      }%`,
                      top: "5%",
                    }}
                    className="absolute pointer-events-none -translate-x-1/2 z-20 rounded-xl border border-border bg-dark/95 p-3 shadow-2xl backdrop-blur-md text-xs whitespace-nowrap"
                  >
                    <p className="font-bold text-white mb-1">
                      {dailyExpensesData[hoveredDailyIndex].date}
                    </p>
                    <p className="text-amber-400 font-extrabold flex justify-between gap-3">
                      <span>Fijos:</span>
                      <span>
                        $
                        {dailyExpensesData[
                          hoveredDailyIndex
                        ].fijos.toFixed(2)}
                      </span>
                    </p>
                    <p className="text-emerald-400 font-extrabold flex justify-between gap-3">
                      <span>Variables:</span>
                      <span>
                        $
                        {dailyExpensesData[
                          hoveredDailyIndex
                        ].variables.toFixed(2)}
                      </span>
                    </p>
                  </div>
                )}
            </div>
          ) : (
            <div className="h-full flex items-center justify-center text-text-light/30 text-xs italic">
              Aún no hay gastos registrados este mes.
            </div>
          )}
        </div>
      </section>

      {/* 2. Gráfica de Distribución por Categoría de Gasto */}
      <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-6">
        <div className="flex items-center justify-between border-b border-border pb-4">
          <h2 className="text-base font-black text-text-light uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-purple-400" />
            Distribución por Categoría de Gasto ({currentMonth})
          </h2>
        </div>

        <div className="w-full" data-testid="gastos-category-barchart">
          {categoryExpensesData.length > 0 ? (
            <div className="space-y-4">
              {categoryExpensesData.map((cat, i) => {
                const percentage = Math.max(
                  Math.min((cat.value / maxCategoryVal) * 100, 100),
                  1,
                );
                const isHovered = hoveredCategory?.name === cat.name;

                return (
                  <div
                    key={`cat-${i}`}
                    className="group relative cursor-pointer"
                    onMouseEnter={() => setHoveredCategory(cat)}
                    onMouseLeave={() => setHoveredCategory(null)}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                      <div className="flex items-center gap-2 min-w-0">
                        <span
                          className="w-2.5 h-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: cat.color }}
                        />
                        <span className="font-bold text-text-light uppercase truncate">
                          {cat.name}
                        </span>
                        <span
                          className={`text-[9px] px-1.5 py-0.5 rounded font-black uppercase ${
                            cat.tipo === "fijo"
                              ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                              : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          }`}
                        >
                          {cat.tipo}
                        </span>
                      </div>
                      <span className="font-black text-text-light shrink-0">
                        ${cat.value.toFixed(2)}
                      </span>
                    </div>

                    {/* Progress track */}
                    <div className="h-2.5 w-full bg-dark/60 border border-border/60 rounded-full overflow-hidden p-0.5">
                      <div
                        className="h-full rounded-full transition-all duration-500 ease-out"
                        style={{
                          width: `${percentage}%`,
                          backgroundColor: cat.color,
                        }}
                      />
                    </div>

                    {/* Tooltip on hover */}
                    {isHovered && (
                      <div className="absolute right-0 bottom-full mb-1 z-20 pointer-events-none rounded-xl border border-border bg-dark/95 p-2.5 shadow-2xl backdrop-blur-md text-xs whitespace-nowrap">
                        <p className="font-black text-white">{cat.name}</p>
                        <p className="text-[11px] text-text-light/70 font-medium">
                          Gasto Acumulado: ${cat.value.toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="h-48 flex items-center justify-center text-text-light/30 text-xs italic">
              Aún no hay gastos registrados este mes.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
