import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { HourlyBreakdownTable } from "../HourlyBreakdownTable";
import type { HourlySalesRow } from "@/lib/services/hourlyAnalytics";

describe("HourlyBreakdownTable Component", () => {
  const mockRows: HourlySalesRow[] = [
    {
      hour: 12,
      hourLabel: "12:00",
      displayHour: "12:00",
      sales: 1200,
      orders: 10,
      rawSales: 1200,
      rawOrders: 10,
      averageTicket: 120,
      percentageOfSales: 40,
      percentageOfOrders: 35,
      isPeakSales: true,
      isPeakOrders: true,
      isHighActivity: true,
    },
    {
      hour: 13,
      hourLabel: "13:00",
      displayHour: "13:00",
      sales: 900,
      orders: 6,
      rawSales: 900,
      rawOrders: 6,
      averageTicket: 150,
      percentageOfSales: 30,
      percentageOfOrders: 25,
      isPeakSales: false,
      isPeakOrders: false,
      isHighActivity: true,
    },
    {
      hour: 14,
      hourLabel: "14:00",
      displayHour: "14:00",
      sales: 300,
      orders: 2,
      rawSales: 300,
      rawOrders: 2,
      averageTicket: 150,
      percentageOfSales: 10,
      percentageOfOrders: 10,
      isPeakSales: true,
      isPeakOrders: false,
      isHighActivity: false,
    },
    {
      hour: 15,
      hourLabel: "15:00",
      displayHour: "15:00",
      sales: 100,
      orders: 8,
      rawSales: 100,
      rawOrders: 8,
      averageTicket: 12.5,
      percentageOfSales: 5,
      percentageOfOrders: 20,
      isPeakSales: false,
      isPeakOrders: true,
      isHighActivity: false,
    },
    {
      hour: 16,
      hourLabel: "16:00",
      displayHour: "16:00",
      sales: 0,
      orders: 0,
      rawSales: 0,
      rawOrders: 0,
      averageTicket: 0,
      percentageOfSales: 0,
      percentageOfOrders: 0,
      isPeakSales: false,
      isPeakOrders: false,
      isHighActivity: false,
    },
  ];

  it("should render empty state when rows is empty", () => {
    render(<HourlyBreakdownTable rows={[]} />);
    expect(screen.getByTestId("hourly-table-empty")).toBeInTheDocument();
  });

  it("should render headers, rows and export button", () => {
    render(
      <HourlyBreakdownTable
        rows={mockRows}
        mode="sum"
        periodLabel="Hoy"
      />,
    );

    expect(screen.getByTestId("hourly-breakdown-table")).toBeInTheDocument();
    expect(screen.getByText("Desglose Detallado por Hora")).toBeInTheDocument();
    expect(screen.getByText("Venta Total")).toBeInTheDocument();

    // Check row 12:00
    expect(screen.getByTestId("hourly-table-row-12")).toBeInTheDocument();
    expect(screen.getByText("12:00 - 12:59")).toBeInTheDocument();
    expect(screen.getByText("$1,200.00")).toBeInTheDocument();
    expect(screen.getByText("40.0%")).toBeInTheDocument();
    expect(screen.getByText("Pico Ventas & Pedidos 🔥⚡")).toBeInTheDocument();

    // Check row 13:00 (High activity)
    expect(screen.getByText("Alta Actividad")).toBeInTheDocument();

    // Check row 14:00 (Pico de Ventas)
    expect(screen.getByText("Pico de Ventas ⚡")).toBeInTheDocument();

    // Check row 15:00 (Pico de Pedidos)
    expect(screen.getByText("Pico de Pedidos 🔥")).toBeInTheDocument();

    // Check row 16:00 (Sin Actividad)
    expect(screen.getByText("Sin Actividad")).toBeInTheDocument();

    // Export button should be present
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument();
  });

  it("should render average mode column headers", () => {
    render(
      <HourlyBreakdownTable
        rows={mockRows}
        mode="average"
        periodLabel="Últimos 7 días"
      />,
    );

    expect(screen.getByText("Venta Prom./Día")).toBeInTheDocument();
    expect(screen.getByText("Pedidos/Día")).toBeInTheDocument();
  });
});
