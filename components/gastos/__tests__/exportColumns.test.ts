import { describe, it, expect } from "vitest";
import { EXPENSES_EXPORT_COLUMNS } from "../exportColumns";
import type { Expense } from "../types";

describe("Expenses Export Columns", () => {
  const sampleExpense: Expense = {
    id: "exp-1",
    amount: 1450.5,
    description: "Compra de granos de café de especialidad",
    date: "2026-09-01",
    has_invoice: true,
    category_id: "cat-1",
    expense_categories: {
      name: "Insumos y Café",
      color: "#3B82F6",
      tipo_gasto: "variable",
    },
  };

  const getCol = (header: string) => {
    const col = EXPENSES_EXPORT_COLUMNS.find((c) => c.header === header);
    if (!col) throw new Error(`Column "${header}" not found in EXPENSES_EXPORT_COLUMNS`);
    return col;
  };

  it("should have all 6 essential expense columns", () => {
    const headers = EXPENSES_EXPORT_COLUMNS.map((c) => c.header);
    expect(headers).toEqual([
      "Fecha",
      "Categoría",
      "Tipo de Gasto",
      "Descripción",
      "Monto",
      "Factura",
    ]);
  });

  it("should format Categoría with fallback", () => {
    const col = getCol("Categoría");
    expect(col.accessor!(sampleExpense)).toBe("Insumos y Café");
    expect(col.accessor!({ ...sampleExpense, expense_categories: undefined })).toBe("Sin Categoría");
  });

  it("should format Tipo de Gasto as Fijo or Variable", () => {
    const col = getCol("Tipo de Gasto");
    expect(col.accessor!(sampleExpense)).toBe("Variable");

    const fixedExpense: Expense = {
      ...sampleExpense,
      expense_categories: {
        name: "Renta de Local",
        color: "#F59E0B",
        tipo_gasto: "fijo",
      },
    };
    expect(col.accessor!(fixedExpense)).toBe("Fijo");
  });

  it("should format Monto as currency", () => {
    const col = getCol("Monto");
    expect(col.accessor!(sampleExpense)).toBe("$1450.50");
    expect(col.accessor!({ ...sampleExpense, amount: 0 })).toBe("$0.00");
  });

  it("should format Factura as Sí (FAC) or No", () => {
    const col = getCol("Factura");
    expect(col.accessor!(sampleExpense)).toBe("Sí (FAC)");
    expect(col.accessor!({ ...sampleExpense, has_invoice: false })).toBe("No");
  });
});
