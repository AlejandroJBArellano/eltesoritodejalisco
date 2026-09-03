"use client";

import React from "react";
import { TrendingUp, BarChart3 } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { CategoryExpenseItem, DailyExpenseTrendItem } from "./types";

export interface GastosChartsSectionProps {
  currentMonth: string;
  fixedExpensesTotal: number;
  variableExpensesTotal: number;
  dailyExpensesData: DailyExpenseTrendItem[];
  categoryExpensesData: CategoryExpenseItem[];
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

export function GastosChartsSection({
  currentMonth,
  fixedExpensesTotal,
  variableExpensesTotal,
  dailyExpensesData,
  categoryExpensesData,
}: GastosChartsSectionProps) {
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
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={dailyExpensesData}
                margin={{ top: 10, right: 20, left: -20, bottom: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  vertical={false}
                />
                <XAxis
                  dataKey="date"
                  stroke="#666"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#888", fontWeight: 700 }}
                />
                <YAxis
                  stroke="#666"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#888", fontWeight: 700 }}
                  tickFormatter={formatYAxisCurrency}
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
                  formatter={formatExpenseTooltip}
                  cursor={{ stroke: "rgba(255,255,255,0.1)", strokeWidth: 1 }}
                />
                <Legend
                  verticalAlign="top"
                  align="right"
                  iconType="circle"
                  wrapperStyle={{ fontSize: "11px", fontWeight: "700" }}
                />
                <Line
                  type="monotone"
                  dataKey="fijos"
                  name="Fijos"
                  stroke="#FBBF24"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#FBBF24" }}
                  activeDot={{ r: 5 }}
                />
                <Line
                  type="monotone"
                  dataKey="variables"
                  name="Variables"
                  stroke="#34D399"
                  strokeWidth={2.5}
                  dot={{ r: 3, fill: "#34D399" }}
                  activeDot={{ r: 5 }}
                />
              </LineChart>
            </ResponsiveContainer>
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

        <div className="h-72 w-full" data-testid="gastos-category-barchart">
          {categoryExpensesData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={categoryExpensesData}
                layout="vertical"
                margin={{ top: 5, right: 30, left: 40, bottom: 5 }}
              >
                <CartesianGrid
                  strokeDasharray="3 3"
                  stroke="rgba(255,255,255,0.05)"
                  horizontal={false}
                />
                <XAxis
                  type="number"
                  stroke="#666"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#888", fontWeight: 700 }}
                  tickFormatter={formatYAxisCurrency}
                />
                <YAxis
                  type="category"
                  dataKey="name"
                  stroke="#666"
                  tickLine={false}
                  axisLine={false}
                  tick={{ fontSize: 10, fill: "#888", fontWeight: 700 }}
                  width={110}
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
                  formatter={formatCategoryTooltip}
                  cursor={{ fill: "rgba(255,255,255,0.05)" }}
                />
                <Bar dataKey="value" barSize={22} radius={[0, 6, 6, 0]}>
                  {categoryExpensesData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-full flex items-center justify-center text-text-light/30 text-xs italic">
              Aún no hay gastos registrados este mes.
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
