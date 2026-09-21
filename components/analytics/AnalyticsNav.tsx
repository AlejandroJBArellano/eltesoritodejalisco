"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, Clock, TrendingUp } from "lucide-react";

export type AnalyticsActiveTab = "sales" | "hourly" | "performance";

export interface AnalyticsNavProps {
  activeTab: AnalyticsActiveTab;
}

export function AnalyticsNav({ activeTab }: AnalyticsNavProps) {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4 mb-6">
      <div className="flex items-center gap-2">
        <Link
          href="/reports"
          className="inline-flex items-center gap-2 rounded-lg bg-dark/40 border border-border px-3.5 py-2 text-xs font-bold text-text-light hover:text-white hover:bg-card-light transition-all active:scale-[0.98] shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Reportes
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-1.5 bg-dark/40 p-1 rounded-xl border border-border">
        <Link
          href="/analytics/sales"
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-[0.98] ${
            activeTab === "sales"
              ? "bg-primary text-dark shadow-xs"
              : "text-text-light/60 hover:text-text-light hover:bg-card-light"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Ventas & Productos
        </Link>
        <Link
          href="/analytics/hourly"
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-[0.98] ${
            activeTab === "hourly"
              ? "bg-amber-500 text-dark shadow-xs"
              : "text-text-light/60 hover:text-text-light hover:bg-card-light"
          }`}
        >
          <Clock className="h-4 w-4" />
          Horas Pico & Calor
        </Link>
        <Link
          href="/analytics/performance"
          className={`inline-flex items-center gap-2 px-3.5 py-2 text-xs font-bold uppercase tracking-wider rounded-lg transition-all active:scale-[0.98] ${
            activeTab === "performance"
              ? "bg-emerald-500 text-dark shadow-xs"
              : "text-text-light/60 hover:text-text-light hover:bg-card-light"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Rendimiento
        </Link>
      </div>
    </div>
  );
}

