"use client";

import React from "react";
import { Layers } from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { ProductSaleItem } from "../reports/types";

export interface ProductSalesDistributionChartProps {
  productChartData: ProductSaleItem[];
  selectedCategory: string;
  onSelectCategory: (cat: string) => void;
  categoriesList: string[];
  productMetric: "revenue" | "quantity";
  onSelectMetric: (metric: "revenue" | "quantity") => void;
  totalCategoryRevenue: number;
  totalCategoryQuantity: number;
}

export function ProductSalesDistributionChart({
  productChartData,
  selectedCategory,
  onSelectCategory,
  categoriesList,
  productMetric,
  onSelectMetric,
  totalCategoryRevenue,
  totalCategoryQuantity,
}: ProductSalesDistributionChartProps) {
  return (
    <section className="rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-border">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-border pb-4">
        <div>
          <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
            Distribución de Ventas por Producto
          </h2>
          <p className="text-xs text-text-light/60 mt-1 font-medium">
            Analiza el volumen y concentración de ventas individuales por producto y categoría.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Category Filter Dropdown */}
          <div className="flex items-center gap-2 bg-dark/40 px-3 py-1.5 rounded-xl border border-border text-xs">
            <Layers className="h-3.5 w-3.5 text-purple-400" />
            <span className="text-text-light/60 font-bold uppercase tracking-wider">
              Cat:
            </span>
            <select
              value={selectedCategory}
              onChange={(e) => onSelectCategory(e.target.value)}
              aria-label="Filtrar por categoría"
              className="bg-transparent text-text-light text-xs font-bold uppercase tracking-wider outline-none cursor-pointer focus-visible:ring-2 focus-visible:ring-purple-400 focus-visible:outline-none rounded px-1"
            >
              {categoriesList.map((cat) => (
                <option key={cat} value={cat} className="bg-card text-text-light">
                  {cat}
                </option>
              ))}
            </select>
          </div>

          {/* Metric Toggle ($ vs Units) */}
          <div className="flex items-center bg-dark/40 p-1 rounded-xl border border-border">
            <button
              type="button"
              onClick={() => onSelectMetric("revenue")}
              className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-success focus-visible:outline-none ${
                productMetric === "revenue"
                  ? "bg-success text-white shadow-md"
                  : "text-text-light/60 hover:text-white"
              }`}
            >
              $ Ingresos
            </button>
            <button
              type="button"
              onClick={() => onSelectMetric("quantity")}
              className={`px-3.5 py-1.5 text-xs font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:outline-none ${
                productMetric === "quantity"
                  ? "bg-purple-600 text-white shadow-md"
                  : "text-text-light/60 hover:text-white"
              }`}
            >
              # Unidades
            </button>
          </div>
        </div>
      </div>

      {/* Quick Summary Badges */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
        <div className="bg-dark/40 p-4 rounded-xl border border-border">
          <span className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-wider block">
            Total Recaudado ({selectedCategory})
          </span>
          <span className="text-lg font-black text-emerald-400 mt-1 block">
            $
            {totalCategoryRevenue.toLocaleString(undefined, {
              minimumFractionDigits: 2,
            })}
          </span>
        </div>
        <div className="bg-dark/40 p-4 rounded-xl border border-border">
          <span className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-wider block">
            Unidades Vendidas
          </span>
          <span className="text-lg font-black text-purple-400 mt-1 block">
            {totalCategoryQuantity.toLocaleString()} u.
          </span>
        </div>
        <div className="col-span-2 sm:col-span-1 bg-dark/40 p-4 rounded-xl border border-border">
          <span className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-wider block">
            Top Producto
          </span>
          <span className="text-sm font-black text-text-light mt-1 block truncate">
            {productChartData[0]?.name || "N/A"}
          </span>
        </div>
      </div>

      {productChartData.length > 0 ? (
        <div className="h-80 w-full" data-testid="product-distribution-chart">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart
              data={productChartData}
              layout="vertical"
              margin={{ top: 10, right: 30, left: 20, bottom: 5 }}
            >
              <CartesianGrid
                strokeDasharray="3 3"
                horizontal={false}
                stroke="rgba(255,255,255,0.05)"
              />
              <XAxis
                type="number"
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#888888", fontSize: 11, fontWeight: 700 }}
                tickFormatter={(val) =>
                  productMetric === "revenue" ? `$${val}` : `${val} u.`
                }
              />
              <YAxis
                type="category"
                dataKey="name"
                width={140}
                tickLine={false}
                axisLine={false}
                tick={{ fill: "#DDDDDD", fontSize: 11, fontWeight: 700 }}
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
                formatter={(val: unknown) => [
                  productMetric === "revenue"
                    ? `$${Number(val ?? 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}`
                    : `${Number(val ?? 0).toLocaleString()} unidades`,
                  productMetric === "revenue" ? "Ingresos" : "Cantidad Vendida",
                ]}
                cursor={{ fill: "rgba(255,255,255,0.05)" }}
              />
              <Bar
                dataKey={productMetric}
                radius={[0, 6, 6, 0]}
                fill={productMetric === "revenue" ? "#10B981" : "#A855F7"}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="py-16 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest">
          No hay datos de productos en la categoría seleccionada.
        </p>
      )}
    </section>
  );
}
