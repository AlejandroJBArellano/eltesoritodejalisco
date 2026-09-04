"use client";

import React, { useState } from "react";
import { Layers } from "lucide-react";
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
  const [hoveredProduct, setHoveredProduct] = useState<ProductSaleItem | null>(
    null,
  );

  const rawMax = Math.max(
    ...productChartData.map((p) => p[productMetric] || 0),
    0,
  );
  const maxVal = rawMax > 0 ? rawMax : 1;

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
                <option
                  key={cat}
                  value={cat}
                  className="bg-card text-text-light"
                >
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
        <div
          className="w-full space-y-3.5"
          data-testid="product-distribution-chart"
        >
          {productChartData.map((product) => {
            const val = product[productMetric] || 0;
            const percentage = Math.max(Math.min((val / maxVal) * 100, 100), 1);
            const isRevenue = productMetric === "revenue";
            const barColor = isRevenue ? "bg-emerald-500" : "bg-purple-500";
            const isHovered = hoveredProduct?.id === product.id;

            return (
              <div
                key={product.id}
                className="group relative cursor-pointer"
                onMouseEnter={() => setHoveredProduct(product)}
                onMouseLeave={() => setHoveredProduct(null)}
              >
                <div className="flex items-center justify-between text-xs mb-1.5 gap-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="font-bold text-text-light uppercase truncate">
                      {product.name}
                    </span>
                    <span className="hidden sm:inline-block text-[10px] font-bold text-text-light/40 uppercase bg-dark/60 border border-border px-1.5 py-0.5 rounded">
                      {product.category || "General"}
                    </span>
                  </div>
                  <span
                    className={`font-black shrink-0 ${
                      isRevenue ? "text-emerald-400" : "text-purple-400"
                    }`}
                  >
                    {isRevenue
                      ? `$${val.toLocaleString(undefined, {
                          minimumFractionDigits: 2,
                        })}`
                      : `${val.toLocaleString()} u.`}
                  </span>
                </div>

                {/* Progress bar track */}
                <div className="h-3 w-full bg-dark/60 border border-border/60 rounded-full overflow-hidden p-0.5">
                  <div
                    className={`h-full ${barColor} rounded-full transition-all duration-500 ease-out`}
                    style={{ width: `${percentage}%` }}
                  />
                </div>

                {/* Interactive hover card */}
                {isHovered && (
                  <div className="absolute right-0 bottom-full mb-1 z-20 pointer-events-none rounded-xl border border-border bg-dark/95 p-3 shadow-2xl backdrop-blur-md text-xs whitespace-nowrap">
                    <p className="font-black text-white">{product.name}</p>
                    <p className="text-[11px] text-emerald-400 font-bold mt-0.5">
                      Ingresos: $
                      {(product.revenue || 0).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                    <p className="text-[11px] text-purple-400 font-bold">
                      Unidades: {(product.quantity || 0).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <p className="py-16 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest">
          No hay datos de productos en la categoría seleccionada.
        </p>
      )}
    </section>
  );
}
