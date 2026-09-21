"use client";

import React from "react";
import Link from "next/link";
import { BarChart3, Clock, Sparkles, ArrowRight } from "lucide-react";

export function AnalyticsBanner() {
  return (
    <section className="relative overflow-hidden rounded-xl bg-card border border-border p-6 sm:p-8 shadow-xs transition-all hover:border-border/80">
      <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
        <div className="space-y-2 max-w-2xl">
          <div className="inline-flex items-center gap-1.5 rounded-md bg-primary/10 px-2.5 py-1 text-xs font-semibold text-primary uppercase tracking-wider border border-primary/20">
            <Sparkles className="h-3.5 w-3.5" />
            Analítica Visual Integrada
          </div>
          <h3 className="text-xl font-bold text-text-light tracking-tight">
            Descubre Tendencias Gráficas y Patrones de Venta
          </h3>
          <p className="text-xs text-text-light/60 font-medium leading-relaxed">
            Visualiza la evolución de ingresos con drill-down diario,
            distribución por categoría en unidades o facturación, y analiza la
            concurrencia horaria con el mapa de calor interactivo.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Link
            href="/analytics/sales"
            className="inline-flex items-center gap-2 rounded-lg bg-primary px-4 py-2.5 text-xs font-bold text-dark uppercase tracking-wider hover:opacity-90 active:scale-[0.98] transition-all shadow-xs"
          >
            <BarChart3 className="h-4 w-4" />
            Tendencias y Productos
            <ArrowRight className="h-3.5 w-3.5" />
          </Link>
          <Link
            href="/analytics/hourly"
            className="inline-flex items-center gap-2 rounded-lg bg-dark/40 border border-border px-4 py-2.5 text-xs font-bold text-text-light hover:bg-card-light active:scale-[0.98] transition-all"
          >
            <Clock className="h-4 w-4 text-warning" />
            Horas Pico & Calor
            <ArrowRight className="h-3.5 w-3.5 text-text-light/40" />
          </Link>
        </div>
      </div>
    </section>
  );
}

