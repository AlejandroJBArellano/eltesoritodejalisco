"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  Category,
  CategoryExpenseItem,
  DailyExpenseTrendItem,
  Expense,
  ExpenseCategoryType,
  GastosSummary,
} from "../types";

export interface CreateExpensePayload {
  category_id: string;
  amount: number;
  description: string;
  has_invoice: boolean;
  date: string;
}

export interface CreateCategoryPayload {
  name: string;
  color: string;
  tipo_gasto: ExpenseCategoryType;
}

export interface UpdateCategoryPayload extends CreateCategoryPayload {
  id: string;
}

export interface UseGastosDataOptions {
  initialMonth?: string;
  autoFetch?: boolean;
}

export function useGastosData(options: UseGastosDataOptions = {}) {
  const { initialMonth, autoFetch = true } = options;

  const [currentMonth, setCurrentMonth] = useState<string>(() => {
    if (initialMonth) return initialMonth;
    const today = new Date();
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
    }).format(today);
  });

  const [categories, setCategories] = useState<Category[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [totalSales, setTotalSales] = useState<number>(0);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fetchData = useCallback(
    async (monthToFetch?: string) => {
      const targetMonth = monthToFetch ?? currentMonth;
      setIsLoading(true);
      setErrorMessage(null);

      try {
        const [catRes, expRes] = await Promise.all([
          fetch("/api/gastos/categorias"),
          fetch(`/api/gastos?month=${targetMonth}`),
        ]);

        if (!catRes.ok) {
          const err = await catRes.json();
          throw new Error(err.error || "Error al cargar categorías");
        }
        if (!expRes.ok) {
          const err = await expRes.json();
          throw new Error(err.error || "Error al cargar gastos");
        }

        const catsJson = await catRes.json();
        const expJson = await expRes.json();

        const loadedCats: Category[] = Array.isArray(catsJson)
          ? catsJson
          : (catsJson as { categories?: Category[] })?.categories || [];
        const loadedExpenses: Expense[] = Array.isArray(expJson?.expenses)
          ? expJson.expenses
          : Array.isArray(expJson)
          ? expJson
          : [];

        setCategories(loadedCats);
        setExpenses(loadedExpenses);
        setTotalSales(expJson?.totalSales || 0);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Error al cargar información",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [currentMonth],
  );

  useEffect(() => {
    if (autoFetch) {
      fetchData(currentMonth);
    }
  }, [autoFetch, currentMonth, fetchData]);

  const handleMonthChange = useCallback((newMonth: string) => {
    setCurrentMonth(newMonth);
  }, []);

  const handleCreateExpense = useCallback(
    async (payload: CreateExpensePayload) => {
      const res = await fetch("/api/gastos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error al registrar gasto");
      }

      await fetchData(currentMonth);
    },
    [currentMonth, fetchData],
  );

  const handleCreateCategory = useCallback(
    async (payload: CreateCategoryPayload) => {
      const res = await fetch("/api/gastos/categorias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error al crear categoría");
      }

      await fetchData(currentMonth);
    },
    [currentMonth, fetchData],
  );

  const handleUpdateCategory = useCallback(
    async (payload: UpdateCategoryPayload) => {
      const res = await fetch("/api/gastos/categorias", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const d = await res.json();
        throw new Error(d.error || "Error al editar categoría");
      }

      await fetchData(currentMonth);
    },
    [currentMonth, fetchData],
  );

  // Cálculos memoizados
  const summary = useMemo<GastosSummary>(() => {
    let totalExpenses = 0;
    let fixedExpensesTotal = 0;
    let variableExpensesTotal = 0;
    let invoicedExpensesTotal = 0;

    expenses.forEach((exp) => {
      const amt = Number(exp.amount || 0);
      totalExpenses += amt;

      const tipo = exp.expense_categories?.tipo_gasto;
      if (tipo === "fijo") {
        fixedExpensesTotal += amt;
      } else {
        variableExpensesTotal += amt;
      }

      if (exp.has_invoice) {
        invoicedExpensesTotal += amt;
      }
    });

    const netUtility = totalSales - totalExpenses;
    const profitMargin = totalSales > 0 ? (netUtility / totalSales) * 100 : 0;

    return {
      totalExpenses,
      fixedExpensesTotal,
      variableExpensesTotal,
      invoicedExpensesTotal,
      totalSales,
      netUtility,
      profitMargin,
    };
  }, [expenses, totalSales]);

  // Gráfica Lineal de Gastos por Día del Mes (Fijos vs Variables)
  const dailyExpensesData = useMemo<DailyExpenseTrendItem[]>(() => {
    const map = new Map<
      string,
      { fijos: number; variables: number; total: number }
    >();

    expenses.forEach((exp) => {
      const dateKey = exp.date;
      const tipo = exp.expense_categories?.tipo_gasto;
      const amt = Number(exp.amount || 0);

      if (!map.has(dateKey)) {
        map.set(dateKey, { fijos: 0, variables: 0, total: 0 });
      }
      const item = map.get(dateKey)!;
      if (tipo === "fijo") {
        item.fijos += amt;
      } else {
        item.variables += amt;
      }
      item.total += amt;
    });

    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([dateStr, values]) => {
        const parts = dateStr.split("-");
        const dayLabel =
          parts.length === 3 ? `${parts[2]}/${parts[1]}` : dateStr;
        return {
          date: dayLabel,
          rawDate: dateStr,
          fijos: values.fijos,
          variables: values.variables,
          total: values.total,
        };
      });
  }, [expenses]);

  // Gráfica por Categorías de Gastos
  const categoryExpensesData = useMemo<CategoryExpenseItem[]>(() => {
    const map = new Map<
      string,
      { name: string; value: number; color: string; tipo: string }
    >();

    expenses.forEach((exp) => {
      const catName = exp.expense_categories?.name || "Sin Categoría";
      const catColor = exp.expense_categories?.color || "#FFB7CE";
      const catTipo = exp.expense_categories?.tipo_gasto || "variable";
      const amt = Number(exp.amount || 0);

      if (!map.has(catName)) {
        map.set(catName, {
          name: catName,
          value: 0,
          color: catColor,
          tipo: catTipo,
        });
      }
      map.get(catName)!.value += amt;
    });

    return Array.from(map.values()).sort((a, b) => b.value - a.value);
  }, [expenses]);

  return {
    currentMonth,
    categories,
    expenses,
    totalSales,
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
  };
}
