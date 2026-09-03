import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { GastosSummaryKPIs } from "../GastosSummaryKPIs";
import type { GastosSummary } from "../types";

describe("GastosSummaryKPIs Component", () => {
  const positiveSummary: GastosSummary = {
    totalExpenses: 5000,
    fixedExpensesTotal: 2000,
    variableExpensesTotal: 3000,
    invoicedExpensesTotal: 1500,
    totalSales: 15000,
    netUtility: 10000,
    profitMargin: 66.67,
  };

  const negativeSummary: GastosSummary = {
    totalExpenses: 8000,
    fixedExpensesTotal: 5000,
    variableExpensesTotal: 3000,
    invoicedExpensesTotal: 2500,
    totalSales: 4000,
    netUtility: -4000,
    profitMargin: -100.0,
  };

  it("renders positive summary KPIs correctly", () => {
    render(
      <GastosSummaryKPIs
        summary={positiveSummary}
        currentMonth="2026-09"
      />,
    );

    expect(screen.getByText(/Gastos Totales \(2026-09\)/i)).toBeInTheDocument();
    expect(screen.getByText("$5,000.00")).toBeInTheDocument();

    expect(screen.getByText("Gastos Facturados")).toBeInTheDocument();
    expect(screen.getByText("$1,500.00")).toBeInTheDocument();

    expect(screen.getByText("Ventas del Mes")).toBeInTheDocument();
    expect(screen.getByText("$15,000.00")).toBeInTheDocument();

    expect(screen.getByText("Utilidad Neta (Margen)")).toBeInTheDocument();
    expect(screen.getByText("$10,000.00")).toBeInTheDocument();
    expect(screen.getByText("66.7%")).toBeInTheDocument();
  });

  it("renders negative utility and margin formatted with -$ and danger styling", () => {
    render(
      <GastosSummaryKPIs
        summary={negativeSummary}
        currentMonth="2026-08"
      />,
    );

    expect(screen.getByText("-$4,000.00")).toBeInTheDocument();
    expect(screen.getByText("-100.0%")).toBeInTheDocument();
  });
});
