import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PerformanceSummaryKPIs } from "../PerformanceSummaryKPIs";
import type { PerformanceKPIs } from "@/lib/services/performanceAnalytics";

describe("PerformanceSummaryKPIs Component", () => {
  it("renders empty or fallback states when no KPIs provided", () => {
    render(<PerformanceSummaryKPIs kpis={null} />);

    expect(screen.getByTestId("performance-summary-kpis")).toBeInTheDocument();
    expect(screen.getByText("$0.00")).toBeInTheDocument();
    expect(screen.getByText("Sin pedidos registrados")).toBeInTheDocument();
    expect(screen.getByText("Sin datos en el período")).toBeInTheDocument();
    expect(screen.getByText("Sin histórico de facturación")).toBeInTheDocument();
  });

  it("renders populated KPI cards with metrics and badges", () => {
    const mockKpis: PerformanceKPIs = {
      periodAverageTicket: 245.5,
      totalPeriodSales: 24550,
      totalPeriodOrders: 100,
      bestWeekday: {
        name: "Sábado",
        shortName: "Sáb",
        totalSales: 12000,
        averageSales: 6000,
        averageTicket: 300,
      },
      recordMonth: {
        monthName: "Ago 2026",
        totalSales: 85000,
        orders: 340,
        averageTicket: 250,
      },
    };

    render(<PerformanceSummaryKPIs kpis={mockKpis} />);

    // Ticket promedio
    expect(screen.getByText("$245.50")).toBeInTheDocument();
    expect(
      screen.getByText(/100 pedidos • Total \$24,550/i),
    ).toBeInTheDocument();

    // Mejor día
    expect(screen.getByText("Sábado")).toBeInTheDocument();
    expect(screen.getByText("Líder")).toBeInTheDocument();
    expect(screen.getByText(/Promedio \$6,000.00 \/ día/i)).toBeInTheDocument();

    // Mes récord
    expect(screen.getByText("Ago 2026")).toBeInTheDocument();
    expect(screen.getByText("Récord")).toBeInTheDocument();
    expect(
      screen.getByText(/Facturación \$85,000.00/i),
    ).toBeInTheDocument();
  });
});
