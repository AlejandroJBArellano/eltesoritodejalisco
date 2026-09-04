"use client";

import React from "react";
import { Award } from "lucide-react";
import { ExportButton } from "@/components/ui/DataTableControls";
import { PRODUCT_SALES_EXPORT_COLUMNS } from "./exportColumns";
import type { EnrichedProductSaleItem, Period, ReportData } from "./types";
import { useReportsContextNullable } from "./ReportsContext";

export interface ProductSalesSectionProps {
  enrichedProductSales?: EnrichedProductSaleItem[];
  topSellingItems?: ReportData["topSellingItems"];
  period?: Period;
}

export function ProductSalesSection(props: ProductSalesSectionProps = {}) {
  const context = useReportsContextNullable();
  const enrichedProductSales =
    props.enrichedProductSales ?? context?.enrichedProductSales ?? [];
  const topSellingItems =
    props.topSellingItems ?? context?.data?.topSellingItems ?? [];
  const period = props.period ?? context?.period ?? "7days";
  const currentDateStr = new Date().toISOString().split("T")[0];

  return (
    <div className="grid gap-8 lg:grid-cols-3">
      {/* Detailed Product Sales Table */}
      <section className="rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-border lg:col-span-2">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between mb-6 border-b border-border pb-4">
          <div>
            <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-purple-500"></span>
              Ventas por Producto (Detallado)
            </h2>
            <p className="text-xs text-text-light/60 mt-1 font-medium">
              Listado completo de productos ordenados por ingresos generados.
            </p>
          </div>
          <ExportButton
            data={enrichedProductSales}
            columns={PRODUCT_SALES_EXPORT_COLUMNS}
            filename={() => `ventas_productos_${period}_${currentDateStr}`}
            sheetName="Ventas por Producto"
          />
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border text-xs font-black text-text-light/40 uppercase tracking-wider">
                <th scope="col" className="py-3 px-3">
                  Rank
                </th>
                <th scope="col" className="py-3 px-3">
                  Producto
                </th>
                <th scope="col" className="py-3 px-3">
                  Categoría
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Unidades
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Precio Prom.
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  Ingresos
                </th>
                <th scope="col" className="py-3 px-3 text-right">
                  % Part.
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {enrichedProductSales.map((product) => (
                <tr
                  key={product.id}
                  className="hover:bg-white/5 transition-colors"
                >
                  <td className="py-3.5 px-3 font-mono text-xs font-bold text-text-light/50">
                    #{product.rank}
                  </td>
                  <td className="py-3.5 px-3 font-bold text-text-light uppercase text-xs">
                    {product.name}
                  </td>
                  <td className="py-3.5 px-3">
                    <span className="inline-flex items-center rounded-lg bg-dark/60 px-2 py-0.5 text-[11px] font-bold text-text-light/70 border border-border">
                      {product.category || "General"}
                    </span>
                  </td>
                  <td className="py-3.5 px-3 text-right font-bold text-text-light text-xs">
                    {product.quantity}
                  </td>
                  <td className="py-3.5 px-3 text-right text-xs font-medium text-text-light/70">
                    ${(product.averageUnitPrice || 0).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-black text-emerald-400 text-xs">
                    ${product.revenue.toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right font-mono text-xs font-bold text-text-light/60">
                    {(product.percentageOfTotal || 0).toFixed(1)}%
                  </td>
                </tr>
              ))}
              {enrichedProductSales.length === 0 && (
                <tr>
                  <td
                    colSpan={7}
                    className="py-8 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest"
                  >
                    No hay ventas registradas en el período.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* Top 5 Products Leaderboard */}
      <section className="rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-border">
        <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
            <Award className="h-5 w-5 text-amber-400" />
            Top Productos Más Vendidos
          </h2>
        </div>

        <div className="space-y-4">
          {(topSellingItems || []).map((item, index) => {
            const badgeColor =
              index === 0
                ? "bg-amber-500/20 text-amber-400 border-amber-500/30"
                : index === 1
                  ? "bg-slate-400/20 text-slate-300 border-slate-400/30"
                  : index === 2
                    ? "bg-amber-700/20 text-amber-500 border-amber-700/30"
                    : "bg-white/5 text-text-light/60 border-border";

            return (
              <div
                key={index}
                className="flex items-center justify-between p-3 rounded-xl bg-dark/40 border border-border"
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg border text-xs font-black ${badgeColor}`}
                  >
                    #{index + 1}
                  </span>
                  <span className="font-bold text-text-light uppercase text-sm">
                    {item.name}
                  </span>
                </div>
                <div className="text-right">
                  <p className="text-sm font-black text-text-light">
                    {item.quantity} vendidos
                  </p>
                  <p className="text-xs font-bold text-emerald-400">
                    ${(item.revenue || 0).toFixed(2)}
                  </p>
                </div>
              </div>
            );
          })}
          {(!topSellingItems || topSellingItems.length === 0) && (
            <p className="py-8 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest">
              No hay ventas registradas aún.
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
