import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailyStatsSection } from "../DailyStatsSection";
import type { DashboardStats } from "../types";
import type { HourlySalesRow } from "@/lib/services/hourlyAnalytics";

const mockStats: DashboardStats = {
  activeOrdersCount: 5,
  salesToday: 4250.5,
  customersCount: 38,
  tipsToday: 520,
};

const mockHourlyRows: HourlySalesRow[] = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  hourLabel: `${String(i).padStart(2, "0")}:00 - ${String(i).padStart(2, "0")}:59`,
  displayHour: `${String(i).padStart(2, "0")}:00`,
  sales: i === 14 ? 4250.5 : 0,
  orders: i === 14 ? 5 : 0,
  rawSales: i === 14 ? 4250.5 : 0,
  rawOrders: i === 14 ? 5 : 0,
  averageTicket: i === 14 ? 850.1 : 0,
  percentageOfSales: i === 14 ? 100 : 0,
  percentageOfOrders: i === 14 ? 100 : 0,
  isPeakSales: i === 14,
  isPeakOrders: i === 14,
  isHighActivity: i === 14,
}));

describe("DailyStatsSection Component", () => {
  it("renders daily summary collapsible section with 3 stat cards when no hourlyRows", () => {
    render(<DailyStatsSection stats={mockStats} />);

    expect(screen.getByText("Resumen del Día")).toBeInTheDocument();
    expect(screen.getByText("Órdenes Activas")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();

    expect(screen.getByText("Venta Bruta")).toBeInTheDocument();
    expect(screen.getByText("$4,250.50")).toBeInTheDocument();

    expect(screen.getByText("Propinas Hoy")).toBeInTheDocument();
    expect(screen.getByText("$520.00")).toBeInTheDocument();
    expect(screen.queryByTestId("today-sales-chart")).not.toBeInTheDocument();
  });

  it("renders TodaySalesChart inside Resumen del Día when hourlyRows is provided", () => {
    render(
      <DailyStatsSection stats={mockStats} hourlyRows={mockHourlyRows} />,
    );

    expect(screen.getByText("Resumen del Día")).toBeInTheDocument();
    expect(screen.getByTestId("today-sales-chart")).toBeInTheDocument();
    expect(screen.getByText("Ventas Intradía")).toBeInTheDocument();
    expect(screen.getByText("Órdenes Activas")).toBeInTheDocument();
    expect(screen.getByText("Venta Bruta")).toBeInTheDocument();
    expect(screen.getByText("Propinas Hoy")).toBeInTheDocument();
  });
});

