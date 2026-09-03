import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import {
  GastosChartsSection,
  formatYAxisCurrency,
  formatExpenseTooltip,
  formatCategoryTooltip,
} from "../GastosChartsSection";
import type { CategoryExpenseItem, DailyExpenseTrendItem } from "../types";

describe("GastosChartsSection Component", () => {
  const mockDailyData: DailyExpenseTrendItem[] = [
    { date: "09/01", rawDate: "2026-09-01", fijos: 500, variables: 200, total: 700 },
    { date: "09/02", rawDate: "2026-09-02", fijos: 0, variables: 350, total: 350 },
  ];

  const mockCategoryData: CategoryExpenseItem[] = [
    { name: "Insumos", value: 550, color: "#10B981", tipo: "variable" },
    { name: "Renta", value: 500, color: "#F59E0B", tipo: "fijo" },
  ];

  it("renders chart titles, summary legends, and chart containers with data", () => {
    render(
      <GastosChartsSection
        currentMonth="2026-09"
        fixedExpensesTotal={500}
        variableExpensesTotal={550}
        dailyExpensesData={mockDailyData}
        categoryExpensesData={mockCategoryData}
      />,
    );

    expect(
      screen.getByText(/Tendencia de Egresos: Gastos Fijos vs Variables \(2026-09\)/i),
    ).toBeInTheDocument();
    expect(
      screen.getByText(/Distribución por Categoría de Gasto \(2026-09\)/i),
    ).toBeInTheDocument();

    expect(screen.getByText("$500.00")).toBeInTheDocument();
    expect(screen.getByText("$550.00")).toBeInTheDocument();

    expect(screen.getByTestId("gastos-trend-linechart")).toBeInTheDocument();
    expect(screen.getByTestId("gastos-category-barchart")).toBeInTheDocument();
  });

  it("renders empty fallback messages when data is empty", () => {
    render(
      <GastosChartsSection
        currentMonth="2026-09"
        fixedExpensesTotal={0}
        variableExpensesTotal={0}
        dailyExpensesData={[]}
        categoryExpensesData={[]}
      />,
    );

    const fallbacks = screen.getAllByText("Aún no hay gastos registrados este mes.");
    expect(fallbacks.length).toBe(2);
  });

  it("formats chart tooltips and axis labels correctly", () => {
    expect(formatYAxisCurrency(1500)).toBe("$1500");
    expect(formatExpenseTooltip(250.5)).toEqual(["$250.50", ""]);
    expect(formatExpenseTooltip(null)).toEqual(["$0.00", ""]);
    expect(formatCategoryTooltip(800)).toEqual(["$800.00", "Gasto Acumulado"]);
    expect(formatCategoryTooltip(undefined)).toEqual(["$0.00", "Gasto Acumulado"]);
  });
});
