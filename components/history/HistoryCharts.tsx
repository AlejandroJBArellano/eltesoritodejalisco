"use client";

import React, { useMemo } from "react";
import { format, isSameMonth, parseISO, subMonths } from "date-fns";
import { es } from "date-fns/locale";
import { BarChart3, PieChart as PieChartIcon } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import { useHistoryContextNullable } from "./HistoryContext";
import type { Order } from "./types";

const COLORS = [
  "#FFB7CE",
  "#34D399",
  "#60A5FA",
  "#FBBF24",
  "#C084FC",
  "#F472B6",
  "#38BDF8",
];

export interface HistoryChartsProps {
  orders?: Order[];
}

export function HistoryCharts(props: HistoryChartsProps = {}) {
  const context = useHistoryContextNullable();
  const orders = props.orders ?? context?.orders ?? [];

  const chartsData = useMemo(() => {
    const now = new Date();
    const dailyMap = new Map<string, number>();
    const categoryMap = new Map<string, number>();
    let currentMonthTotal = 0;
    let previousMonthTotal = 0;

    orders.forEach((order) => {
      if (order.status !== "PAID" && order.status !== "DELIVERED") return;

      const date = new Date(order.createdAt);
      const subtotalFiscal = (order.total || 0) / 1.16;

      if (isSameMonth(date, now)) {
        currentMonthTotal += subtotalFiscal;
        const dayKey = format(date, "yyyy-MM-dd");
        dailyMap.set(dayKey, (dailyMap.get(dayKey) || 0) + subtotalFiscal);

        order.orderItems?.forEach((item) => {
          const cat = item.menuItem?.category || "Otros";
          const itemImporteFiscal = (item.quantity * item.unitPrice) / 1.16;
          categoryMap.set(cat, (categoryMap.get(cat) || 0) + itemImporteFiscal);
        });
      } else if (isSameMonth(date, subMonths(now, 1))) {
        previousMonthTotal += subtotalFiscal;
      }
    });

    const dailySales = Array.from(dailyMap.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, total]) => ({
        date: format(parseISO(date), "dd MMM", { locale: es }),
        total,
      }));

    const salesMix = Array.from(categoryMap.entries())
      .map(([name, value]) => ({ name, value }))
      .sort((a, b) => b.value - a.value);

    const growth = [
      {
        name: format(subMonths(now, 1), "MMMM", { locale: es }).toUpperCase(),
        total: previousMonthTotal,
      },
      {
        name: format(now, "MMMM", { locale: es }).toUpperCase(),
        total: currentMonthTotal,
      },
    ];

    return { dailySales, salesMix, growth };
  }, [orders]);

  return (
    <section className="space-y-4">
      <h2 className="text-xs font-extrabold text-text-light/50 uppercase tracking-widest flex items-center gap-2">
        <span className="h-2 w-2 rounded-full bg-purple-500"></span>
        Análisis y Tendencias
      </h2>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Venta Diaria */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border lg:col-span-2 space-y-4">
          <h3 className="text-sm font-black text-text-light uppercase tracking-wider flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-blue-400" />
            Venta Diaria ({format(new Date(), "MMMM", { locale: es })})
          </h3>
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartsData.dailySales}
                margin={{ top: 5, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#2A2A2A" />
                <XAxis dataKey="date" stroke="#888888" fontSize={11} />
                <YAxis
                  stroke="#888888"
                  fontSize={11}
                  tickFormatter={(val) => `$${val}`}
                />
                <RechartsTooltip
                  contentStyle={{
                    backgroundColor: "var(--color-card)",
                    borderColor: "var(--color-border)",
                    borderRadius: "12px",
                    color: "var(--color-text-light)",
                  }}
                  formatter={(value: number | string | undefined) => [
                    `$${Number(value).toFixed(2)}`,
                    "Venta Neta",
                  ]}
                />
                <Line
                  type="monotone"
                  dataKey="total"
                  stroke="var(--color-primary)"
                  strokeWidth={3}
                  dot={{ r: 4, fill: "var(--color-primary)" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Mix de Productos */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4 flex flex-col justify-between">
          <h3 className="text-sm font-black text-text-light uppercase tracking-wider flex items-center gap-2">
            <PieChartIcon className="h-4 w-4 text-emerald-400" />
            Mix de Categorías
          </h3>
          <div className="h-48 w-full flex items-center justify-center">
            {chartsData.salesMix.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartsData.salesMix}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={45}
                    outerRadius={70}
                    paddingAngle={3}
                  >
                    {chartsData.salesMix.map((_, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={COLORS[index % COLORS.length]}
                      />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{
                      backgroundColor: "var(--color-card)",
                      borderColor: "var(--color-border)",
                      borderRadius: "12px",
                      color: "var(--color-text-light)",
                    }}
                    formatter={(value: number | string | undefined) => [
                      `$${Number(value).toFixed(2)}`,
                      "Venta Neta",
                    ]}
                  />
                  <Legend
                    verticalAlign="bottom"
                    height={36}
                    wrapperStyle={{ fontSize: "10px" }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <p className="text-xs text-text-light/40 italic">
                Sin ventas suficientes este mes
              </p>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
