import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGastosTable } from "../useGastosTable";
import type { Expense } from "../../types";

const sampleExpenses: Expense[] = [
  {
    id: "1",
    amount: 1200,
    description: "Leche entera 20L",
    date: "2026-09-02",
    has_invoice: true,
    category_id: "c1",
    expense_categories: { name: "Lácteos", color: "#3B82F6", tipo_gasto: "variable" },
  },
  {
    id: "2",
    amount: 8000,
    description: "Renta de local",
    date: "2026-09-01",
    has_invoice: false,
    category_id: "c2",
    expense_categories: { name: "Rentas", color: "#F59E0B", tipo_gasto: "fijo" },
  },
  {
    id: "3",
    amount: 300,
    description: "Servilletas",
    date: "2026-09-03",
    has_invoice: true,
    category_id: "c3",
    expense_categories: { name: "Limpieza", color: "#10B981", tipo_gasto: "variable" },
  },
];

describe("useGastosTable Hook", () => {
  it("initializes with default sorting and pagination", () => {
    const { result } = renderHook(() => useGastosTable(sampleExpenses, { initialPageSize: 2 }));

    expect(result.current.filteredExpenses).toHaveLength(3);
    expect(result.current.totalPages).toBe(2);
    expect(result.current.paginatedExpenses).toHaveLength(2);
    // Orden predeterminado: date desc -> 2026-09-03, luego 2026-09-02
    expect(result.current.paginatedExpenses[0].id).toBe("3");
    expect(result.current.paginatedExpenses[1].id).toBe("1");
  });

  it("filters by text search across description and category", () => {
    const { result } = renderHook(() => useGastosTable(sampleExpenses));

    act(() => {
      result.current.handleSearchChange("Leche");
    });
    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.filteredExpenses[0].id).toBe("1");

    act(() => {
      result.current.handleSearchChange("Rentas");
    });
    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.filteredExpenses[0].id).toBe("2");
  });

  it("filters by category, invoice, and expense type", () => {
    const { result } = renderHook(() => useGastosTable(sampleExpenses));

    act(() => {
      result.current.handleCategoryFilterChange("c1");
    });
    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.filteredExpenses[0].id).toBe("1");

    act(() => {
      result.current.handleCategoryFilterChange("");
      result.current.handleInvoiceFilterChange("invoiced");
    });
    expect(result.current.filteredExpenses).toHaveLength(2); // exp 1 and exp 3

    act(() => {
      result.current.handleInvoiceFilterChange("no_invoice");
    });
    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.filteredExpenses[0].id).toBe("2");

    act(() => {
      result.current.handleInvoiceFilterChange("all");
      result.current.handleTypeFilterChange("fijo");
    });
    expect(result.current.filteredExpenses).toHaveLength(1);
    expect(result.current.filteredExpenses[0].id).toBe("2");
  });

  it("sorts by amount asc and desc", () => {
    const { result } = renderHook(() => useGastosTable(sampleExpenses));

    act(() => {
      result.current.handleSort("amount");
    });
    // First click on amount sorts desc: 8000, 1200, 300
    expect(result.current.sortedExpenses[0].id).toBe("2");
    expect(result.current.sortedExpenses[2].id).toBe("3");

    act(() => {
      result.current.handleSort("amount");
    });
    // Second click on amount toggles to asc: 300, 1200, 8000
    expect(result.current.sortedExpenses[0].id).toBe("3");
    expect(result.current.sortedExpenses[2].id).toBe("2");
  });

  it("handles pagination navigation and page size change", () => {
    const { result } = renderHook(() => useGastosTable(sampleExpenses, { initialPageSize: 1 }));

    expect(result.current.totalPages).toBe(3);
    expect(result.current.currentPage).toBe(1);

    act(() => {
      result.current.setCurrentPage(2);
    });
    expect(result.current.currentPage).toBe(2);

    act(() => {
      result.current.handlePageSizeChange(10);
    });
    expect(result.current.pageSize).toBe(10);
    expect(result.current.currentPage).toBe(1);
    expect(result.current.totalPages).toBe(1);
  });
});
