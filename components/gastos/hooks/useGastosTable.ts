"use client";

import { useMemo, useState } from "react";
import type {
  Expense,
  ExpenseSortField,
  ExpenseTypeFilter,
  InvoiceFilter,
} from "../types";

export interface UseGastosTableOptions {
  initialPageSize?: number;
}

export function useGastosTable(
  expenses: Expense[],
  options: UseGastosTableOptions = {},
) {
  const { initialPageSize = 10 } = options;

  // Filtros
  const [tableSearch, setTableSearch] = useState<string>("");
  const [tableCategoryFilter, setTableCategoryFilter] = useState<string>("");
  const [tableInvoiceFilter, setTableInvoiceFilter] =
    useState<InvoiceFilter>("all");
  const [tableTypeFilter, setTableTypeFilter] =
    useState<ExpenseTypeFilter>("all");

  // Ordenamiento
  const [sortField, setSortField] = useState<ExpenseSortField>("date");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("desc");

  // Paginación
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(initialPageSize);

  const handleSort = (field: ExpenseSortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
    setCurrentPage(1);
  };

  const handleSearchChange = (val: string) => {
    setTableSearch(val);
    setCurrentPage(1);
  };

  const handleCategoryFilterChange = (catId: string) => {
    setTableCategoryFilter(catId);
    setCurrentPage(1);
  };

  const handleInvoiceFilterChange = (filter: InvoiceFilter) => {
    setTableInvoiceFilter(filter);
    setCurrentPage(1);
  };

  const handleTypeFilterChange = (filter: ExpenseTypeFilter) => {
    setTableTypeFilter(filter);
    setCurrentPage(1);
  };

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  // Filtrado
  const filteredExpenses = useMemo(() => {
    return expenses.filter((exp) => {
      if (tableSearch.trim()) {
        const q = tableSearch.toLowerCase();
        const matchDesc = exp.description.toLowerCase().includes(q);
        const matchCat = (exp.expense_categories?.name || "")
          .toLowerCase()
          .includes(q);
        if (!matchDesc && !matchCat) return false;
      }

      if (tableCategoryFilter && exp.category_id !== tableCategoryFilter) {
        return false;
      }

      if (tableInvoiceFilter === "invoiced" && !exp.has_invoice) {
        return false;
      }
      if (tableInvoiceFilter === "no_invoice" && exp.has_invoice) {
        return false;
      }

      if (tableTypeFilter !== "all") {
        const tipo = exp.expense_categories?.tipo_gasto;
        if (tipo !== tableTypeFilter) return false;
      }

      return true;
    });
  }, [
    expenses,
    tableSearch,
    tableCategoryFilter,
    tableInvoiceFilter,
    tableTypeFilter,
  ]);

  // Ordenamiento
  const sortedExpenses = useMemo(() => {
    return [...filteredExpenses].sort((a, b) => {
      let comparison = 0;
      if (sortField === "date") {
        comparison = a.date.localeCompare(b.date);
      } else if (sortField === "amount") {
        comparison = a.amount - b.amount;
      } else if (sortField === "description") {
        comparison = a.description.localeCompare(b.description);
      } else if (sortField === "category") {
        const catA = a.expense_categories?.name || "";
        const catB = b.expense_categories?.name || "";
        comparison = catA.localeCompare(catB);
      }
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredExpenses, sortField, sortDirection]);

  // Paginación
  const totalPages = Math.ceil(sortedExpenses.length / pageSize) || 1;

  const paginatedExpenses = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return sortedExpenses.slice(startIndex, startIndex + pageSize);
  }, [sortedExpenses, currentPage, pageSize]);

  return {
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
    sortedExpenses,
    paginatedExpenses,
    handleSearchChange,
    handleCategoryFilterChange,
    handleInvoiceFilterChange,
    handleTypeFilterChange,
    handleSort,
    setCurrentPage,
    handlePageSizeChange,
  };
}
