"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { PERIOD_LABELS, type Period } from "./types";

export interface ReportsPeriodFilterProps {
  period: Period;
  onPeriodChange: (p: Period) => void;
  customStartDate: string;
  customEndDate: string;
  onCustomStartDateChange: (val: string) => void;
  onCustomEndDateChange: (val: string) => void;
  onApplyCustomDates: () => void;
}

export function ReportsPeriodFilter({
  period,
  onPeriodChange,
  customStartDate,
  customEndDate,
  onCustomStartDateChange,
  onCustomEndDateChange,
  onApplyCustomDates,
}: ReportsPeriodFilterProps) {
  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm border border-border">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xs font-extrabold text-text-light/50 uppercase tracking-widest flex items-center gap-2">
          <Calendar className="h-4 w-4 text-primary" /> Filtro de Período y Fechas
        </h2>
      </div>

      <div className="flex flex-wrap items-center gap-2.5">
        {(Object.keys(PERIOD_LABELS) as Period[]).map((p) => (
          <button
            type="button"
            key={p}
            onClick={() => onPeriodChange(p)}
            className={`rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-primary focus-visible:outline-none ${
              period === p
                ? "bg-primary text-black shadow-md shadow-primary/20 scale-[1.02]"
                : "bg-dark/40 text-text-light/60 hover:bg-white/10 hover:text-white border border-border"
            }`}
          >
            {PERIOD_LABELS[p]}
          </button>
        ))}
      </div>

      {/* Custom Date Range Controls */}
      {period === "custom" && (
        <div className="mt-4 flex flex-wrap items-center gap-4 pt-4 border-t border-border">
          <div className="flex items-center gap-2">
            <label
              htmlFor="custom-start-date"
              className="text-xs font-bold text-text-light/60 uppercase tracking-wider"
            >
              Desde:
            </label>
            <input
              id="custom-start-date"
              type="date"
              value={customStartDate}
              onChange={(e) => onCustomStartDateChange(e.target.value)}
              className="rounded-xl border border-border bg-dark/40 px-3.5 py-2 text-xs text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex items-center gap-2">
            <label
              htmlFor="custom-end-date"
              className="text-xs font-bold text-text-light/60 uppercase tracking-wider"
            >
              Hasta:
            </label>
            <input
              id="custom-end-date"
              type="date"
              value={customEndDate}
              onChange={(e) => onCustomEndDateChange(e.target.value)}
              className="rounded-xl border border-border bg-dark/40 px-3.5 py-2 text-xs text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
          </div>
          <button
            type="button"
            onClick={onApplyCustomDates}
            disabled={!customStartDate}
            className="rounded-xl bg-success px-5 py-2 text-xs font-black text-white uppercase tracking-wider hover:bg-success/90 disabled:opacity-40 disabled:cursor-not-allowed transition-all shadow-sm active:scale-95 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none"
          >
            Aplicar Rango
          </button>
        </div>
      )}
    </section>
  );
}
