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

export interface FinancialSummaryKPIsProps {
  summary: ReportData["summary"];
  newCustomersCount?: number;
  netUtility: number;
}

export function FinancialSummaryKPIs({
  summary,
  newCustomersCount = 0,
  netUtility,
}: FinancialSummaryKPIsProps) {
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
      <div className="mb-4 flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-success"></span>
          Resumen Financiero y Operativo
        </h2>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        {/* Venta Bruta */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
              Venta Bruta
            </span>
            <div className="rounded-xl bg-success/10 p-3 text-success">
              <DollarSign className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-text-light tracking-tight">
            {formatCurrency(summary?.totalSales || 0)}
          </p>
          <p className="mt-1 text-xs text-text-light/40 font-medium">
            Total ingresado a caja ({summary?.totalOrders || 0} órdenes)
          </p>
        </div>

        {/* Gastos Generales */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
              Gastos Operativos
            </span>
            <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
              <TrendingDown className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-red-400 tracking-tight">
            -{formatCurrency(summary?.totalExpenses || 0)}
          </p>
          <p className="mt-1 text-xs text-text-light/40 font-medium">
            Insumos, sueldos y servicios
          </p>
        </div>

        {/* Utilidad Neta */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
              Utilidad Neta
            </span>
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Wallet className="h-5 w-5" />
            </div>
          </div>
          <p
            className={`mt-3 text-3xl font-black tracking-tight ${
              netUtility >= 0 ? "text-primary" : "text-red-400"
            }`}
          >
            {formatCurrency(netUtility)}
          </p>
          <p className="mt-1 text-xs text-text-light/40 font-medium">
            Ventas brutas menos gastos
          </p>
        </div>

        {/* Ticket Promedio */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
              Ticket Promedio
            </span>
            <div className="rounded-xl bg-secondary/10 p-3 text-secondary">
              <ReceiptText className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-text-light tracking-tight">
            {formatCurrency(summary?.averageTicket || 0)}
          </p>
          <p className="mt-1 text-xs text-text-light/40 font-medium">
            Promedio ingresado por orden
          </p>
        </div>

        {/* Tiempo Preparación */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
              Tiempo Promedio KDS
            </span>
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
              <Clock className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-text-light tracking-tight">
            {Math.round(summary?.averageCompletionTimeMinutes || 0)}{" "}
            <span className="text-sm font-bold text-text-light/50 uppercase">
              min
            </span>
          </p>
          <p className="mt-1 text-xs text-text-light/40 font-medium">
            Tiempo de preparación en cocina
          </p>
        </div>

        {/* Propinas Totales */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
              Propinas Totales
            </span>
            <div className="rounded-xl bg-amber-500/10 p-3 text-amber-400">
              <Sparkles className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-amber-400 tracking-tight">
            {formatCurrency(summary?.totalTips || 0)}
          </p>
          <p className="mt-1 text-xs text-text-light/40 font-medium">
            Gratificaciones a meseros y barra
          </p>
        </div>

        {/* Por Cobrar / Fugas */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
              Pérdidas por Cobro
            </span>
            <div className="rounded-xl bg-red-500/10 p-3 text-red-400">
              <AlertTriangle className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-red-400 tracking-tight">
            {formatCurrency(summary?.totalUncollected || 0)}
          </p>
          <p className="mt-1 text-xs text-text-light/40 font-medium">
            Órdenes no cobradas en el período
          </p>
        </div>

        {/* Nuevos Clientes */}
        <div className="rounded-2xl bg-card p-6 shadow-sm border border-border transition-all hover:border-border">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
              Nuevos Clientes
            </span>
            <div className="rounded-xl bg-blue-500/10 p-3 text-blue-400">
              <UserPlus className="h-5 w-5" />
            </div>
          </div>
          <p className="mt-3 text-3xl font-black text-text-light tracking-tight">
            {newCustomersCount}
          </p>
          <p className="mt-1 text-xs text-text-light/40 font-medium">
            Clientes registrados en el período
          </p>
        </div>
      </div>
    </section>
  );
}
