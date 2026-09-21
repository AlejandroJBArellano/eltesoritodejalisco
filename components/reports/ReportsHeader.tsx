"use client";

import React from "react";
import Link from "next/link";
import { Clock, BarChart3, Printer } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { ExportButton } from "@/components/ui/DataTableControls";
import {
  DAILY_SALES_EXPORT_COLUMNS,
  PRODUCT_SALES_EXPORT_COLUMNS,
} from "./exportColumns";
import { useReportsContextNullable } from "./ReportsContext";
import {
  PERIOD_LABELS,
  type DailySaleExportItem,
  type EnrichedProductSaleItem,
  type Period,
} from "./types";

export interface ReportsHeaderProps {
  period?: Period;
  dailySalesData?: DailySaleExportItem[];
  enrichedProductSales?: EnrichedProductSaleItem[];
}

export function ReportsHeader(props: ReportsHeaderProps = {}) {
  const context = useReportsContextNullable();
  const period = props.period ?? context?.period ?? "7days";
  const dailySalesData = props.dailySalesData ?? context?.dailySalesData ?? [];
  const enrichedProductSales =
    props.enrichedProductSales ?? context?.enrichedProductSales ?? [];

  const currentDateStr = new Date().toISOString().split("T")[0];

  return (
    <PageHeader
      title="Reportes & Balance"
      subtitle={`Resumen ejecutivo y contable del negocio (${PERIOD_LABELS[period]})`}
      badgeColor="bg-primary"
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <Link
            href="/analytics/sales"
            className="inline-flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 px-3.5 py-2 text-xs font-bold text-primary hover:bg-primary/20 transition-all active:scale-[0.98] shadow-xs"
          >
            <BarChart3 className="h-4 w-4" />
            Explorar Gráficas
          </Link>
          <Link
            href="/analytics/hourly"
            className="inline-flex items-center gap-2 rounded-lg bg-amber-500/10 border border-amber-500/20 px-3.5 py-2 text-xs font-bold text-amber-400 hover:bg-amber-500/20 transition-all active:scale-[0.98] shadow-xs"
          >
            <Clock className="h-4 w-4" />
            Horas Pico
          </Link>
          <ExportButton
            data={dailySalesData}
            columns={DAILY_SALES_EXPORT_COLUMNS}
            filename={() => `ventas_diarias_${period}_${currentDateStr}`}
            sheetName="Ventas Diarias"
            label="Exportar Ventas Diarias"
          />
          <ExportButton
            data={enrichedProductSales}
            columns={PRODUCT_SALES_EXPORT_COLUMNS}
            filename={() => `ventas_productos_${period}_${currentDateStr}`}
            sheetName="Ventas por Producto"
            label="Exportar Productos"
          />
          <button
            type="button"
            onClick={() => window.print()}
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2 text-xs font-bold text-dark uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all shadow-xs focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none cursor-pointer"
          >
            <Printer className="h-4 w-4" /> Imprimir / PDF
          </button>
        </div>
      }
    />
  );
}
