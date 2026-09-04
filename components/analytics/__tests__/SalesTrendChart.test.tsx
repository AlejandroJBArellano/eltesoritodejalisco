import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SalesTrendChart } from "../SalesTrendChart";

describe("SalesTrendChart Component", () => {
  it("renders empty state when no sales data is available", () => {
    render(
      <SalesTrendChart
        chartData={[]}
        selectedDay={null}
        onSelectDay={vi.fn()}
        selectedDayItems={[]}
      />,
    );

    expect(screen.getByText("Evolución Diaria de Ventas")).toBeInTheDocument();
    expect(
      screen.getByText("No hay registros de ventas en el período seleccionado."),
    ).toBeInTheDocument();
  });

  it("renders chart container and handles drill-down panel when a day is selected", () => {
    const handleSelectDay = vi.fn();
    const mockChartData = [
      { date: "2026-09-01", total: 4500, label: "mar 1" },
      { date: "2026-09-02", total: 3200, label: "mié 2" },
    ];
    const mockDetailItems = [
      { name: "Cold Brew 16oz", quantity: 18, revenue: 1170 },
      { name: "Tostada de Aguacate", quantity: 10, revenue: 850 },
    ];

    render(
      <SalesTrendChart
        chartData={mockChartData}
        selectedDay="2026-09-01"
        onSelectDay={handleSelectDay}
        selectedDayItems={mockDetailItems}
      />,
    );

    expect(screen.getByTestId("sales-trend-barchart")).toBeInTheDocument();
    expect(screen.getByText(/Top Productos —/i)).toBeInTheDocument();
    expect(screen.getByText("Cold Brew 16oz")).toBeInTheDocument();
    expect(screen.getByText("18 vendidos")).toBeInTheDocument();
    expect(screen.getByText("$1170.00")).toBeInTheDocument();

    const clearBtn = screen.getByRole("button", { name: /Limpiar Selección/i });
    fireEvent.click(clearBtn);
    expect(handleSelectDay).toHaveBeenCalledWith(null);
  });

  it("handles bar hover and bar click", () => {
    const handleSelectDay = vi.fn();
    const mockChartData = [
      { date: "2026-09-01", total: 4500, label: "mar 1" },
    ];
    render(
      <SalesTrendChart
        chartData={mockChartData}
        selectedDay={null}
        onSelectDay={handleSelectDay}
        selectedDayItems={[]}
      />,
    );

    const barGroup = screen.getByText("mar 1").parentElement;
    if (barGroup) {
      fireEvent.mouseEnter(barGroup);
      expect(screen.getByText(/Ventas Totales • mar 1/i)).toBeInTheDocument();
      fireEvent.click(barGroup);
      expect(handleSelectDay).toHaveBeenCalledWith("2026-09-01");
      fireEvent.mouseLeave(barGroup);
    }
  });
});
