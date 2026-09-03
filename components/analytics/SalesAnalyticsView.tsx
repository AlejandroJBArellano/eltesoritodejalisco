"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertTriangle, Calendar, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AnalyticsNav } from "./AnalyticsNav";
import { SalesTrendChart } from "./SalesTrendChart";
import { ProductSalesDistributionChart } from "./ProductSalesDistributionChart";
import {
  PERIOD_LABELS,
  type Period,
  type ReportData,
} from "../reports/types";

export function SalesAnalyticsView() {
  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("7days");
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [selectedCategory, setSelectedCategory] = useState<string>("TODAS");
  const [productMetric, setProductMetric] = useState<"revenue" | "quantity">(
    "revenue",
  );

  const fetchData = async (
    p: Period,
    startDateStr?: string,
    endDateStr?: string,
  ) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      setSelectedDay(null);
      let url = `/api/reports?period=${p}`;
      if (p === "custom") {
        if (startDateStr) url += `&startDate=${startDateStr}`;
        if (endDateStr) url += `&endDate=${endDateStr}`;
      }
      const response = await fetch(url);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Error al cargar analítica de ventas");
      }
      setData(json);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error de red desconocido",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(period);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (p !== "custom") {
      fetchData(p);
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate) return;
    fetchData("custom", customStartDate, customEndDate);
  };

  const chartData = useMemo(() => {
    if (!data?.salesByDay) return [];
    return Object.entries(data.salesByDay).map(([date, total]) => ({
      date,
      total,
      label: new Date(`${date}T12:00:00-06:00`).toLocaleDateString("es-MX", {
        weekday: "short",
        day: "numeric",
        timeZone: "America/Mexico_City",
      }),
    }));
  }, [data]);

  const selectedDayItems = useMemo(() => {
    if (!selectedDay || !data?.itemsByDay) return [];
    return data.itemsByDay[selectedDay] || [];
  }, [selectedDay, data]);

  const categoriesList = useMemo(() => {
    if (!data?.productSales) return ["TODAS"];
    const cats = Array.from(
      new Set(data.productSales.map((p) => p.category).filter(Boolean)),
    );
    return ["TODAS", ...cats];
  }, [data]);

  const productChartData = useMemo(() => {
    if (!data?.productSales) return [];
    let list = data.productSales;
    if (selectedCategory !== "TODAS") {
      list = list.filter((p) => p.category === selectedCategory);
    }
    return [...list]
      .sort((a, b) =>
        productMetric === "revenue"
          ? b.revenue - a.revenue
          : b.quantity - a.quantity,
      )
      .slice(0, 10);
  }, [data, selectedCategory, productMetric]);

  const totalCategoryRevenue = useMemo(() => {
    return productChartData.reduce((sum, item) => sum + item.revenue, 0);
  }, [productChartData]);

  const totalCategoryQuantity = useMemo(() => {
    return productChartData.reduce((sum, item) => sum + item.quantity, 0);
  }, [productChartData]);

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageHeader
        title="Analítica de Ventas y Productos"
        subtitle={`Exploración visual de tendencias y comportamiento de compra (${PERIOD_LABELS[period]})`}
        badgeColor="bg-purple-500"
        actions={
          <button
            type="button"
            onClick={() =>
              fetchData(
                period,
                period === "custom" ? customStartDate : undefined,
                period === "custom" ? customEndDate : undefined,
              )
            }
            disabled={isLoading}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-500/10 border border-purple-500/30 px-3.5 py-2 text-xs font-black text-purple-400 hover:bg-purple-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        }
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Sub-navegación unificada entre pestañas de Analytics */}
        <AnalyticsNav activeTab="sales" />

        {/* Selector de Períodos */}
        <section className="rounded-2xl bg-card p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-extrabold text-text-light/50 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-4 w-4 text-purple-400" /> Período de Análisis
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
              <button
                type="button"
                key={p}
                onClick={() => handlePeriodChange(p)}
                className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
                  period === p
                    ? "bg-purple-600 text-white shadow-md shadow-purple-600/20 scale-[1.02]"
                    : "bg-dark/40 text-text-light/60 hover:bg-white/10 hover:text-white border border-border"
                }`}
              >
                {PERIOD_LABELS[p]}
              </button>
            ))}
          </div>

          {period === "custom" && (
            <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-border">
              <div className="flex items-center gap-2">
                <label
                  htmlFor="sales-custom-start-date"
                  className="text-xs font-bold text-text-light/60 uppercase tracking-wider"
                >
                  Desde:
                </label>
                <input
                  id="sales-custom-start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-xl border border-border bg-dark/40 px-3.5 py-2 text-xs text-text-light outline-none focus:border-purple-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="sales-custom-end-date"
                  className="text-xs font-bold text-text-light/60 uppercase tracking-wider"
                >
                  Hasta:
                </label>
                <input
                  id="sales-custom-end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-xl border border-border bg-dark/40 px-3.5 py-2 text-xs text-text-light outline-none focus:border-purple-400"
                />
              </div>
              <button
                type="button"
                onClick={handleApplyCustomDates}
                disabled={!customStartDate}
                className="rounded-xl bg-success px-5 py-2 text-xs font-black text-white uppercase tracking-wider hover:bg-success/90 disabled:opacity-40"
              >
                Aplicar Rango
              </button>
            </div>
          )}
        </section>

        {isLoading ? (
          <div className="flex py-24 items-center justify-center text-text-light/60 text-xs font-bold uppercase tracking-wider">
            <div className="flex items-center gap-3">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-purple-500 border-t-transparent"></div>
              Cargando analítica y tendencias...
            </div>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-card p-8 shadow-sm border border-red-500/20 text-center max-w-md mx-auto">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-400 mb-3" />
            <h3 className="text-base font-black text-text-light uppercase mb-2">
              Error al Cargar Gráficas
            </h3>
            <p className="text-xs text-text-light/60 mb-5">{errorMessage}</p>
            <button
              type="button"
              onClick={() => fetchData(period)}
              className="rounded-xl bg-purple-600 px-5 py-2 text-xs font-black text-white uppercase tracking-wider hover:bg-purple-500 transition-all"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* Gráfica 1: Evolución Diaria de Ventas con Drill-Down */}
            <SalesTrendChart
              chartData={chartData}
              selectedDay={selectedDay}
              onSelectDay={setSelectedDay}
              selectedDayItems={selectedDayItems}
            />

            {/* Gráfica 2: Distribución de Ventas por Producto y Categoría */}
            <ProductSalesDistributionChart
              productChartData={productChartData}
              selectedCategory={selectedCategory}
              onSelectCategory={setSelectedCategory}
              categoriesList={categoriesList}
              productMetric={productMetric}
              onSelectMetric={setProductMetric}
              totalCategoryRevenue={totalCategoryRevenue}
              totalCategoryQuantity={totalCategoryQuantity}
            />
          </div>
        )}
      </main>
    </div>
  );
}
