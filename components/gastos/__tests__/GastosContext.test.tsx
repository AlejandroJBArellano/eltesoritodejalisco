import { describe, it, expect, vi } from "vitest";
import { render, screen, renderHook, act } from "@testing-library/react";
import {
  GastosProvider,
  useGastosContext,
  useGastosContextNullable,
} from "../GastosContext";
import type { Category } from "../types";

describe("GastosContext", () => {
  it("throws error when useGastosContext is used outside of GastosProvider", () => {
    // Suppress console.error during expected throw
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    expect(() => renderHook(() => useGastosContext())).toThrow(
      "useGastosContext must be used within a GastosProvider",
    );

    consoleSpy.mockRestore();
  });

  it("returns null when useGastosContextNullable is used outside of GastosProvider", () => {
    const { result } = renderHook(() => useGastosContextNullable());
    expect(result.current).toBeNull();
  });

  it("provides full context values and handles modal interactions", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <GastosProvider autoFetch={false} initialMonth="2026-09">
        {children}
      </GastosProvider>
    );

    const { result } = renderHook(() => useGastosContext(), { wrapper });

    expect(result.current.currentMonth).toBe("2026-09");
    expect(result.current.isExpenseModalOpen).toBe(false);
    expect(result.current.isCategoryModalOpen).toBe(false);
    expect(result.current.editingCategory).toBeNull();

    // Open and close Expense Modal
    act(() => {
      result.current.handleOpenCreateExpense();
    });
    expect(result.current.isExpenseModalOpen).toBe(true);

    act(() => {
      result.current.handleCloseExpenseModal();
    });
    expect(result.current.isExpenseModalOpen).toBe(false);

    // Open and close Create Category Modal
    act(() => {
      result.current.handleOpenCreateCategory();
    });
    expect(result.current.isCategoryModalOpen).toBe(true);
    expect(result.current.editingCategory).toBeNull();

    act(() => {
      result.current.handleCloseCategoryModal();
    });
    expect(result.current.isCategoryModalOpen).toBe(false);

    // Open Edit Category Modal
    const sampleCategory: Category = {
      id: "cat-1",
      name: "Publicidad",
      color: "#10B981",
      tipo_gasto: "variable",
    };

    act(() => {
      result.current.handleOpenEditCategory(sampleCategory);
    });
    expect(result.current.isCategoryModalOpen).toBe(true);
    expect(result.current.editingCategory).toEqual(sampleCategory);

    act(() => {
      result.current.handleCloseCategoryModal();
    });
    expect(result.current.isCategoryModalOpen).toBe(false);
  });
});
