import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  HourlySalesBarChart,
  HourlyBarChartTooltip,
} from "../HourlySalesBarChart";
import type { HourlySalesRow } from "@/lib/services/hourlyAnalytics";

describe("HourlySalesBarChart Component", () => {
  const mockData: HourlySalesRow[] = [
    {
      hour: 12,
      hourLabel: "12:00",
      displayHour: "12:00",
      sales: 450,
      orders: 4,
      rawSales: 450,
      rawOrders: 4,
      averageTicket: 112.5,
      percentageOfSales: 30,
      percentageOfOrders: 25,
      isPeakSales: false,
      isPeakOrders: false,
      isHighActivity: true,
    },
    {
      hour: 13,
      hourLabel: "13:00",
      displayHour: "13:00",
      sales: 750,
      orders: 8,
      rawSales: 750,
      rawOrders: 8,
      averageTicket: 93.75,
      percentageOfSales: 50,
      percentageOfOrders: 50,
      isPeakSales: true,
      isPeakOrders: true,
      isHighActivity: true,
    },
    {
      hour: 14,
      hourLabel: "14:00",
      displayHour: "14:00",
      sales: 300,
      orders: 4,
      rawSales: 300,
      rawOrders: 4,
      averageTicket: 75,
      percentageOfSales: 20,
      percentageOfOrders: 25,
      isPeakSales: false,
      isPeakOrders: false,
      isHighActivity: false,
    },
  ];

  it("should render empty state when no data provided", () => {
    render(<HourlySalesBarChart data={[]} />);
    expect(screen.getByTestId("hourly-bar-chart-empty")).toBeInTheDocument();
  });

  it("should render chart container, headers and toggles", () => {
    render(<HourlySalesBarChart data={mockData} mode="sum" />);

    expect(screen.getByTestId("hourly-bar-chart")).toBeInTheDocument();
    expect(screen.getByText("Flujo por Hora del Día")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Acumulado total por hora durante el período seleccionado.",
      ),
    ).toBeInTheDocument();

    expect(screen.getByTestId("metric-btn-sales")).toBeInTheDocument();
    expect(screen.getByTestId("metric-btn-orders")).toBeInTheDocument();
  });

  it("should display average mode description", () => {
    render(<HourlySalesBarChart data={mockData} mode="average" />);
    expect(
      screen.getByText(
        "Promedio diario por hora durante el período seleccionado.",
      ),
    ).toBeInTheDocument();
  });

  it("should allow internal metric toggle when uncontrolled", async () => {
    const user = userEvent.setup();
    render(<HourlySalesBarChart data={mockData} />);

    const salesBtn = screen.getByTestId("metric-btn-sales");
    const ordersBtn = screen.getByTestId("metric-btn-orders");

    expect(salesBtn).toHaveClass("bg-amber-500");

    await user.click(ordersBtn);
    expect(ordersBtn).toHaveClass("bg-orange-500");

    await user.click(salesBtn);
    expect(salesBtn).toHaveClass("bg-amber-500");
  });

  it("should call onMetricChange when controlled", async () => {
    const user = userEvent.setup();
    const handleMetricChange = vi.fn();

    render(
      <HourlySalesBarChart
        data={mockData}
        metric="orders"
        onMetricChange={handleMetricChange}
      />,
    );

    const salesBtn = screen.getByTestId("metric-btn-sales");
    await user.click(salesBtn);

    expect(handleMetricChange).toHaveBeenCalledWith("sales");
  });

  it("should handle bar hover in chart canvas", () => {
    render(<HourlySalesBarChart data={mockData} />);
    const bar = screen.getByText("12:00").parentElement;
    if (bar) {
      fireEvent.mouseEnter(bar);
      expect(screen.getByTestId("hourly-chart-tooltip")).toBeInTheDocument();
      fireEvent.mouseLeave(bar);
    }
  });

  describe("HourlyBarChartTooltip", () => {
    it("should return null when inactive or empty", () => {
      const { container: c1 } = render(
        <HourlyBarChartTooltip active={false} payload={[]} />,
      );
      expect(c1.firstChild).toBeNull();

      const { container: c2 } = render(
        <HourlyBarChartTooltip active={true} payload={[]} />,
      );
      expect(c2.firstChild).toBeNull();
    });

    it("should render tooltip content for peak sales hour", () => {
      render(
        <HourlyBarChartTooltip
          active={true}
          payload={[{ payload: mockData[1] }]}
          isAvg={false}
          metric="sales"
        />,
      );

      expect(screen.getByTestId("hourly-chart-tooltip")).toBeInTheDocument();
      expect(screen.getByText("Pico ⚡")).toBeInTheDocument();
      expect(screen.getByText("$750.00")).toBeInTheDocument();
      expect(screen.getByText("8")).toBeInTheDocument();
      expect(screen.getByText("50%")).toBeInTheDocument();
      expect(screen.getByText("$93.75")).toBeInTheDocument();
    });

    it("should render tooltip content for peak orders hour with orders metric and average mode", () => {
      render(
        <HourlyBarChartTooltip
          active={true}
          payload={[{ payload: mockData[1] }]}
          isAvg={true}
          metric="orders"
        />,
      );

      expect(screen.getByText("Pico 🔥")).toBeInTheDocument();
      expect(screen.getAllByText(/ \/ día/i).length).toBe(2);
    });
  });
});
