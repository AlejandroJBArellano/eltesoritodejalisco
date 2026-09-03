"use client";

import React from "react";
import { DollarSign, FileText, ReceiptText, TrendingUp } from "lucide-react";
import type { GastosSummary } from "./types";

export interface GastosSummaryKPIsProps {
  summary: GastosSummary;
  currentMonth: string;
}

export function GastosSummaryKPIs({
  summary,
  currentMonth,
}: GastosSummaryKPIsProps) {
  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const formatted = Math.abs(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return isNegative ? `-$${formatted}` : `$${formatted}`;
  };

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
      {/* Total Gastos */}
      <div className="rounded-2xl bg-card p-5 shadow-sm border border-border transition-all hover:border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Gastos Totales ({currentMonth})
          </span>
          <div className="rounded-xl bg-red-500/10 p-2.5 text-red-400">
            <ReceiptText className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black text-text-light tracking-tight tabular-nums">
          {formatCurrency(summary.totalExpenses)}
        </p>
      </div>

      {/* Gastos Facturados */}
      <div className="rounded-2xl bg-card p-5 shadow-sm border border-border transition-all hover:border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Gastos Facturados
          </span>
          <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400">
            <FileText className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black text-text-light tracking-tight tabular-nums">
          {formatCurrency(summary.invoicedExpensesTotal)}
        </p>
      </div>

      {/* Ventas del Mes */}
      <div className="rounded-2xl bg-card p-5 shadow-sm border border-border transition-all hover:border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Ventas del Mes
          </span>
          <div className="rounded-xl bg-success/10 p-2.5 text-success">
            <DollarSign className="h-5 w-5" />
          </div>
        </div>
        <p className="mt-2 text-2xl font-black text-text-light tracking-tight tabular-nums">
          {formatCurrency(summary.totalSales)}
        </p>
      </div>

      {/* Utilidad Neta */}
      <div className="rounded-2xl bg-card p-5 shadow-sm border border-border transition-all hover:border-border">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Utilidad Neta (Margen)
          </span>
          <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>
        <div className="mt-2 flex items-baseline gap-2">
          <p
            className={`text-2xl font-black tracking-tight tabular-nums ${
              summary.netUtility >= 0 ? "text-emerald-400" : "text-red-400"
            }`}
          >
            {formatCurrency(summary.netUtility)}
          </p>
          <span
            className={`text-xs font-black uppercase rounded-md px-1.5 py-0.5 ${
              summary.profitMargin >= 0
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-red-500/10 text-red-400"
            }`}
          >
            {summary.profitMargin.toFixed(1)}%
          </span>
        </div>
      </div>
    </div>
  );
}
