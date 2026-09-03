import { describe, it, expect } from "vitest";
import { EXPENSES_EXPORT_COLUMNS, type Expense } from "../page";

describe("app/gastos/page re-exports", () => {
  const sampleExpense: Expense = {
    id: "exp-1",
    date: "2026-09-01",
    amount: 1500,
    description: "Pago Renta",
    category_id: "cat-1",
    has_invoice: true,
    expense_categories: {
      name: "Renta",
      color: "#F59E0B",
      tipo_gasto: "fijo",
    },
  };

  it("should re-export EXPENSES_EXPORT_COLUMNS with all 6 columns", () => {
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

  it("should format values correctly through re-exported column accessors and keys", () => {
    const getCol = (header: string) => {
      const col = EXPENSES_EXPORT_COLUMNS.find((c) => c.header === header);
      if (!col) throw new Error(`Column "${header}" not found`);
      return col;
    };

    expect(getCol("Fecha").key).toBe("date");
    expect(getCol("Descripción").key).toBe("description");
    expect(getCol("Categoría").accessor!(sampleExpense)).toBe("Renta");
    expect(getCol("Tipo de Gasto").accessor!(sampleExpense)).toBe("Fijo");
    expect(getCol("Monto").accessor!(sampleExpense)).toBe("$1500.00");
    expect(getCol("Factura").accessor!(sampleExpense)).toBe("Sí (FAC)");
  });
});
