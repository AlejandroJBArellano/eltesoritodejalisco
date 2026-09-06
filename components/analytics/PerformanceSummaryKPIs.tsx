"use client";

import React from "react";
import { Award, DollarSign, Sparkles, Trophy } from "lucide-react";
import type { PerformanceKPIs } from "@/lib/services/performanceAnalytics";

interface PerformanceSummaryKPIsProps {
  kpis?: PerformanceKPIs | null;
}

export function PerformanceSummaryKPIs({ kpis }: PerformanceSummaryKPIsProps) {
  const avgTicket = kpis?.periodAverageTicket ?? 0;
  const totalSales = kpis?.totalPeriodSales ?? 0;
  const totalOrders = kpis?.totalPeriodOrders ?? 0;
  const bestDay = kpis?.bestWeekday;
  const recordMonth = kpis?.recordMonth;

  return (
    <div
      data-testid="performance-summary-kpis"
      className="grid grid-cols-1 sm:grid-cols-3 gap-4"
    >
      {/* 1. Ticket Promedio */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-emerald-500/20 p-5 shadow-sm transition-all hover:border-emerald-500/40">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-text-light/60">
            Ticket Promedio
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <DollarSign className="h-4 w-4" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-black text-white">
              ${avgTicket.toLocaleString("es-MX", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="mt-1 text-xs font-semibold text-text-light/70">
            {totalOrders > 0
              ? `${totalOrders} pedidos • Total $${totalSales.toLocaleString("es-MX")}`
              : "Sin pedidos registrados"}
          </p>
        </div>
      </div>

      {/* 2. Mejor Día de la Semana */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-amber-500/20 p-5 shadow-sm transition-all hover:border-amber-500/40">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-text-light/60">
            Mejor Día de la Semana
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Sparkles className="h-4 w-4" />
          </div>
        </div>
        {bestDay ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {bestDay.name}
              </span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                Líder
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-text-light/70">
              Promedio ${bestDay.averageSales.toLocaleString("es-MX", { minimumFractionDigits: 2 })} / día
            </p>
          </div>
        ) : (
          <div className="text-sm font-bold text-text-light/40 py-2">
            Sin datos en el período
          </div>
        )}
      </div>

      {/* 3. Mes Récord */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-purple-500/20 p-5 shadow-sm transition-all hover:border-purple-500/40">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-text-light/60">
            Mes Récord (Último Año)
          </span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <Trophy className="h-4 w-4" />
          </div>
        </div>
        {recordMonth ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {recordMonth.monthName}
              </span>
              <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                Récord
              </span>
            </div>
            <p className="mt-1 text-xs font-semibold text-text-light/70">
              Facturación ${recordMonth.totalSales.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
            </p>
          </div>
        ) : (
          <div className="text-sm font-bold text-text-light/40 py-2">
            Sin histórico de facturación
          </div>
        )}
      </div>
    </div>
  );
}
