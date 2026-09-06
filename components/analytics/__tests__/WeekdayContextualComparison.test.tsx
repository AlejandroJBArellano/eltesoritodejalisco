import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { WeekdayContextualComparison } from "../WeekdayContextualComparison";
import type { WeekdaySalesRow } from "@/lib/services/performanceAnalytics";

describe("WeekdayContextualComparison Component", () => {
  const mockFridayWithOccurrences: WeekdaySalesRow = {
    dayIndex: 4,
    name: "Viernes",
    shortName: "Vie",
    totalSales: 28000,
    totalOrders: 80,
    dayCount: 2,
    averageSales: 14000,
    averageTicket: 350,
    percentageOfSales: 35,
    isBestDay: true,
    historicalBaseline: {
      averageTicket: 300,
      averageSales: 12000,
      averageOrders: 40,
      totalOccurrences: 10,
    },
    occurrences: [
      {
        date: "2026-08-28",
        label: "vie 28 ago",
        sales: 11000,
        orders: 40,
        averageTicket: 275, // negative diff vs 300 baseline
      },
      {
        date: "2026-09-04",
        label: "vie 4 sep",
        sales: 17000,
        orders: 40,
        averageTicket: 425, // positive diff vs 300 baseline
      },
    ],
  };

  it("renders most recent occurrence by default and calculates positive variations", () => {
    const handleClose = vi.fn();
    render(
      <WeekdayContextualComparison
        day={mockFridayWithOccurrences}
        onClose={handleClose}
      />,
    );

    expect(screen.getByTestId("weekday-contextual-comparison")).toBeInTheDocument();
    expect(
      screen.getByText("Comparativa Contextual: Viernes"),
    ).toBeInTheDocument();

    // Default is the most recent (2026-09-04, ticket $425.00)
    expect(screen.getByText("$425.00")).toBeInTheDocument();
    expect(screen.getAllByText("+41.7%")).toHaveLength(2);
    expect(screen.getByText("+$125.00 vs promedio")).toBeInTheDocument();

    // Sales ($17,000 vs 12,000)
    expect(screen.getByText("$17,000.00")).toBeInTheDocument();
    expect(screen.getByText("+$5,000.00 vs promedio")).toBeInTheDocument();

    // Orders (40 vs 40)
    expect(screen.getByText("40 órdenes")).toBeInTheDocument();
    expect(screen.getByText("+0.0%")).toBeInTheDocument();

    // Click close
    const closeBtn = screen.getByRole("button", { name: "Cerrar comparativa" });
    fireEvent.click(closeBtn);
    expect(handleClose).toHaveBeenCalledTimes(1);
  });

  it("allows switching between occurrences to see previous dates with negative variation", () => {
    render(<WeekdayContextualComparison day={mockFridayWithOccurrences} />);

    // Click the previous occurrence (vie 28 ago)
    const prevChip = screen.getByRole("button", { name: "vie 28 ago" });
    fireEvent.click(prevChip);

    // Ticket $275.00 vs baseline 300 (-$25.00, -8.3%)
    expect(screen.getByText("$275.00")).toBeInTheDocument();
    expect(screen.getAllByText("-8.3%")).toHaveLength(2);
    expect(screen.getByText("-$25.00 vs promedio")).toBeInTheDocument();

    // Sales $11,000 vs baseline 12,000 (-$1,000.00, -8.3%)
    expect(screen.getByText("$11,000.00")).toBeInTheDocument();
    expect(screen.getByText("-$1,000.00 vs promedio")).toBeInTheDocument();
  });

  it("renders state when day has 0 occurrences in the period", () => {
    const emptyDay: WeekdaySalesRow = {
      dayIndex: 0,
      name: "Lunes",
      shortName: "Lun",
      totalSales: 0,
      totalOrders: 0,
      dayCount: 1,
      averageSales: 0,
      averageTicket: 0,
      percentageOfSales: 0,
      isBestDay: false,
      historicalBaseline: {
        averageTicket: 200,
        averageSales: 5000,
        averageOrders: 25,
        totalOccurrences: 5,
      },
      occurrences: [],
    };

    render(<WeekdayContextualComparison day={emptyDay} />);

    expect(
      screen.getByText(/No hubo órdenes en este día durante el período/i),
    ).toBeInTheDocument();
    expect(screen.getByText("$200.00")).toBeInTheDocument();
    expect(screen.getByText("$5,000.00")).toBeInTheDocument();
  });

  it("handles baseline of 0 gracefully without dividing by zero", () => {
    const zeroBaselineDay: WeekdaySalesRow = {
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
        averageTicket: 0,
        averageSales: 0,
        averageOrders: 0,
        totalOccurrences: 1,
      },
      occurrences: [
        {
          date: "2026-09-06",
          label: "dom 6 sep",
          sales: 500,
          orders: 2,
          averageTicket: 250,
        },
      ],
    };

    render(<WeekdayContextualComparison day={zeroBaselineDay} />);

    expect(screen.getByText("$250.00")).toBeInTheDocument();
    expect(screen.getAllByText("+100.0%")).toHaveLength(3);
  });
});
