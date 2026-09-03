import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { PeakHoursCards } from "../PeakHoursCards";
import type { PeakHoursSummary } from "@/lib/services/hourlyAnalytics";

describe("PeakHoursCards Component", () => {
  const mockSummary: PeakHoursSummary = {
    peakSalesHour: {
      hour: 14,
      label: "14:00",
      amount: 1540.5,
      percentage: 28.5,
    },
    peakOrdersHour: {
      hour: 13,
      label: "13:00",
      count: 18,
      percentage: 32.1,
    },
    peakTicketHour: {
      hour: 20,
      label: "20:00",
      averageTicket: 345.5,
      ordersCount: 4,
    },
    rushWindow: {
      startHour: 13,
      endHour: 16,
      label: "13:00 - 16:00",
      sales: 3800,
      percentage: 55.4,
      orders: 35,
    },
    activeHoursCount: 8,
    totalPeriodSales: 5400,
    totalPeriodOrders: 56,
    daysInPeriod: 1,
  };

  it("should render all 4 cards with formatted metrics in sum mode", () => {
    render(<PeakHoursCards summary={mockSummary} mode="sum" />);

    expect(screen.getByText("Pico de Facturación")).toBeInTheDocument();
    expect(screen.getByText("14:00")).toBeInTheDocument();
    expect(screen.getByText("28.5% del total")).toBeInTheDocument();

    expect(screen.getByText("Pico de Pedidos")).toBeInTheDocument();
    expect(screen.getByText("13:00")).toBeInTheDocument();
    expect(screen.getByText("18 pedidos")).toBeInTheDocument();

    expect(screen.getByText("Ventana Rush (3h)")).toBeInTheDocument();
    expect(screen.getByText("13:00 - 16:00")).toBeInTheDocument();
    expect(screen.getByText("55.4% del día")).toBeInTheDocument();

    expect(screen.getByText("Mayor Ticket Promedio")).toBeInTheDocument();
    expect(screen.getByText("$345.50")).toBeInTheDocument();
    expect(screen.getByText("a las 20:00")).toBeInTheDocument();
  });

  it("should render average mode labels when mode is average", () => {
    render(<PeakHoursCards summary={mockSummary} mode="average" />);

    expect(screen.getByText("Pico Ventas (Prom.)")).toBeInTheDocument();
    expect(screen.getByText("Pico Pedidos (Prom.)")).toBeInTheDocument();
    expect(screen.getAllByText(/ \/ día/i).length).toBeGreaterThanOrEqual(1);
  });

  it("should display fallback messages when summary or values are null", () => {
    render(<PeakHoursCards summary={null} />);

    expect(screen.getByText("Sin ventas en el período")).toBeInTheDocument();
    expect(screen.getByText("Sin pedidos registrados")).toBeInTheDocument();
    expect(screen.getByText("Sin actividad suficiente")).toBeInTheDocument();
    expect(screen.getByText("Sin datos de ticket")).toBeInTheDocument();
  });
});
