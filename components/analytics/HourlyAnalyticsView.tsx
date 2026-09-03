"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  BarChart3,
  Calendar,
  Filter,
  Flame,
  RefreshCw,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { AnalyticsNav } from "./AnalyticsNav";
import { PeakHoursCards } from "./PeakHoursCards";
import { HourlySalesBarChart } from "./HourlySalesBarChart";
import { HourlySalesHeatmap } from "./HourlySalesHeatmap";
import { HourlyBreakdownTable } from "./HourlyBreakdownTable";
import type {
  HeatmapCell,
  HourlyAggregationMode,
  HourlySalesRow,
  PeakHoursSummary,
} from "@/lib/services/hourlyAnalytics";

export type Period =
  | "today"
  | "yesterday"
  | "7days"
  | "30days"
  | "month"
  | "last_month"
  | "custom";

export const PERIOD_LABELS: Record<Period, string> = {
  today: "Hoy",
  yesterday: "Ayer",
  "7days": "Últimos 7 días",
  "30days": "Últimos 30 días",
  month: "Mes Actual",
  last_month: "Mes Anterior",
  custom: "Personalizado",
};

export type ActiveTab = "bar" | "heatmap";

export interface HourlyApiResponse {
  period: string;
  startIsoDate?: string;
  endIsoDate?: string | null;
  rows: HourlySalesRow[];
  allRows: HourlySalesRow[];
  heatmapCells: HeatmapCell[];
  peakHoursSummary: PeakHoursSummary;
  divisor: number;
  mode: HourlyAggregationMode;
}

export function HourlyAnalyticsView() {
  const [period, setPeriod] = useState<Period>("today");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const [activeTab, setActiveTab] = useState<ActiveTab>("bar");
  const [mode, setMode] = useState<HourlyAggregationMode>("sum");
  const [onlyActiveHours, setOnlyActiveHours] = useState<boolean>(false);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [data, setData] = useState<HourlyApiResponse | null>(null);

  const fetchData = async (
    p: Period,
    currentMode: HourlyAggregationMode,
    activeOnly: boolean,
    startStr?: string,
    endStr?: string,
  ) => {
    try {
      setIsLoading(true);
      setErrorMessage(null);

      let url = `/api/analytics/hourly?period=${p}&mode=${currentMode}&onlyActiveHours=${activeOnly}`;
      if (p === "custom") {
        if (startStr) url += `&startDate=${startStr}`;
        if (endStr) url += `&endDate=${endStr}`;
      }

      const response = await fetch(url);
      const json = await response.json();
      if (!response.ok) {
        throw new Error(json.error || "Error al cargar datos de horas pico");
      }
      setData(json);
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "Error desconocido de red",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData(period, mode, onlyActiveHours);
  }, [period, mode, onlyActiveHours]);

  const handlePeriodChange = (p: Period) => {
    setPeriod(p);
    if (p !== "custom") {
      fetchData(p, mode, onlyActiveHours);
    }
  };

  const handleApplyCustomDates = () => {
    if (!customStartDate) return;
    fetchData(period, mode, onlyActiveHours, customStartDate, customEndDate);
  };

  const isMultiDay =
    period !== "today" && period !== "yesterday";

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Header */}
      <PageHeader
        title="Ventas por Hora & Horas Pico"
        subtitle={`Detección de horas de mayor concurrencia y flujo de pedidos (${PERIOD_LABELS[period]})`}
        badgeColor="bg-amber-500"
        actions={
          <div className="flex items-center gap-3">
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 rounded-xl bg-dark/60 border border-border px-3.5 py-2 text-xs font-black text-text-light hover:text-white hover:bg-white/10 transition-all active:scale-95"
            >
              <ArrowLeft className="h-4 w-4" />
              Volver a Reportes
            </Link>
            <button
              type="button"
              data-testid="refresh-btn"
              onClick={() => fetchData(period, mode, onlyActiveHours, customStartDate, customEndDate)}
              disabled={isLoading}
              className="inline-flex items-center gap-2 rounded-xl bg-amber-500/10 border border-amber-500/30 px-3.5 py-2 text-xs font-black text-amber-400 hover:bg-amber-500/20 transition-all active:scale-95 disabled:opacity-50"
            >
              <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
              Actualizar
            </button>
          </div>
        }
      />

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {/* Navegación entre pestañas de Analytics y retorno a Reportes */}
        <AnalyticsNav activeTab="hourly" />

        {/* Controls Bar: Period + View Filters */}
        <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-6">
          {/* Periods */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2">
                <Calendar className="h-4 w-4 text-amber-400" />
                Período de Análisis
              </h2>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {(
                [
                  "today",
                  "yesterday",
                  "7days",
                  "30days",
                  "month",
                  "last_month",
                  "custom",
                ] as Period[]
              ).map((p) => (
                <button
                  key={p}
                  type="button"
                  data-testid={`period-btn-${p}`}
                  onClick={() => handlePeriodChange(p)}
                  className={`rounded-xl px-4 py-2 text-xs font-black uppercase tracking-wider transition-all active:scale-95 ${
                    period === p
                      ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 scale-[1.02]"
                      : "bg-dark/40 text-text-light/60 hover:bg-white/10 hover:text-white border border-border"
                  }`}
                >
                  {PERIOD_LABELS[p]}
                </button>
              ))}
            </div>

            {/* Custom Dates Input */}
            {period === "custom" && (
              <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-border">
                <div className="flex items-center gap-2 text-xs font-bold text-text-light">
                  <label htmlFor="customStart">Desde:</label>
                  <input
                    id="customStart"
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    className="rounded-xl border border-border bg-dark/50 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 text-xs font-bold text-text-light">
                  <label htmlFor="customEnd">Hasta:</label>
                  <input
                    id="customEnd"
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    className="rounded-xl border border-border bg-dark/50 px-3 py-1.5 text-xs text-white focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <button
                  type="button"
                  onClick={handleApplyCustomDates}
                  className="rounded-xl bg-amber-500 px-4 py-1.5 text-xs font-black text-black uppercase tracking-wider hover:brightness-105 active:scale-95"
                >
                  Aplicar Rango
                </button>
              </div>
            )}
          </div>

          {/* Secondary Controls: View Tab, Mode Switch, Active Hours Switch */}
          <div className="flex flex-wrap items-center justify-between gap-4 pt-4 border-t border-border">
            {/* View Tabs */}
            <div className="flex items-center bg-dark/60 p-1 rounded-xl border border-border">
              <button
                type="button"
                data-testid="tab-btn-bar"
                onClick={() => setActiveTab("bar")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "bar"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-text-light/60 hover:text-white"
                }`}
              >
                <BarChart3 className="h-4 w-4" />
                Gráfica de Barras
              </button>
              <button
                type="button"
                data-testid="tab-btn-heatmap"
                onClick={() => setActiveTab("heatmap")}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                  activeTab === "heatmap"
                    ? "bg-amber-500 text-black shadow-sm"
                    : "text-text-light/60 hover:text-white"
                }`}
              >
                <Calendar className="h-4 w-4" />
                Mapa de Calor Semanal
              </button>
            </div>

            {/* Mode & Active Filter Toggles */}
            <div className="flex flex-wrap items-center gap-3">
              {/* Aggregation Mode (only relevant if multiple days) */}
              {isMultiDay && (
                <div className="flex items-center bg-dark/60 p-1 rounded-xl border border-border">
                  <button
                    type="button"
                    data-testid="mode-btn-sum"
                    onClick={() => setMode("sum")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      mode === "sum"
                        ? "bg-white/15 text-white"
                        : "text-text-light/50 hover:text-white"
                    }`}
                  >
                    Total Acumulado
                  </button>
                  <button
                    type="button"
                    data-testid="mode-btn-average"
                    onClick={() => setMode("average")}
                    className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                      mode === "average"
                        ? "bg-white/15 text-white"
                        : "text-text-light/50 hover:text-white"
                    }`}
                  >
                    Promedio / Día
                  </button>
                </div>
              )}

              {/* Only Active Hours Filter */}
              <button
                type="button"
                data-testid="toggle-active-hours"
                onClick={() => setOnlyActiveHours((prev) => !prev)}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all ${
                  onlyActiveHours
                    ? "bg-amber-500/15 border-amber-500/40 text-amber-300"
                    : "bg-dark/40 border-border text-text-light/60 hover:text-white"
                }`}
              >
                <Filter className="h-3.5 w-3.5" />
                {onlyActiveHours ? "Solo Horas Activas" : "24 Horas Completas"}
              </button>
            </div>
          </div>
        </section>

        {/* Error message */}
        {errorMessage && (
          <div className="rounded-2xl bg-red-500/10 border border-red-500/30 p-4 text-xs font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Loading Skeleton */}
        {isLoading && (
          <div
            data-testid="loading-state"
            className="flex items-center justify-center py-24 text-text-light/60 text-xs font-bold uppercase tracking-wider"
          >
            <div className="flex items-center gap-3">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-amber-500 border-t-transparent" />
              Calculando horas pico y flujo de ventas...
            </div>
          </div>
        )}

        {/* Content */}
        {!isLoading && data && (
          <>
            {/* 1. Peak Hours Detector KPI Cards */}
            <section>
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2">
                  <Flame className="h-4 w-4 text-amber-400" />
                  Detector de Horas Pico & Flujo
                </h2>
              </div>
              <PeakHoursCards
                summary={data.peakHoursSummary}
                mode={data.mode}
              />
            </section>

            {/* 2. Visualizations (Bar Chart or Heatmap) */}
            <section>
              {activeTab === "bar" ? (
                <HourlySalesBarChart
                  data={data.rows}
                  mode={data.mode}
                />
              ) : (
                <HourlySalesHeatmap
                  cells={data.heatmapCells}
                  mode={data.mode}
                />
              )}
            </section>

            {/* 3. Detailed Hourly Breakdown Table */}
            <section>
              <HourlyBreakdownTable
                rows={data.rows}
                mode={data.mode}
                periodLabel={PERIOD_LABELS[period]}
              />
            </section>
          </>
        )}
      </main>
    </div>
  );
}
