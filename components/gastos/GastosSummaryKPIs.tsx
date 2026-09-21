"use client";

import React from "react";
import { DollarSign, FileText, ReceiptText, TrendingUp } from "lucide-react";
import { useGastosContextNullable } from "./GastosContext";
import type { GastosSummary } from "./types";

export interface GastosSummaryKPIsProps {
  summary?: GastosSummary;
  currentMonth?: string;
}

const defaultSummary: GastosSummary = {
  totalExpenses: 0,
  fixedExpensesTotal: 0,
  variableExpensesTotal: 0,
  invoicedExpensesTotal: 0,
  totalSales: 0,
  netUtility: 0,
  profitMargin: 0,
};

export function GastosSummaryKPIs(props: GastosSummaryKPIsProps = {}) {
  const context = useGastosContextNullable();
  const summary = props.summary ?? context?.summary ?? defaultSummary;
  const currentMonth = props.currentMonth ?? context?.currentMonth ?? "";

  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const formatted = Math.abs(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return isNegative ? `-$${formatted}` : `$${formatted}`;
  };

  return (
    <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Gastos */}
      <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
            Gastos Totales ({currentMonth})
          </span>
          <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 shrink-0">
            <ReceiptText className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-xl sm:text-2xl font-bold text-text-light tracking-tight tabular-nums font-mono">
          {formatCurrency(summary.totalExpenses)}
        </p>
      </div>

      {/* Gastos Facturados */}
      <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
            Gastos Facturados
          </span>
          <div className="rounded-lg bg-blue-500/10 p-2 text-blue-400 shrink-0">
            <FileText className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-xl sm:text-2xl font-bold text-text-light tracking-tight tabular-nums font-mono">
          {formatCurrency(summary.invoicedExpensesTotal)}
        </p>
      </div>

      {/* Ventas del Mes */}
      <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
            Ventas del Mes
          </span>
          <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 shrink-0">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <p className="mt-2 text-xl sm:text-2xl font-bold text-text-light tracking-tight tabular-nums font-mono">
          {formatCurrency(summary.totalSales)}
        </p>
      </div>

      {/* Utilidad Neta */}
      <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
        <div className="flex items-center justify-between gap-2">
          <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
            Utilidad Neta (Margen)
          </span>
          <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2 min-w-0">
          <p
            className={`text-xl sm:text-2xl font-bold tracking-tight tabular-nums font-mono truncate ${
              summary.netUtility >= 0 ? "text-emerald-400" : "text-rose-400"
            }`}
          >
            {formatCurrency(summary.netUtility)}
          </p>
          <span
            className={`text-[10px] font-mono font-bold rounded-md px-1.5 py-0.5 shrink-0 ${
              summary.profitMargin >= 0
                ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
            }`}
          >
            {summary.profitMargin.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
