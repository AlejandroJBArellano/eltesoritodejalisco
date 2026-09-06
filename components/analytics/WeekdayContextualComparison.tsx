"use client";

import React, { useState, useMemo } from "react";
import { ArrowDownRight, ArrowUpRight, Calendar, X } from "lucide-react";
import type { WeekdaySalesRow } from "@/lib/services/performanceAnalytics";

export interface WeekdayContextualComparisonProps {
  day: WeekdaySalesRow;
  onClose?: () => void;
}

export function WeekdayContextualComparison({
  day,
  onClose,
}: WeekdayContextualComparisonProps) {
  // Default to the most recent occurrence (last in the chronologically sorted list)
  const defaultOccurrence =
    day.occurrences.length > 0
      ? day.occurrences[day.occurrences.length - 1].date
      : null;

  const [selectedDate, setSelectedDate] = useState<string | null>(
    defaultOccurrence,
  );

  // If the day prop changes and selectedDate is not in the new occurrences, reset to last
  const activeOccurrence = useMemo(() => {
    if (!day.occurrences.length) return null;
    const found = day.occurrences.find((occ) => occ.date === selectedDate);
    return found || day.occurrences[day.occurrences.length - 1];
  }, [day.occurrences, selectedDate]);

  const baseline = day.historicalBaseline;

  // Helper to format currency
  const formatCurrency = (val: number) =>
    `$${val.toLocaleString("es-MX", {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  // Helper to calculate and format diffs
  const getMetricsDiff = (current: number, base: number, isCurrency = true) => {
    const diff = current - base;
    const pct = base > 0 ? (diff / base) * 100 : current > 0 ? 100 : 0;
    const isPositive = diff >= 0;
    const diffFormatted = isCurrency
      ? `${isPositive ? "+" : "-"}${formatCurrency(Math.abs(diff))}`
      : `${isPositive ? "+" : ""}${diff.toFixed(1)}`;
    const pctFormatted = `${isPositive ? "+" : ""}${pct.toFixed(1)}%`;
    return { diff, pct, isPositive, diffFormatted, pctFormatted };
  };

  const ticketDiff = activeOccurrence
    ? getMetricsDiff(activeOccurrence.averageTicket, baseline.averageTicket, true)
    : null;

  const salesDiff = activeOccurrence
    ? getMetricsDiff(activeOccurrence.sales, baseline.averageSales, true)
    : null;

  const ordersDiff = activeOccurrence
    ? getMetricsDiff(activeOccurrence.orders, baseline.averageOrders, false)
    : null;

  return (
    <div
      data-testid="weekday-contextual-comparison"
      className="mt-6 rounded-2xl bg-dark/60 border border-amber-500/30 p-5 sm:p-6 shadow-xl transition-all"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border pb-3 mb-4">
        <div className="flex items-center gap-2">
          <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
          <h3 className="text-sm font-black text-white uppercase tracking-wider">
            Comparativa Contextual: {day.name}
          </h3>
          <span className="text-[10px] font-bold text-text-light/50 hidden sm:inline">
            • vs promedio habitual de los {day.name.toLowerCase()}s
          </span>
        </div>
        {onClose && (
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar comparativa"
            className="rounded-lg p-1 text-text-light/60 hover:text-white hover:bg-white/10 transition-all active:scale-95"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>

      {/* Selector de ocurrencias si hay más de 1 en el período */}
      {day.occurrences.length > 1 && (
        <div className="mb-5 flex flex-wrap items-center gap-2">
          <span className="text-xs font-bold text-text-light/60 uppercase flex items-center gap-1.5 mr-1">
            <Calendar className="h-3.5 w-3.5 text-amber-400" /> Fecha:
          </span>
          {day.occurrences.map((occ) => {
            const isSelected = activeOccurrence?.date === occ.date;
            return (
              <button
                type="button"
                key={occ.date}
                onClick={() => setSelectedDate(occ.date)}
                className={`rounded-xl px-3 py-1.5 text-xs font-bold transition-all active:scale-95 ${
                  isSelected
                    ? "bg-amber-500 text-black shadow-md shadow-amber-500/20 font-black"
                    : "bg-dark/40 text-text-light/70 hover:bg-white/10 hover:text-white border border-border"
                }`}
              >
                {occ.label}
              </button>
            );
          })}
        </div>
      )}

      {/* Si hay datos para la ocurrencia seleccionada */}
      {activeOccurrence ? (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
          {/* 1. Ticket Promedio */}
          <div className="rounded-xl bg-card border border-border p-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-light/60 block mb-1">
              Ticket Promedio
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-white">
                {formatCurrency(activeOccurrence.averageTicket)}
              </span>
              {ticketDiff && (
                <span
                  className={`inline-flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    ticketDiff.isPositive
                      ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                      : "text-red-400 bg-red-500/10 border border-red-500/20"
                  }`}
                >
                  {ticketDiff.isPositive ? (
                    <ArrowUpRight className="h-3 w-3 inline" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 inline" />
                  )}
                  {ticketDiff.pctFormatted}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-text-light/60 font-semibold">
              Habitual: {formatCurrency(baseline.averageTicket)}
            </p>
            {ticketDiff && (
              <p
                className={`text-[10px] font-bold mt-0.5 ${
                  ticketDiff.isPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {ticketDiff.diffFormatted} vs promedio
              </p>
            )}
          </div>

          {/* 2. Facturación */}
          <div className="rounded-xl bg-card border border-border p-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-light/60 block mb-1">
              Facturación
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-white">
                {formatCurrency(activeOccurrence.sales)}
              </span>
              {salesDiff && (
                <span
                  className={`inline-flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    salesDiff.isPositive
                      ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                      : "text-red-400 bg-red-500/10 border border-red-500/20"
                  }`}
                >
                  {salesDiff.isPositive ? (
                    <ArrowUpRight className="h-3 w-3 inline" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 inline" />
                  )}
                  {salesDiff.pctFormatted}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-text-light/60 font-semibold">
              Habitual: {formatCurrency(baseline.averageSales)}
            </p>
            {salesDiff && (
              <p
                className={`text-[10px] font-bold mt-0.5 ${
                  salesDiff.isPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {salesDiff.diffFormatted} vs promedio
              </p>
            )}
          </div>

          {/* 3. Volumen de Pedidos */}
          <div className="rounded-xl bg-card border border-border p-4">
            <span className="text-[11px] font-black uppercase tracking-wider text-text-light/60 block mb-1">
              Pedidos
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-black text-white">
                {activeOccurrence.orders} órdenes
              </span>
              {ordersDiff && (
                <span
                  className={`inline-flex items-center text-[10px] font-black px-1.5 py-0.5 rounded-full ${
                    ordersDiff.isPositive
                      ? "text-emerald-400 bg-emerald-500/10 border border-emerald-500/20"
                      : "text-red-400 bg-red-500/10 border border-red-500/20"
                  }`}
                >
                  {ordersDiff.isPositive ? (
                    <ArrowUpRight className="h-3 w-3 inline" />
                  ) : (
                    <ArrowDownRight className="h-3 w-3 inline" />
                  )}
                  {ordersDiff.pctFormatted}
                </span>
              )}
            </div>
            <p className="mt-1.5 text-[11px] text-text-light/60 font-semibold">
              Habitual: {baseline.averageOrders} órdenes
            </p>
            {ordersDiff && (
              <p
                className={`text-[10px] font-bold mt-0.5 ${
                  ordersDiff.isPositive ? "text-emerald-400" : "text-red-400"
                }`}
              >
                {ordersDiff.diffFormatted} órdenes vs promedio
              </p>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-card border border-border p-4 text-center">
          <p className="text-xs font-bold text-text-light/50">
            No hubo órdenes en este día durante el período. Promedio histórico:{" "}
            <span className="text-white font-black">
              {formatCurrency(baseline.averageTicket)}
            </span>{" "}
            de ticket y{" "}
            <span className="text-white font-black">
              {formatCurrency(baseline.averageSales)}
            </span>{" "}
            de ventas ({baseline.averageOrders} órdenes/día).
          </p>
        </div>
      )}
    </div>
  );
}
