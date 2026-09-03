import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { FinancialSummaryKPIs } from "../FinancialSummaryKPIs";

describe("FinancialSummaryKPIs Component", () => {
  it("renders all 8 KPI cards with formatted values", () => {
    render(
      <FinancialSummaryKPIs
        summary={{
          totalSales: 15450.5,
          totalOrders: 120,
          averageTicket: 128.75,
          totalTips: 980,
          averageCompletionTimeMinutes: 7.2,
          totalExpenses: 5200,
          totalUncollected: 150,
        }}
        newCustomersCount={14}
        netUtility={10250.5}
      />,
    );

    expect(screen.getByText("Venta Bruta")).toBeInTheDocument();
    expect(screen.getByText("$15,450.50")).toBeInTheDocument();

    expect(screen.getByText("Gastos Operativos")).toBeInTheDocument();
    expect(screen.getByText("-$5,200.00")).toBeInTheDocument();

    expect(screen.getByText("Utilidad Neta")).toBeInTheDocument();
    expect(screen.getByText("$10,250.50")).toBeInTheDocument();

    expect(screen.getByText("Ticket Promedio")).toBeInTheDocument();
    expect(screen.getByText("$128.75")).toBeInTheDocument();

    expect(screen.getByText("Tiempo Promedio KDS")).toBeInTheDocument();
    expect(screen.getByText("7")).toBeInTheDocument();

    expect(screen.getByText("Propinas Totales")).toBeInTheDocument();
    expect(screen.getByText("$980.00")).toBeInTheDocument();

    expect(screen.getByText("Pérdidas por Cobro")).toBeInTheDocument();
    expect(screen.getByText("$150.00")).toBeInTheDocument();

    expect(screen.getByText("Nuevos Clientes")).toBeInTheDocument();
    expect(screen.getByText("14")).toBeInTheDocument();
  });

  it("formats negative net utility properly", () => {
    render(
      <FinancialSummaryKPIs
        summary={{
          totalSales: 2000,
          totalOrders: 10,
          averageTicket: 200,
          totalTips: 50,
          averageCompletionTimeMinutes: 5,
          totalExpenses: 3000,
          totalUncollected: 0,
        }}
        newCustomersCount={0}
        netUtility={-1000}
      />,
    );

    expect(screen.getByText("-$1,000.00")).toBeInTheDocument();
  });
});
