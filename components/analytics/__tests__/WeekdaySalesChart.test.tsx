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
    },
  ];

  it("renders empty state when all sales are 0", () => {
    render(<WeekdaySalesChart data={[]} />);

    expect(screen.getByText("Ventas por Día de la Semana")).toBeInTheDocument();
    expect(
      screen.getByText("Sin ventas registradas en el período."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("weekday-sales-chart")).not.toBeInTheDocument();
  });

  it("renders bars, toggles metric and handles tooltip interaction", () => {
    render(<WeekdaySalesChart data={mockDays} />);

    expect(screen.getByTestId("weekday-sales-chart")).toBeInTheDocument();
    expect(screen.getByText(/Día más fuerte:/i)).toBeInTheDocument();
    expect(screen.getByText("Vie")).toBeInTheDocument();

    // Toggle between Average and Total
    const totalBtn = screen.getByRole("button", { name: /Total Facturado/i });
    fireEvent.click(totalBtn);
    expect(totalBtn.className).toContain("bg-amber-500");

    const avgBtn = screen.getByRole("button", { name: /Promedio \/ Día/i });
    fireEvent.click(avgBtn);
    expect(avgBtn.className).toContain("bg-amber-500");

    // Hover over best day (Viernes)
    const friGroup = screen.getByText("Vie").closest("g");
    expect(friGroup).not.toBeNull();

    fireEvent.mouseEnter(friGroup!);
    expect(screen.getByText("Mejor Día ⚡")).toBeInTheDocument();
    expect(screen.getByText(/Promedio \/ día:/i)).toBeInTheDocument();
    expect(screen.getByText(/30%/i)).toBeInTheDocument();

    fireEvent.mouseLeave(friGroup!);
    expect(screen.queryByText("Mejor Día ⚡")).not.toBeInTheDocument();

    // Hover over non-best day (Lunes)
    const monGroup = screen.getByText("Lun").closest("g");
    expect(monGroup).not.toBeNull();
    fireEvent.mouseEnter(monGroup!);
    expect(screen.getByText("Lunes")).toBeInTheDocument();
    fireEvent.mouseLeave(monGroup!);
  });
});
