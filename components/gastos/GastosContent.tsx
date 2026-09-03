"use client";

import React, { useState } from "react";
import { AlertTriangle } from "lucide-react";
import { useGastosData } from "./hooks/useGastosData";
import { useGastosTable } from "./hooks/useGastosTable";
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
import type { Category } from "./types";

export function GastosContent() {
  const {
    currentMonth,
    categories,
    expenses,
    isLoading,
    errorMessage,
    fetchData,
    handleMonthChange,
    handleCreateExpense,
    handleCreateCategory,
    handleUpdateCategory,
    summary,
    dailyExpensesData,
    categoryExpensesData,
  } = useGastosData();

  const {
    tableSearch,
    tableCategoryFilter,
    tableInvoiceFilter,
    tableTypeFilter,
    sortField,
    sortDirection,
    currentPage,
    pageSize,
    totalPages,
    filteredExpenses,
    paginatedExpenses,
    handleSearchChange,
    handleCategoryFilterChange,
    handleInvoiceFilterChange,
    handleTypeFilterChange,
    handleSort,
    setCurrentPage,
    handlePageSizeChange,
  } = useGastosTable(expenses);

  // Modales
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState<boolean>(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] =
    useState<boolean>(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleOpenCreateCategory = () => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  };

  const handleEditCategory = (cat: Category) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  };

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
      {/* Encabezado */}
      <GastosHeader
        onOpenExpenseModal={() => setIsExpenseModalOpen(true)}
        onOpenCategoryModal={handleOpenCreateCategory}
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 no-print space-y-8">
        {/* Selector de Mes */}
        <GastosMonthPicker
          currentMonth={currentMonth}
          onMonthChange={handleMonthChange}
        />

        {/* Resumen Financiero y KPIs */}
        <GastosSummaryKPIs summary={summary} currentMonth={currentMonth} />

        {/* Sección de Gráficas Analíticas */}
        <GastosChartsSection
          currentMonth={currentMonth}
          fixedExpensesTotal={summary.fixedExpensesTotal}
          variableExpensesTotal={summary.variableExpensesTotal}
          dailyExpensesData={dailyExpensesData}
          categoryExpensesData={categoryExpensesData}
        />

        {/* Categorías Registradas */}
        <GastosCategoriesGrid
          categories={categories}
          onOpenCreateCategory={handleOpenCreateCategory}
          onEditCategory={handleEditCategory}
        />

        {/* Historial de Gastos con Tabla, Filtros y Paginación */}
        <GastosTable
          expenses={paginatedExpenses}
          filteredCount={filteredExpenses.length}
          totalCount={expenses.length}
          sortField={sortField}
          sortDirection={sortDirection}
          onSort={handleSort}
        >
          <GastosFilterBar
            categories={categories}
            search={tableSearch}
            onSearchChange={handleSearchChange}
            categoryFilter={tableCategoryFilter}
            onCategoryFilterChange={handleCategoryFilterChange}
            invoiceFilter={tableInvoiceFilter}
            onInvoiceFilterChange={handleInvoiceFilterChange}
            typeFilter={tableTypeFilter}
            onTypeFilterChange={handleTypeFilterChange}
          />
        </GastosTable>

        {filteredExpenses.length > 0 && (
          <GastosPagination
            currentPage={currentPage}
            totalPages={totalPages}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={handlePageSizeChange}
          />
        )}
      </main>

      {/* Modal Registrar Gasto */}
      <ExpenseModal
        isOpen={isExpenseModalOpen}
        onClose={() => setIsExpenseModalOpen(false)}
        categories={categories}
        onSubmit={handleCreateExpense}
      />

      {/* Modal Crear / Editar Categoría */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        editingCategory={editingCategory}
        onCreateCategory={handleCreateCategory}
        onUpdateCategory={handleUpdateCategory}
      />
    </div>
  );
}
