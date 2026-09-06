import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AverageTicketTrendChart } from "../AverageTicketTrendChart";
import type { DailyTicketRow } from "@/lib/services/performanceAnalytics";

describe("AverageTicketTrendChart Component", () => {
  it("renders empty state when data array is empty", () => {
    render(<AverageTicketTrendChart data={[]} periodAverageTicket={0} />);

    expect(screen.getByText("Evolución del Ticket Promedio")).toBeInTheDocument();
    expect(
      screen.getByText("No hay órdenes registradas en el período seleccionado."),
    ).toBeInTheDocument();
    expect(screen.queryByTestId("average-ticket-trend-chart")).not.toBeInTheDocument();
  });

  it("renders chart with multiple data points, reference line and handles hover events", () => {
    const mockData: DailyTicketRow[] = [
      {
        date: "2026-09-01",
        label: "mar 1",
        sales: 500,
        orders: 2,
        averageTicket: 250,
      },
      {
        date: "2026-09-02",
        label: "mié 2",
        sales: 800,
        orders: 4,
        averageTicket: 200,
      },
    ];

    render(
      <AverageTicketTrendChart
        data={mockData}
        periodAverageTicket={225}
      />,
    );

    expect(screen.getByTestId("average-ticket-trend-chart")).toBeInTheDocument();
    expect(screen.getByText("Promedio Período: $225.00")).toBeInTheDocument();
    expect(screen.getByText("mar 1")).toBeInTheDocument();
    expect(screen.getByText("mié 2")).toBeInTheDocument();

    // Hover over first point
    const pointGroup = screen.getByText("mar 1").closest("g");
    expect(pointGroup).not.toBeNull();

    fireEvent.mouseEnter(pointGroup!);
    expect(screen.getByText("$250.00")).toBeInTheDocument();
    expect(screen.getByText(/Ventas: \$500/i)).toBeInTheDocument();
    expect(screen.getByText(/Pedidos: 2/i)).toBeInTheDocument();

    fireEvent.mouseLeave(pointGroup!);
    expect(screen.queryByText(/Ventas: \$500/i)).not.toBeInTheDocument();
  });

  it("renders accurately with a single data point", () => {
    const singleData: DailyTicketRow[] = [
      {
        date: "2026-09-01",
        label: "mar 1",
        sales: 300,
        orders: 1,
        averageTicket: 300,
      },
    ];

    render(
      <AverageTicketTrendChart
        data={singleData}
        periodAverageTicket={0}
      />,
    );

    expect(screen.getByTestId("average-ticket-trend-chart")).toBeInTheDocument();
    expect(screen.queryByText(/Promedio Período:/i)).not.toBeInTheDocument();
    expect(screen.getByText("mar 1")).toBeInTheDocument();
  });
});
