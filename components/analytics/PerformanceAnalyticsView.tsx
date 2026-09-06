"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Calendar, RefreshCw } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AnalyticsNav } from "./AnalyticsNav";
import { PerformanceSummaryKPIs } from "./PerformanceSummaryKPIs";
import { AverageTicketTrendChart } from "./AverageTicketTrendChart";
import { WeekdaySalesChart } from "./WeekdaySalesChart";
import { MonthlySalesChart } from "./MonthlySalesChart";
import {
  PERIOD_LABELS,
  type Period,
} from "../reports/types";
import type { PerformanceAnalyticsResult } from "@/lib/services/performanceAnalytics";

export function PerformanceAnalyticsView() {
  const [data, setData] = useState<PerformanceAnalyticsResult | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>("7days");

  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const fetchData = async (
    p: Period,
    startDateStr?: string,
    endDateStr?: string,
  ) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);
      let url = `/api/analytics/performance?period=${p}`;
      if (p === "custom") {
        if (startDateStr) url += `&startDate=${startDateStr}`;
        if (endDateStr) url += `&endDate=${endDateStr}`;
      }
      const response = await fetch(url);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Error al cargar analítica de rendimiento");
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

  return (
    <div className="min-h-screen bg-background pb-16">
      <PageHeader
        title="Analítica de Rendimiento"
        subtitle={`Evolución de ticket promedio y patrones comerciales (${PERIOD_LABELS[period]})`}
        badgeColor="bg-emerald-500"
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
            className="inline-flex items-center gap-2 rounded-xl bg-emerald-500/10 border border-emerald-500/30 px-3.5 py-2 text-xs font-black text-emerald-400 hover:bg-emerald-500/20 transition-all active:scale-95 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Actualizar
          </button>
        }
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-6 sm:px-6 lg:px-8">
        {/* Navegación unificada */}
        <AnalyticsNav activeTab="performance" />

        {/* Selector de Períodos */}
        <section className="rounded-2xl bg-card p-6 shadow-sm border border-border">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xs font-extrabold text-text-light/50 uppercase tracking-widest flex items-center gap-2">
              <Calendar className="h-4 w-4 text-emerald-400" /> Período de Análisis
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
                    ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20 scale-[1.02]"
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
                  htmlFor="performance-custom-start-date"
                  className="text-xs font-bold text-text-light/60 uppercase tracking-wider"
                >
                  Desde:
                </label>
                <input
                  id="performance-custom-start-date"
                  type="date"
                  value={customStartDate}
                  onChange={(e) => setCustomStartDate(e.target.value)}
                  className="rounded-xl border border-border bg-dark/40 px-3.5 py-2 text-xs text-text-light outline-none focus:border-emerald-400"
                />
              </div>
              <div className="flex items-center gap-2">
                <label
                  htmlFor="performance-custom-end-date"
                  className="text-xs font-bold text-text-light/60 uppercase tracking-wider"
                >
                  Hasta:
                </label>
                <input
                  id="performance-custom-end-date"
                  type="date"
                  value={customEndDate}
                  onChange={(e) => setCustomEndDate(e.target.value)}
                  className="rounded-xl border border-border bg-dark/40 px-3.5 py-2 text-xs text-text-light outline-none focus:border-emerald-400"
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
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-emerald-500 border-t-transparent"></div>
              Cargando analítica de rendimiento...
            </div>
          </div>
        ) : errorMessage ? (
          <div className="rounded-2xl bg-card p-8 shadow-sm border border-red-500/20 text-center max-w-md mx-auto">
            <AlertTriangle className="mx-auto h-10 w-10 text-red-400 mb-3" />
            <h3 className="text-base font-black text-text-light uppercase mb-2">
              Error al Cargar Rendimiento
            </h3>
            <p className="text-xs text-text-light/60 mb-5">{errorMessage}</p>
            <button
              type="button"
              onClick={() => fetchData(period)}
              className="rounded-xl bg-emerald-600 px-5 py-2 text-xs font-black text-white uppercase tracking-wider hover:bg-emerald-500 transition-all"
            >
              Reintentar
            </button>
          </div>
        ) : (
          <div className="space-y-8">
            {/* 1. Tarjetas Resumen KPI */}
            <PerformanceSummaryKPIs kpis={data?.kpis} />

            {/* 2. Gráfica Principal: Evolución del Ticket Promedio */}
            <AverageTicketTrendChart
              data={data?.dailyTickets || []}
              periodAverageTicket={data?.kpis?.periodAverageTicket || 0}
            />

            {/* 3. Rejilla Inferior: Día de la Semana y Meses Históricos */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <WeekdaySalesChart data={data?.weekdaySales || []} />
              <MonthlySalesChart data={data?.monthlySales || []} />
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
