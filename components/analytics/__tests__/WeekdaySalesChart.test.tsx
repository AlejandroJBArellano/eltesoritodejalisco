import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeekdaySalesChart } from "../WeekdaySalesChart";
import type { WeekdaySalesRow } from "@/lib/services/performanceAnalytics";

describe("WeekdaySalesChart Component", () => {
  const mockDays: WeekdaySalesRow[] = [
    {
      dayIndex: 0,
      name: "Lunes",
      shortName: "Lun",
      totalSales: 1500,
      totalOrders: 6,
      dayCount: 1,
      averageSales: 1500,
      averageTicket: 250,
      percentageOfSales: 15,
      isBestDay: false,
      historicalBaseline: {
        averageTicket: 240,
        averageSales: 1400,
        averageOrders: 5.8,
        totalOccurrences: 5,
      },
      occurrences: [
        {
          date: "2026-08-31",
          label: "lun 31 ago",
          sales: 1500,
          orders: 6,
          averageTicket: 250,
        },
      ],
    },
    {
      dayIndex: 1,
      name: "Martes",
      shortName: "Mar",
      totalSales: 2000,
      totalOrders: 8,
      dayCount: 1,
      averageSales: 2000,
      averageTicket: 250,
      percentageOfSales: 20,
      isBestDay: false,
      historicalBaseline: {
        averageTicket: 250,
        averageSales: 2000,
        averageOrders: 8,
        totalOccurrences: 4,
      },
      occurrences: [],
    },
    {
      dayIndex: 2,
      name: "Miércoles",
      shortName: "Mié",
      totalSales: 1000,
      totalOrders: 4,
      dayCount: 1,
      averageSales: 1000,
      averageTicket: 250,
      percentageOfSales: 10,
      isBestDay: false,
      historicalBaseline: {
        averageTicket: 250,
        averageSales: 1000,
        averageOrders: 4,
        totalOccurrences: 4,
      },
      occurrences: [],
    },
    {
      dayIndex: 3,
      name: "Jueves",
      shortName: "Jue",
      totalSales: 1200,
      totalOrders: 5,
      dayCount: 1,
      averageSales: 1200,
      averageTicket: 240,
      percentageOfSales: 12,
      isBestDay: false,
      historicalBaseline: {
        averageTicket: 240,
        averageSales: 1200,
        averageOrders: 5,
        totalOccurrences: 4,
      },
      occurrences: [],
    },
    {
      dayIndex: 4,
      name: "Viernes",
      shortName: "Vie",
      totalSales: 3000,
      totalOrders: 10,
      dayCount: 1,
      averageSales: 3000,
      averageTicket: 300,
      percentageOfSales: 30,
      isBestDay: true,
      historicalBaseline: {
        averageTicket: 280,
        averageSales: 2800,
        averageOrders: 10,
        totalOccurrences: 4,
      },
      occurrences: [
        {
          date: "2026-09-04",
          label: "vie 4 sep",
          sales: 3000,
          orders: 10,
          averageTicket: 300,
        },
      ],
    },
    {
      dayIndex: 5,
      name: "Sábado",
      shortName: "Sáb",
      totalSales: 800,
      totalOrders: 3,
      dayCount: 1,
      averageSales: 800,
      averageTicket: 266.67,
      percentageOfSales: 8,
      isBestDay: false,
      historicalBaseline: {
        averageTicket: 266.67,
        averageSales: 800,
        averageOrders: 3,
        totalOccurrences: 4,
      },
      occurrences: [],
    },
    {
      dayIndex: 6,
      name: "Domingo",
      shortName: "Dom",
      totalSales: 500,
      totalOrders: 2,
      dayCount: 1,
      averageSales: 500,
      averageTicket: 250,
      percentageOfSales: 5,
      isBestDay: false,
      historicalBaseline: {
        averageTicket: 250,
        averageSales: 500,
        averageOrders: 2,
        totalOccurrences: 4,
      },
      occurrences: [],
    },
  ];

  it("renders empty state when all sales are 0", () => {
    render(<WeekdaySalesChart data={[]} />);

    expect(
      screen.getByText("Rendimiento por Día de la Semana"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sin ventas registradas en el período."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("weekday-sales-chart")).not.toBeInTheDocument();
  });

  it("renders bars, toggles metrics (Ticket Promedio, Total Facturado, Promedio / Día)", () => {
    render(<WeekdaySalesChart data={mockDays} />);

    expect(screen.getByTestId("weekday-sales-chart")).toBeInTheDocument();
    expect(screen.getByText(/Día más fuerte en ventas:/i)).toBeInTheDocument();
    expect(screen.getByText("Vie")).toBeInTheDocument();

    // Toggle to Ticket Promedio
    const ticketBtn = screen.getByRole("button", { name: /Ticket Promedio/i });
    fireEvent.click(ticketBtn);
    expect(ticketBtn.className).toContain("bg-emerald-500");

    // Toggle to Total Facturado
    const totalBtn = screen.getByRole("button", { name: /Total Facturado/i });
    fireEvent.click(totalBtn);
    expect(totalBtn.className).toContain("bg-amber-500");

    // Toggle back to Promedio / Día
    const avgBtn = screen.getByRole("button", { name: /Promedio \/ Día/i });
    fireEvent.click(avgBtn);
    expect(avgBtn.className).toContain("bg-amber-500");

    // Hover over best day (Viernes)
    const friGroup = screen.getByText("Vie").closest("g");
    expect(friGroup).not.toBeNull();

    fireEvent.mouseEnter(friGroup!);
    expect(screen.getByText("Líder Ventas ⚡")).toBeInTheDocument();
    expect(screen.getByText(/Promedio \/ día:/i)).toBeInTheDocument();
    expect(screen.getByText(/30%/i)).toBeInTheDocument();

    fireEvent.mouseLeave(friGroup!);
    expect(screen.queryByText("Líder Ventas ⚡")).not.toBeInTheDocument();

    // Hover over non-best day (Lunes)
    const monGroup = screen.getByText("Lun").closest("g");
    expect(monGroup).not.toBeNull();
    fireEvent.mouseEnter(monGroup!);
    expect(screen.getByText("Lunes")).toBeInTheDocument();
    fireEvent.mouseLeave(monGroup!);
  });

  it("handles clicking on a bar to open contextual comparison panel and toggle/clear selection", () => {
    render(<WeekdaySalesChart data={mockDays} />);

    expect(
      screen.queryByTestId("weekday-contextual-comparison"),
    ).not.toBeInTheDocument();

    // Click on Viernes bar
    const friGroup = screen.getByText("Vie").closest("g");
    fireEvent.click(friGroup!);

    // Contextual comparison opens
    expect(
      screen.getByTestId("weekday-contextual-comparison"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Comparativa Contextual: Viernes"),
    ).toBeInTheDocument();

    // "Limpiar Selección" button appears in header
    const clearBtn = screen.getByRole("button", { name: /Limpiar Selección/i });
    expect(clearBtn).toBeInTheDocument();

    // Click bar again to toggle off
    fireEvent.click(friGroup!);
    expect(
      screen.queryByTestId("weekday-contextual-comparison"),
    ).not.toBeInTheDocument();

    // Click Lunes bar to open
    const monGroup = screen.getByText("Lun").closest("g");
    fireEvent.click(monGroup!);
    expect(
      screen.getByText("Comparativa Contextual: Lunes"),
    ).toBeInTheDocument();

    // Click "Limpiar Selección" to close
    const clearBtn2 = screen.getByRole("button", { name: /Limpiar Selección/i });
    fireEvent.click(clearBtn2);
    expect(
      screen.queryByTestId("weekday-contextual-comparison"),
    ).not.toBeInTheDocument();

    // Click Viernes bar to open again and close using the internal X button
    fireEvent.click(friGroup!);
    expect(
      screen.getByTestId("weekday-contextual-comparison"),
    ).toBeInTheDocument();
    const closeComparisonBtn = screen.getByRole("button", {
      name: "Cerrar comparativa",
    });
    fireEvent.click(closeComparisonBtn);
    expect(
      screen.queryByTestId("weekday-contextual-comparison"),
    ).not.toBeInTheDocument();
  });
});
