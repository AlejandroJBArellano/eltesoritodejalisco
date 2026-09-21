"use client";

import React from "react";
import {
  AlertTriangle,
  Clock,
  DollarSign,
  ReceiptText,
  Sparkles,
  TrendingDown,
  UserPlus,
  Wallet,
} from "lucide-react";
import type { ReportData } from "./types";
import { useReportsContextNullable } from "./ReportsContext";

export interface FinancialSummaryKPIsProps {
  summary?: ReportData["summary"];
  newCustomersCount?: number;
  netUtility?: number;
}

export function FinancialSummaryKPIs(props: FinancialSummaryKPIsProps = {}) {
  const context = useReportsContextNullable();
  const summary = props.summary ?? context?.data?.summary;
  const newCustomersCount =
    props.newCustomersCount ?? context?.data?.customers?.newCustomersCount ?? 0;
  const netUtility = props.netUtility ?? context?.netUtility ?? 0;
  const formatCurrency = (val: number) => {
    const isNegative = val < 0;
    const formatted = Math.abs(val).toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    });
    return isNegative ? `-$${formatted}` : `$${formatted}`;
  };

  return (
    <section>
      <div className="mb-3.5 flex items-center justify-between border-b border-border pb-2.5">
        <h2 className="text-sm sm:text-base font-bold text-text-light tracking-tight uppercase flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
          <span>Resumen Financiero y Operativo</span>
        </h2>
      </div>

      <div className="grid gap-3 sm:gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* Venta Bruta */}
        <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
              Venta Bruta
            </span>
            <div className="rounded-lg bg-emerald-500/10 p-2 text-emerald-400 shrink-0">
              <DollarSign className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-text-light tracking-tight tabular-nums font-mono">
              {formatCurrency(summary?.totalSales || 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-text-light/40 font-normal truncate">
              Total ingresado ({summary?.totalOrders || 0} órdenes)
            </p>
          </div>
        </div>

        {/* Gastos Generales */}
        <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
              Gastos Operativos
            </span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 shrink-0">
              <TrendingDown className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-rose-400 tracking-tight tabular-nums font-mono">
              -{formatCurrency(summary?.totalExpenses || 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-text-light/40 font-normal truncate">
              Insumos, sueldos y servicios
            </p>
          </div>
        </div>

        {/* Utilidad Neta */}
        <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
              Utilidad Neta
            </span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <Wallet className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p
              className={`mt-2 text-xl sm:text-2xl font-bold tracking-tight tabular-nums font-mono truncate ${
                netUtility >= 0 ? "text-primary" : "text-rose-400"
              }`}
            >
              {formatCurrency(netUtility)}
            </p>
            <p className="mt-0.5 text-[11px] text-text-light/40 font-normal truncate">
              {summary?.totalCardCommissions && summary.totalCardCommissions > 0
                ? `Menos gastos y comisiones (-$${summary.totalCardCommissions.toFixed(2)})`
                : "Menos gastos operativos"}
            </p>
          </div>
        </div>

        {/* Ticket Promedio */}
        <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
              Ticket Promedio
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 shrink-0">
              <ReceiptText className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-text-light tracking-tight tabular-nums font-mono">
              {formatCurrency(summary?.averageTicket || 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-text-light/40 font-normal truncate">
              Promedio ingresado por orden
            </p>
          </div>
        </div>

        {/* Tiempo Preparación */}
        <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
              Tiempo Promedio KDS
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 shrink-0">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-text-light tracking-tight tabular-nums font-mono">
              {Math.round(summary?.averageCompletionTimeMinutes || 0)}{" "}
              <span className="text-xs font-semibold text-text-light/50 uppercase">
                min
              </span>
            </p>
            <p className="mt-0.5 text-[11px] text-text-light/40 font-normal truncate">
              Tiempo en cocina
            </p>
          </div>
        </div>

        {/* Propinas Totales */}
        <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
              Propinas Totales
            </span>
            <div className="rounded-lg bg-amber-500/10 p-2 text-amber-400 shrink-0">
              <Sparkles className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-amber-400 tracking-tight tabular-nums font-mono">
              {formatCurrency(summary?.totalTips || 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-text-light/40 font-normal truncate">
              Gratificaciones del personal
            </p>
          </div>
        </div>

        {/* Por Cobrar / Fugas */}
        <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
              Pérdidas por Cobro
            </span>
            <div className="rounded-lg bg-rose-500/10 p-2 text-rose-400 shrink-0">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-rose-400 tracking-tight tabular-nums font-mono">
              {formatCurrency(summary?.totalUncollected || 0)}
            </p>
            <p className="mt-0.5 text-[11px] text-text-light/40 font-normal truncate">
              Órdenes no cobradas
            </p>
          </div>
        </div>

        {/* Nuevos Clientes */}
        <div className="group relative rounded-xl bg-card p-4 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between shadow-xs">
          <div className="flex items-center justify-between gap-2">
            <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider truncate">
              Nuevos Clientes
            </span>
            <div className="rounded-lg bg-primary/10 p-2 text-primary shrink-0">
              <UserPlus className="h-4 w-4" />
            </div>
          </div>
          <div>
            <p className="mt-2 text-xl sm:text-2xl font-bold text-text-light tracking-tight tabular-nums font-mono">
              {newCustomersCount}
            </p>
            <p className="mt-0.5 text-[11px] text-text-light/40 font-normal truncate">
              Registrados en el período
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
