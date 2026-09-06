import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MonthlySalesChart } from "../MonthlySalesChart";
import type { MonthlySalesRow } from "@/lib/services/performanceAnalytics";

describe("MonthlySalesChart Component", () => {
  const mockMonths: MonthlySalesRow[] = [
    {
      monthKey: "2026-07",
      monthName: "Jul 2026",
      shortMonthName: "Jul",
      year: 2026,
      totalSales: 40000,
      totalOrders: 160,
      averageTicket: 250,
      growthPercentage: null,
      isRecordMonth: false,
    },
    {
      monthKey: "2026-08",
      monthName: "Ago 2026",
      shortMonthName: "Ago",
      year: 2026,
      totalSales: 60000,
      totalOrders: 200,
      averageTicket: 300,
      growthPercentage: 50,
      isRecordMonth: true,
    },
    {
      monthKey: "2026-09",
      monthName: "Sep 2026",
      shortMonthName: "Sep",
      year: 2026,
      totalSales: 45000,
      totalOrders: 180,
      averageTicket: 250,
      growthPercentage: -25,
      isRecordMonth: false,
    },
  ];

  it("renders empty state when data is empty or all sales are 0", () => {
    render(<MonthlySalesChart data={[]} />);

    expect(
      screen.getByText("Ventas Mensuales (Últimos 12 Meses)"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Sin historial de facturación en los últimos 12 meses."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("monthly-sales-chart")).not.toBeInTheDocument();
  });

  it("renders bars, record badge and handles tooltip hover with growth percentage", () => {
    render(<MonthlySalesChart data={mockMonths} />);

    expect(screen.getByTestId("monthly-sales-chart")).toBeInTheDocument();
    expect(screen.getByText(/Mes Récord:/i)).toBeInTheDocument();
    expect(screen.getByText("Ago 2026")).toBeInTheDocument();
    expect(screen.getByText("Jul")).toBeInTheDocument();
    expect(screen.getByText("Ago")).toBeInTheDocument();
    expect(screen.getByText("Sep")).toBeInTheDocument();

    // Hover over record month (Ago)
    const agoGroup = screen.getByText("Ago").closest("g");
    expect(agoGroup).not.toBeNull();

    fireEvent.mouseEnter(agoGroup!);
    expect(screen.getByText("Récord 🏆")).toBeInTheDocument();
    expect(screen.getByText(/Ventas del mes:/i)).toBeInTheDocument();
    expect(screen.getByText("+50%")).toBeInTheDocument();

    fireEvent.mouseLeave(agoGroup!);
    expect(screen.queryByText("Récord 🏆")).not.toBeInTheDocument();

    // Hover over negative growth month (Sep)
    const sepGroup = screen.getByText("Sep").closest("g");
    expect(sepGroup).not.toBeNull();

    fireEvent.mouseEnter(sepGroup!);
    expect(screen.getByText("-25%")).toBeInTheDocument();
    fireEvent.mouseLeave(sepGroup!);
  });
});
