"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { useReportsData } from "./hooks/useReportsData";
import { ReportsHeader } from "./ReportsHeader";
import { ReportsPeriodFilter } from "./ReportsPeriodFilter";
import { FinancialSummaryKPIs } from "./FinancialSummaryKPIs";
import { AnalyticsBanner } from "./AnalyticsBanner";
import { DailySalesTable } from "./DailySalesTable";
import { ProductSalesSection } from "./ProductSalesSection";
import { SalesSourceCard } from "./SalesSourceCard";
import { TopCustomersTable } from "./TopCustomersTable";

export function ReportsContent() {
  const {
    data,
    isLoading,
    errorMessage,
    period,
    customStartDate,
    customEndDate,
    setCustomStartDate,
    setCustomEndDate,
    handlePeriodChange,
    handleApplyCustomDates,
    refreshData,
    dailySalesData,
    enrichedProductSales,
    netUtility,
  } = useReportsData();

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-light/60 text-sm font-bold uppercase tracking-wider">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          Cargando reportes & métricas...
        </div>
      </div>
    );
  }

  if (errorMessage) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="rounded-2xl bg-card p-8 shadow-sm border border-red-500/20 max-w-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-lg font-black text-text-light uppercase tracking-tight mb-2">
            Error al Cargar Datos
          </h2>
          <p className="text-xs text-text-light/60 mb-6">{errorMessage}</p>
          <button
            type="button"
            onClick={refreshData}
            className="rounded-xl bg-primary px-6 py-2.5 text-xs font-black text-white uppercase tracking-wider hover:bg-primary/90 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  if (!data) return null;

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header Reutilizable con Acciones y Exportadores */}
      <ReportsHeader
        period={period}
        dailySalesData={dailySalesData}
        enrichedProductSales={enrichedProductSales}
      />

      {/* Main Content Area */}
      <main className="mx-auto max-w-7xl space-y-10 px-4 py-8 sm:px-6 lg:px-8">
        {/* Filtro de Período y Fechas */}
        <ReportsPeriodFilter
          period={period}
          onPeriodChange={handlePeriodChange}
          customStartDate={customStartDate}
          customEndDate={customEndDate}
          onCustomStartDateChange={setCustomStartDate}
          onCustomEndDateChange={setCustomEndDate}
          onApplyCustomDates={handleApplyCustomDates}
        />

        {/* Resumen Financiero y Operativo (8 KPIs) */}
        <FinancialSummaryKPIs
          summary={data.summary}
          newCustomersCount={data.customers?.newCustomersCount}
          netUtility={netUtility}
        />

        {/* Banner de Acceso Rápido a Analytics Visual */}
        <AnalyticsBanner />

        {/* Detalle Tabular de Ventas Diarias */}
        <DailySalesTable
          dailySalesData={dailySalesData}
          period={period}
        />

        {/* Ventas por Producto y Ranking de Más Vendidos */}
        <ProductSalesSection
          enrichedProductSales={enrichedProductSales}
          topSellingItems={data.topSellingItems}
          period={period}
        />

        {/* Grid Inferior: Fuentes de Venta y Mejores Clientes */}
        <div className="grid gap-8 lg:grid-cols-2">
          <SalesSourceCard salesBySource={data.salesBySource} />
          <TopCustomersTable
            topCustomers={data.customers?.topCustomers}
            period={period}
          />
        </div>
      </main>
    </div>
  );
}
