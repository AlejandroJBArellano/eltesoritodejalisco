import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { TodaySalesChart } from "../TodaySalesChart";
import type { HourlySalesRow } from "@/lib/services/hourlyAnalytics";

const mockHourlyRows: HourlySalesRow[] = Array.from({ length: 24 }, (_, i) => ({
  hour: i,
  hourLabel: `${String(i).padStart(2, "0")}:00 - ${String(i).padStart(2, "0")}:59`,
  displayHour: `${String(i).padStart(2, "0")}:00`,
  sales: i === 14 ? 4500 : i === 15 ? 2300 : 0,
  orders: i === 14 ? 10 : i === 15 ? 5 : 0,
  rawSales: i === 14 ? 4500 : i === 15 ? 2300 : 0,
  rawOrders: i === 14 ? 10 : i === 15 ? 5 : 0,
  averageTicket: i === 14 ? 450 : i === 15 ? 460 : 0,
  percentageOfSales: i === 14 ? 66.2 : i === 15 ? 33.8 : 0,
  percentageOfOrders: i === 14 ? 66.7 : i === 15 ? 33.3 : 0,
  isPeakSales: i === 14,
  isPeakOrders: i === 14,
  isHighActivity: i === 14 || i === 15,
}));

describe("TodaySalesChart Component", () => {
  it("renders live indicator, total sales, and KPI metrics", () => {
    render(
      <TodaySalesChart
        hourlyRows={mockHourlyRows}
        salesToday={6800}
        ordersCount={15}
        tipsToday={340}
      />,
    );

    expect(screen.getByText("En Vivo")).toBeInTheDocument();
    expect(screen.getByText("Ventas Intradía")).toBeInTheDocument();
    expect(screen.getByText("$6,800.00")).toBeInTheDocument();
    expect(screen.getByText("(+$340.00 propinas)")).toBeInTheDocument();
    expect(screen.getByText("Hora Pico")).toBeInTheDocument();
    expect(screen.getByText("Ticket Promedio")).toBeInTheDocument();
    expect(screen.getByText("Órdenes")).toBeInTheDocument();
    expect(screen.getByText("15")).toBeInTheDocument();
  });

  it("renders empty state message when salesToday is 0", () => {
    const emptyRows = mockHourlyRows.map((r) => ({
      ...r,
      sales: 0,
      orders: 0,
      isPeakSales: false,
    }));

    render(
      <TodaySalesChart
        hourlyRows={emptyRows}
        salesToday={0}
        ordersCount={0}
        tipsToday={0}
      />,
    );

    expect(
      screen.getByText("Aún no hay órdenes cobradas hoy."),
    ).toBeInTheDocument();
  });

  it("shows tooltip card when hovering an hour point and hides on mouse leave", () => {
    const { container } = render(
      <TodaySalesChart
        hourlyRows={mockHourlyRows}
        salesToday={6800}
        ordersCount={15}
        tipsToday={340}
      />,
    );

    const rects = container.querySelectorAll("rect.cursor-pointer");
    expect(rects.length).toBe(24);

    // Hover hour 14 (index 14)
    fireEvent.mouseEnter(rects[14]);

    expect(screen.getByText("14:00 - 14:59")).toBeInTheDocument();
    expect(screen.getByText("$4,500.00")).toBeInTheDocument();
    expect(screen.getByText("Pico")).toBeInTheDocument();

    // Mouse leave chart body
    const chartBody = screen.getByTestId("today-sales-chart-body");
    fireEvent.mouseLeave(chartBody);

    expect(screen.queryByText("14:00 - 14:59")).not.toBeInTheDocument();
  });
});
