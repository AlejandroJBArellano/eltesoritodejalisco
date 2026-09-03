"use client";

import React from "react";
import { Award, Flame, TrendingUp, Zap } from "lucide-react";
import type {
  HourlyAggregationMode,
  PeakHoursSummary,
} from "@/lib/services/hourlyAnalytics";

interface PeakHoursCardsProps {
  summary?: PeakHoursSummary | null;
  mode?: HourlyAggregationMode;
}

export function PeakHoursCards({
  summary,
  mode = "sum",
}: PeakHoursCardsProps) {
  const isAvg = mode === "average";
  const peakSales = summary?.peakSalesHour;
  const peakOrders = summary?.peakOrdersHour;
  const rush = summary?.rushWindow;
  const peakTicket = summary?.peakTicketHour;

  return (
    <div
      data-testid="peak-hours-cards"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
    >
      {/* 1. Hora Pico de Ventas */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-amber-500/20 p-5 shadow-sm transition-all hover:border-amber-500/40">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-text-light/60">
            {isAvg ? "Pico Ventas (Prom.)" : "Pico de Facturación"}
          </span>
          <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400">
            <Zap className="h-4 w-4" />
          </div>
        </div>
        {peakSales ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {peakSales.label}
              </span>
              <span className="text-xs font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                {peakSales.percentage}% del total
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-text-light/70">
              ${peakSales.amount.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              {isAvg ? " / día" : ""}
            </p>
          </div>
        ) : (
          <div className="text-sm font-bold text-text-light/40 py-2">
            Sin ventas en el período
          </div>
        )}
      </div>

      {/* 2. Hora Pico de Volumen */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-orange-500/20 p-5 shadow-sm transition-all hover:border-orange-500/40">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-text-light/60">
            {isAvg ? "Pico Pedidos (Prom.)" : "Pico de Pedidos"}
          </span>
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400">
            <Flame className="h-4 w-4" />
          </div>
        </div>
        {peakOrders ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {peakOrders.label}
              </span>
              <span className="text-xs font-bold text-orange-400 bg-orange-500/10 px-2 py-0.5 rounded-full border border-orange-500/20">
                {peakOrders.percentage}% pedidos
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-text-light/70">
              {peakOrders.count} pedidos {isAvg ? " / día" : ""}
            </p>
          </div>
        ) : (
          <div className="text-sm font-bold text-text-light/40 py-2">
            Sin pedidos registrados
          </div>
        )}
      </div>

      {/* 3. Franja Más Activa (Rush Window) */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-purple-500/20 p-5 shadow-sm transition-all hover:border-purple-500/40">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-text-light/60">
            Ventana Rush (3h)
          </span>
          <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400">
            <TrendingUp className="h-4 w-4" />
          </div>
        </div>
        {rush ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                {rush.label}
              </span>
              <span className="text-xs font-bold text-purple-400 bg-purple-500/10 px-2 py-0.5 rounded-full border border-purple-500/20">
                {rush.percentage}% del día
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-text-light/70">
              ${rush.sales.toLocaleString("es-MX", { minimumFractionDigits: 2 })} ({rush.orders} ped.)
            </p>
          </div>
        ) : (
          <div className="text-sm font-bold text-text-light/40 py-2">
            Sin actividad suficiente
          </div>
        )}
      </div>

      {/* 4. Mayor Ticket Promedio */}
      <div className="relative overflow-hidden rounded-2xl bg-card border border-emerald-500/20 p-5 shadow-sm transition-all hover:border-emerald-500/40">
        <div className="flex items-center justify-between gap-3 mb-3">
          <span className="text-xs font-black uppercase tracking-wider text-text-light/60">
            Mayor Ticket Promedio
          </span>
          <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
            <Award className="h-4 w-4" />
          </div>
        </div>
        {peakTicket ? (
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-black text-white">
                ${peakTicket.averageTicket.toLocaleString("es-MX", { minimumFractionDigits: 2 })}
              </span>
              <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                a las {peakTicket.label}
              </span>
            </div>
            <p className="mt-1 text-sm font-semibold text-text-light/70">
              Base de {peakTicket.ordersCount} pedidos
            </p>
          </div>
        ) : (
          <div className="text-sm font-bold text-text-light/40 py-2">
            Sin datos de ticket
          </div>
        )}
      </div>
    </div>
  );
}
