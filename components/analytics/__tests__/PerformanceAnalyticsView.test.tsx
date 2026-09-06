import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { PerformanceAnalyticsView } from "../PerformanceAnalyticsView";
import type { PerformanceAnalyticsResult } from "@/lib/services/performanceAnalytics";

const mockPerformanceData: PerformanceAnalyticsResult = {
  kpis: {
    periodAverageTicket: 275.5,
    totalPeriodSales: 27550,
    totalPeriodOrders: 100,
    bestWeekday: {
      name: "Sábado",
      shortName: "Sáb",
      totalSales: 12000,
      averageSales: 6000,
      averageTicket: 300,
    },
    recordMonth: {
      monthName: "Ago 2026",
      totalSales: 85000,
      orders: 340,
      averageTicket: 250,
    },
  },
  dailyTickets: [
    {
      date: "2026-09-01",
      label: "mar 1",
      sales: 12000,
      orders: 45,
      averageTicket: 266.67,
    },
    {
      date: "2026-09-02",
      label: "mié 2",
      sales: 15550,
      orders: 55,
      averageTicket: 282.73,
    },
  ],
  weekdaySales: [
    {
      dayIndex: 0,
      name: "Lunes",
      shortName: "Lun",
      totalSales: 3000,
      totalOrders: 10,
      dayCount: 1,
      averageSales: 3000,
      averageTicket: 300,
      percentageOfSales: 10.9,
      isBestDay: false,
    },
    {
      dayIndex: 1,
      name: "Martes",
      shortName: "Mar",
      totalSales: 12000,
      totalOrders: 45,
      dayCount: 1,
      averageSales: 12000,
      averageTicket: 266.67,
      percentageOfSales: 43.6,
      isBestDay: false,
    },
    {
      dayIndex: 2,
      name: "Miércoles",
      shortName: "Mié",
      totalSales: 12550,
      totalOrders: 45,
      dayCount: 1,
      averageSales: 12550,
      averageTicket: 278.89,
      percentageOfSales: 45.5,
      isBestDay: true,
    },
    {
      dayIndex: 3,
      name: "Jueves",
      shortName: "Jue",
      totalSales: 0,
      totalOrders: 0,
      dayCount: 1,
      averageSales: 0,
      averageTicket: 0,
      percentageOfSales: 0,
      isBestDay: false,
    },
    {
      dayIndex: 4,
      name: "Viernes",
      shortName: "Vie",
      totalSales: 0,
      totalOrders: 0,
      dayCount: 1,
      averageSales: 0,
      averageTicket: 0,
      percentageOfSales: 0,
      isBestDay: false,
    },
    {
      dayIndex: 5,
      name: "Sábado",
      shortName: "Sáb",
      totalSales: 0,
      totalOrders: 0,
      dayCount: 1,
      averageSales: 0,
      averageTicket: 0,
      percentageOfSales: 0,
      isBestDay: false,
    },
    {
      dayIndex: 6,
      name: "Domingo",
      shortName: "Dom",
      totalSales: 0,
      totalOrders: 0,
      dayCount: 1,
      averageSales: 0,
      averageTicket: 0,
      percentageOfSales: 0,
      isBestDay: false,
    },
  ],
  monthlySales: [
    {
      monthKey: "2026-08",
      monthName: "Ago 2026",
      shortMonthName: "Ago",
      year: 2026,
      totalSales: 85000,
      totalOrders: 340,
      averageTicket: 250,
      growthPercentage: null,
      isRecordMonth: true,
    },
    {
      monthKey: "2026-09",
      monthName: "Sep 2026",
      shortMonthName: "Sep",
      year: 2026,
      totalSales: 27550,
      totalOrders: 100,
      averageTicket: 275.5,
      growthPercentage: -67.6,
      isRecordMonth: false,
    },
  ],
};

describe("PerformanceAnalyticsView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<PerformanceAnalyticsView />);
    expect(
      screen.getByText(/Cargando analítica de rendimiento/i),
    ).toBeInTheDocument();
  });

  it("renders error state when API fails and allows retry", async () => {
    let attempts = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts === 1) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Error en base de datos" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockPerformanceData,
      });
    });

    render(<PerformanceAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText("Error al Cargar Rendimiento")).toBeInTheDocument();
      expect(screen.getByText("Error en base de datos")).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /Reintentar/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Analítica de Rendimiento")).toBeInTheDocument();
      expect(screen.getByText("Evolución del Ticket Promedio")).toBeInTheDocument();
    });
  });

  it("renders charts and allows switching period and clicking refresh", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPerformanceData,
    });
    global.fetch = fetchMock;

    render(<PerformanceAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText("Analítica de Rendimiento")).toBeInTheDocument();
      expect(screen.getByText("Evolución del Ticket Promedio")).toBeInTheDocument();
      expect(screen.getByText("Ventas por Día de la Semana")).toBeInTheDocument();
      expect(screen.getByText("Ventas Mensuales (Últimos 12 Meses)")).toBeInTheDocument();
    });

    // Switch period to "Hoy"
    const todayBtn = screen.getByRole("button", { name: "Hoy" });
    fireEvent.click(todayBtn);
    expect(fetchMock).toHaveBeenCalledWith("/api/analytics/performance?period=today");

    // Click refresh button in header
    const refreshBtn = screen.getByRole("button", { name: /Actualizar/i });
    fireEvent.click(refreshBtn);
    expect(fetchMock).toHaveBeenCalledWith("/api/analytics/performance?period=today");
  });

  it("supports custom date range filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockPerformanceData,
    });
    global.fetch = fetchMock;

    render(<PerformanceAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText("Analítica de Rendimiento")).toBeInTheDocument();
    });

    // Select "Personalizado"
    const customBtn = screen.getByRole("button", { name: "Personalizado" });
    fireEvent.click(customBtn);

    const startInput = screen.getByLabelText("Desde:");
    const endInput = screen.getByLabelText("Hasta:");
    const applyBtn = screen.getByRole("button", { name: /Aplicar Rango/i });

    // When start date is empty, apply does not trigger fetch
    expect(applyBtn).toBeDisabled();
    fireEvent.click(applyBtn);

    // Set dates
    fireEvent.change(startInput, { target: { value: "2026-08-01" } });
    fireEvent.change(endInput, { target: { value: "2026-08-15" } });
    expect(applyBtn).not.toBeDisabled();

    fireEvent.click(applyBtn);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics/performance?period=custom&startDate=2026-08-01&endDate=2026-08-15",
    );

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Actualizar/i })).not.toBeDisabled();
    });

    // Click refresh button in header while in custom mode
    const refreshBtn = screen.getByRole("button", { name: /Actualizar/i });
    fireEvent.click(refreshBtn);
    expect(fetchMock).toHaveBeenCalledWith(
      "/api/analytics/performance?period=custom&startDate=2026-08-01&endDate=2026-08-15",
    );
  });

  it("handles non-Error rejection in catch block", async () => {
    global.fetch = vi.fn().mockRejectedValue("Error de red no estándar");

    render(<PerformanceAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText("Error al Cargar Rendimiento")).toBeInTheDocument();
      expect(screen.getByText("Error de red desconocido")).toBeInTheDocument();
    });
  });
});
