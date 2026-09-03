import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGastosData } from "../useGastosData";
import type { Category, Expense } from "../../types";

const mockCategories: Category[] = [
  { id: "cat-1", name: "Insumos", color: "#3B82F6", tipo_gasto: "variable" },
  { id: "cat-2", name: "Renta", color: "#F59E0B", tipo_gasto: "fijo" },
];

const mockExpenses: Expense[] = [
  {
    id: "exp-1",
    amount: 1500,
    description: "Leche y jarabes",
    date: "2026-09-01",
    has_invoice: true,
    category_id: "cat-1",
    expense_categories: mockCategories[0],
  },
  {
    id: "exp-2",
    amount: 5000,
    description: "Pago de renta local",
    date: "2026-09-02",
    has_invoice: false,
    category_id: "cat-2",
    expense_categories: mockCategories[1],
  },
];

describe("useGastosData Hook", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("fetches categories and expenses on mount and computes metrics accurately", async () => {
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url.includes("/categorias")) {
        return Promise.resolve({
          ok: true,
          json: async () => mockCategories,
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          expenses: mockExpenses,
          totalSales: 15000,
        }),
      });
    });

    const { result } = renderHook(() =>
      useGastosData({ initialMonth: "2026-09" }),
    );

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      await Promise.resolve();
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.categories).toHaveLength(2);
    expect(result.current.expenses).toHaveLength(2);
    expect(result.current.totalSales).toBe(15000);

    // Verificación de summary
    expect(result.current.summary.totalExpenses).toBe(6500);
    expect(result.current.summary.fixedExpensesTotal).toBe(5000);
    expect(result.current.summary.variableExpensesTotal).toBe(1500);
    expect(result.current.summary.invoicedExpensesTotal).toBe(1500);
    expect(result.current.summary.netUtility).toBe(8500); // 15000 - 6500
    expect(result.current.summary.profitMargin).toBeCloseTo(56.666, 1);

    // Gráfica de días
    expect(result.current.dailyExpensesData).toHaveLength(2);
    expect(result.current.categoryExpensesData).toHaveLength(2);
  });

  it("handles error in fetch gracefully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Error en base de datos" }),
    });

    const { result } = renderHook(() => useGastosData({ autoFetch: false }));

    await act(async () => {
      await result.current.fetchData("2026-09");
    });

    expect(result.current.isLoading).toBe(false);
    expect(result.current.errorMessage).toBe("Error en base de datos");
  });

  it("creates expense and reloads data", async () => {
    const fetchMock = vi.fn().mockImplementation((url: string, opts?: RequestInit) => {
      if (opts?.method === "POST") {
        return Promise.resolve({ ok: true, json: async () => ({ id: "new-exp" }) });
      }
      if (url.includes("/categorias")) {
        return Promise.resolve({ ok: true, json: async () => mockCategories });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({ expenses: mockExpenses, totalSales: 15000 }),
      });
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() =>
      useGastosData({ initialMonth: "2026-09" }),
    );

    await act(async () => {
      await Promise.resolve();
    });

    await act(async () => {
      await result.current.handleCreateExpense({
        category_id: "cat-1",
        amount: 250,
        description: "Vasos térmicos",
        has_invoice: true,
        date: "2026-09-03",
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gastos",
      expect.objectContaining({ method: "POST" }),
    );
  });

  it("creates and updates category", async () => {
    const fetchMock = vi.fn().mockImplementation((_url: string, opts?: RequestInit) => {
      if (opts?.method === "POST" || opts?.method === "PUT") {
        return Promise.resolve({ ok: true, json: async () => ({ id: "cat-x" }) });
      }
      return Promise.resolve({ ok: true, json: async () => [] });
    });
    global.fetch = fetchMock;

    const { result } = renderHook(() => useGastosData({ autoFetch: false }));

    await act(async () => {
      await result.current.handleCreateCategory({
        name: "Marketing",
        color: "#EC4899",
        tipo_gasto: "variable",
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gastos/categorias",
      expect.objectContaining({ method: "POST" }),
    );

    await act(async () => {
      await result.current.handleUpdateCategory({
        id: "cat-1",
        name: "Insumos y Café",
        color: "#3B82F6",
        tipo_gasto: "variable",
      });
    });

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/gastos/categorias",
      expect.objectContaining({ method: "PUT" }),
    );
  });
});
