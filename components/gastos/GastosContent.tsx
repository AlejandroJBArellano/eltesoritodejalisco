"use client";

import React from "react";
import { AlertTriangle } from "lucide-react";
import { GastosProvider, useGastosContext } from "./GastosContext";
import { GastosHeader } from "./GastosHeader";
import { GastosMonthPicker } from "./GastosMonthPicker";
import { GastosSummaryKPIs } from "./GastosSummaryKPIs";
import { GastosChartsSection } from "./GastosChartsSection";
import { GastosCategoriesGrid } from "./GastosCategoriesGrid";
import { GastosFilterBar } from "./GastosFilterBar";
import { GastosTable } from "./GastosTable";
import { GastosPagination } from "./GastosPagination";
import { ExpenseModal } from "./ExpenseModal";
import { CategoryModal } from "./CategoryModal";

function GastosMainView() {
  const {
    isLoading,
    errorMessage,
    expenses,
    categories,
    filteredExpenses,
    fetchData,
    currentMonth,
  } = useGastosContext();

  if (isLoading && expenses.length === 0 && categories.length === 0) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background text-text-light/60 text-sm font-bold uppercase tracking-wider">
        <div className="flex items-center gap-3">
          <div className="h-4 w-4 animate-spin rounded-full border-2 border-primary border-t-transparent"></div>
          Cargando panel de gastos...
        </div>
      </div>
    );
  }

  if (errorMessage && expenses.length === 0 && categories.length === 0) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
        <div className="rounded-2xl bg-card p-8 shadow-sm border border-red-500/20 max-w-md">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-400 mb-4" />
          <h2 className="text-lg font-black text-text-light uppercase tracking-tight mb-2">
            Error al Cargar Gastos
          </h2>
          <p className="text-xs text-text-light/60 mb-6">{errorMessage}</p>
          <button
            type="button"
            onClick={() => fetchData(currentMonth)}
            className="rounded-xl bg-primary px-6 py-2.5 text-xs font-black text-black uppercase tracking-wider hover:brightness-105 transition-all"
          >
            Reintentar
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background pb-16">
      {/* Encabezado (0 props) */}
      <GastosHeader />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 no-print space-y-8">
        {/* Selector de Mes (0 props) */}
        <GastosMonthPicker />

        {/* Resumen Financiero y KPIs (0 props) */}
        <GastosSummaryKPIs />

        {/* Sección de Gráficas Analíticas (0 props) */}
        <GastosChartsSection />

        {/* Categorías Registradas (0 props) */}
        <GastosCategoriesGrid />

        {/* Historial de Gastos con Tabla, Filtros y Paginación (0 props) */}
        <GastosTable>
          <GastosFilterBar />
        </GastosTable>

        {filteredExpenses.length > 0 && <GastosPagination />}
      </main>

      {/* Modales (0 props) */}
      <ExpenseModal />
      <CategoryModal />
    </div>
  );
}

export function GastosContent() {
  return (
    <GastosProvider>
      <GastosMainView />
    </GastosProvider>
  );
}
