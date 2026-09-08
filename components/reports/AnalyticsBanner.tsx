"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, Clock, Sparkles, ArrowRight } from "lucide-react";

export function AnalyticsBanner() {
  return (
    <section className="relative overflow-hidden rounded-2xl bg-linear-to-r from-purple-900/30 via-dark/60 to-amber-900/20 border border-purple-500/20 p-6 sm:p-8 shadow-sm">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-2 rounded-full bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-400 uppercase tracking-widest border border-purple-500/20">
            <Sparkles className="h-3.5 w-3.5" />
            Analítica Visual Integrada
          </div>
          <h3 className="text-xl font-black text-text-light tracking-tight">
            Descubre Tendencias Gráficas y Patrones de Venta
          </h3>
          <p className="text-xs text-text-light/60 font-medium">
            Visualiza la evolución de ingresos con drill-down diario, distribución por categoría en unidades o facturación, y analiza la concurrencia horaria con el mapa de calor interactivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/analytics/sales"
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white uppercase tracking-wider hover:bg-purple-500 active:scale-95 transition-all shadow-lg shadow-purple-600/20"
          >
            <BarChart3 className="h-4 w-4" />
            Tendencias y Productos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/analytics/hourly"
            className="inline-flex items-center gap-2 rounded-xl bg-amber-500/15 border border-amber-500/30 px-4 py-2.5 text-xs font-black text-amber-400 hover:bg-amber-500/25 active:scale-95 transition-all"
          >
            <Clock className="h-4 w-4" />
            Horas Pico & Calor
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
        </div>
      </div>
    </section>
  );
}
