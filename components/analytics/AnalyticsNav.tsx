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
          className="inline-flex items-center gap-2 rounded-xl bg-dark/60 border border-border px-3.5 py-2 text-xs font-black text-text-light hover:text-white hover:bg-white/10 transition-all active:scale-95 shadow-sm"
        >
          <ArrowLeft className="h-4 w-4" />
          Volver a Reportes
        </Link>
      </div>

      <div className="flex flex-wrap items-center gap-2 bg-dark/40 p-1 rounded-xl border border-border">
        <Link
          href="/analytics/sales"
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
            activeTab === "sales"
              ? "bg-purple-600 text-white shadow-md"
              : "text-text-light/60 hover:text-white"
          }`}
        >
          <BarChart3 className="h-4 w-4" />
          Ventas & Productos
        </Link>
        <Link
          href="/analytics/hourly"
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
            activeTab === "hourly"
              ? "bg-amber-500 text-black shadow-md shadow-amber-500/20"
              : "text-text-light/60 hover:text-white"
          }`}
        >
          <Clock className="h-4 w-4" />
          Horas Pico & Calor
        </Link>
        <Link
          href="/analytics/performance"
          className={`inline-flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-wider rounded-lg transition-all active:scale-95 ${
            activeTab === "performance"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-600/20"
              : "text-text-light/60 hover:text-white"
          }`}
        >
          <TrendingUp className="h-4 w-4" />
          Rendimiento
        </Link>
      </div>
    </div>
  );
}
