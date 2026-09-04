"use client";

import React, { createContext, useContext, useState, useCallback, useMemo } from "react";
import { useGastosData, type CreateExpensePayload, type CreateCategoryPayload, type UpdateCategoryPayload } from "./hooks/useGastosData";
import { useGastosTable } from "./hooks/useGastosTable";
import type {
  Category,
  CategoryExpenseItem,
  DailyExpenseTrendItem,
  Expense,
  ExpenseCategoryType,
  ExpenseSortField,
  ExpenseTypeFilter,
  GastosSummary,
  InvoiceFilter,
} from "./types";

export interface GastosContextValue {
  // Datos y estado de la API
  currentMonth: string;
  categories: Category[];
  expenses: Expense[];
  totalSales: number;
  isLoading: boolean;
  errorMessage: string | null;
  fetchData: (month?: string) => Promise<void>;
  handleMonthChange: (newMonth: string) => void;
  handleCreateExpense: (payload: CreateExpensePayload) => Promise<void>;
  handleCreateCategory: (payload: CreateCategoryPayload) => Promise<void>;
  handleUpdateCategory: (payload: UpdateCategoryPayload) => Promise<void>;
  summary: GastosSummary;
  dailyExpensesData: DailyExpenseTrendItem[];
  categoryExpensesData: CategoryExpenseItem[];

  // Tabla, filtros y paginación
  tableSearch: string;
  tableCategoryFilter: string;
  tableInvoiceFilter: InvoiceFilter;
  tableTypeFilter: ExpenseTypeFilter;
  sortField: ExpenseSortField;
  sortDirection: "asc" | "desc";
  currentPage: number;
  pageSize: number;
  totalPages: number;
  filteredExpenses: Expense[];
  paginatedExpenses: Expense[];
  handleSearchChange: (search: string) => void;
  handleCategoryFilterChange: (categoryId: string) => void;
  handleInvoiceFilterChange: (filter: InvoiceFilter) => void;
  handleTypeFilterChange: (filter: ExpenseTypeFilter) => void;
  handleSort: (field: ExpenseSortField) => void;
  setCurrentPage: (page: number) => void;
  handlePageSizeChange: (size: number) => void;

  // Estado y disparadores de Modales
  isExpenseModalOpen: boolean;
  setIsExpenseModalOpen: (isOpen: boolean) => void;
  isCategoryModalOpen: boolean;
  setIsCategoryModalOpen: (isOpen: boolean) => void;
  editingCategory: Category | null;
  setEditingCategory: (cat: Category | null) => void;
  handleOpenCreateExpense: () => void;
  handleCloseExpenseModal: () => void;
  handleOpenCreateCategory: () => void;
  handleOpenEditCategory: (cat: Category) => void;
  handleCloseCategoryModal: () => void;
}

const GastosContext = createContext<GastosContextValue | null>(null);

export function useGastosContext(): GastosContextValue {
  const ctx = useContext(GastosContext);
  if (!ctx) {
    throw new Error("useGastosContext must be used within a GastosProvider");
  }
  return ctx;
}

export function useGastosContextNullable(): GastosContextValue | null {
  return useContext(GastosContext);
}

export interface GastosProviderProps {
  children: React.ReactNode;
  initialMonth?: string;
  autoFetch?: boolean;
}

export function GastosProvider({
  children,
  initialMonth,
  autoFetch = true,
}: GastosProviderProps) {
  const dataHook = useGastosData({ initialMonth, autoFetch });
  const tableHook = useGastosTable(dataHook.expenses);

  // Estados de modales
  const [isExpenseModalOpen, setIsExpenseModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);

  const handleOpenCreateExpense = useCallback(() => {
    setIsExpenseModalOpen(true);
  }, []);

  const handleCloseExpenseModal = useCallback(() => {
    setIsExpenseModalOpen(false);
  }, []);

  const handleOpenCreateCategory = useCallback(() => {
    setEditingCategory(null);
    setIsCategoryModalOpen(true);
  }, []);

  const handleOpenEditCategory = useCallback((cat: Category) => {
    setEditingCategory(cat);
    setIsCategoryModalOpen(true);
  }, []);

  const handleCloseCategoryModal = useCallback(() => {
    setIsCategoryModalOpen(false);
  }, []);

  const value = useMemo<GastosContextValue>(
    () => ({
      ...dataHook,
      ...tableHook,
      isExpenseModalOpen,
      setIsExpenseModalOpen,
      isCategoryModalOpen,
      setIsCategoryModalOpen,
      editingCategory,
      setEditingCategory,
      handleOpenCreateExpense,
      handleCloseExpenseModal,
      handleOpenCreateCategory,
      handleOpenEditCategory,
      handleCloseCategoryModal,
    }),
    [
      dataHook,
      tableHook,
      isExpenseModalOpen,
      isCategoryModalOpen,
      editingCategory,
      handleOpenCreateExpense,
      handleCloseExpenseModal,
      handleOpenCreateCategory,
      handleOpenEditCategory,
      handleCloseCategoryModal,
    ],
  );

  return (
    <GastosContext.Provider value={value}>{children}</GastosContext.Provider>
  );
}
