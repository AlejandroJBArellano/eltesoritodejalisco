import React from "react";
import { describe, it, expect } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { HourlySalesHeatmap } from "../HourlySalesHeatmap";
import type { HeatmapCell } from "@/lib/services/hourlyAnalytics";
import { DAYS_OF_WEEK, formatHourLabel } from "@/lib/services/hourlyAnalytics";

describe("HourlySalesHeatmap Component", () => {
  const generateMockCells = (): HeatmapCell[] => {
    const cells: HeatmapCell[] = [];
    DAYS_OF_WEEK.forEach((day) => {
      for (let h = 0; h < 24; h++) {
        const isPeak = day.index === 3 && h === 14;
        let sales = 0;
        let orders = 0;
        if (isPeak) {
          sales = 1000;
          orders = 10;
        } else if (h === 13) {
          sales = 600; // 0.60 -> ratio < 0.75
          orders = 6;
        } else if (h === 12) {
          sales = 350; // 0.35 -> ratio < 0.5
          orders = 3;
        } else if (h === 11) {
          sales = 150; // 0.15 -> ratio < 0.25
          orders = 1;
        }

        cells.push({
          dayIndex: day.index,
          dayName: day.name,
          dayShort: day.short,
          hour: h,
          hourLabel: formatHourLabel(h),
          sales,
          orders,
          intensity: sales / 1000,
        });
      }
    });
    return cells;
  };

  it("should render empty state when cells array is empty", () => {
    render(<HourlySalesHeatmap cells={[]} />);
    expect(screen.getByTestId("hourly-heatmap-empty")).toBeInTheDocument();
  });

  it("should render 7 days and heatmap cells", () => {
    const cells = generateMockCells();
    render(<HourlySalesHeatmap cells={cells} />);

    expect(screen.getByTestId("hourly-heatmap")).toBeInTheDocument();
    expect(screen.getByText("Mapa de Calor Semanal (Día vs Hora)")).toBeInTheDocument();

    // Check all day labels
    DAYS_OF_WEEK.forEach((day) => {
      expect(screen.getByText(day.short)).toBeInTheDocument();
    });

    // Check cells exist
    const peakCell = screen.getByTestId("heatmap-cell-3-14");
    expect(peakCell).toBeInTheDocument();
    expect(peakCell).toHaveTextContent("⚡");
  });

  it("should switch between sales and orders metric", async () => {
    const user = userEvent.setup();
    const cells = generateMockCells();
    render(<HourlySalesHeatmap cells={cells} />);

    const salesBtn = screen.getByTestId("heatmap-metric-sales");
    const ordersBtn = screen.getByTestId("heatmap-metric-orders");

    expect(salesBtn).toHaveClass("bg-amber-500");

    await user.click(ordersBtn);
    expect(ordersBtn).toHaveClass("bg-orange-500");

    await user.click(salesBtn);
    expect(salesBtn).toHaveClass("bg-amber-500");
  });

  it("should display hover details when mouse enters a cell and reset on mouse leave", () => {
    const cells = generateMockCells();
    render(<HourlySalesHeatmap cells={cells} />);

    expect(
      screen.getByText("Pasa el cursor sobre cualquier celda para ver el detalle."),
    ).toBeInTheDocument();

    const peakCell = screen.getByTestId("heatmap-cell-3-14");
    fireEvent.mouseEnter(peakCell);

    expect(screen.getByText("Jueves a las 14:00")).toBeInTheDocument();
    expect(screen.getByText("$1,000.00")).toBeInTheDocument();
    expect(screen.getByText(/10 pedidos/i)).toBeInTheDocument();

    fireEvent.mouseLeave(peakCell);
    expect(
      screen.getByText("Pasa el cursor sobre cualquier celda para ver el detalle."),
    ).toBeInTheDocument();
  });

  it("should format average mode on hover", () => {
    const cells = generateMockCells();
    render(<HourlySalesHeatmap cells={cells} mode="average" />);

    const peakCell = screen.getByTestId("heatmap-cell-3-14");
    fireEvent.mouseEnter(peakCell);

    expect(screen.getByText(/\$1,000\.00 \/ día/i)).toBeInTheDocument();
    expect(screen.getByText(/10 pedidos \/ día/i)).toBeInTheDocument();
  });
});
