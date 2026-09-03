import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SalesAnalyticsView } from "../SalesAnalyticsView";
import type { ReportData } from "../../reports/types";

const mockSalesData: ReportData = {
  period: "7days",
  summary: {
    totalSales: 15000,
    totalOrders: 80,
    averageTicket: 187.5,
    totalTips: 700,
    averageCompletionTimeMinutes: 6.5,
    totalExpenses: 4500,
    totalUncollected: 0,
  },
  salesByDay: {
    "2026-09-01": 8000,
    "2026-09-02": 7000,
  },
  ordersByDay: {
    "2026-09-01": 45,
    "2026-09-02": 35,
  },
  itemsByDay: {
    "2026-09-01": [{ name: "Flat White", quantity: 20, revenue: 1300 }],
  },
  salesBySource: {
    POS: { count: 80, total: 15000 },
  },
  topSellingItems: [{ name: "Flat White", quantity: 20, revenue: 1300 }],
  productSales: [
    { id: "1", name: "Flat White", category: "Bebidas", quantity: 20, revenue: 1300 },
    { id: "2", name: "Brownie", category: "Postres", quantity: 15, revenue: 750 },
  ],
  customers: {
    topCustomers: [],
    newCustomersCount: 3,
  },
};

describe("SalesAnalyticsView Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {}));
    render(<SalesAnalyticsView />);
    expect(
      screen.getByText(/Cargando analítica y tendencias/i),
    ).toBeInTheDocument();
  });

  it("renders error state when API fails and permits retry", async () => {
    let attempts = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      attempts++;
      if (attempts === 1) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Error interno del servidor" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockSalesData,
      });
    });

    render(<SalesAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText("Error al Cargar Gráficas")).toBeInTheDocument();
      expect(screen.getByText("Error interno del servidor")).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /Reintentar/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Analítica de Ventas y Productos")).toBeInTheDocument();
      expect(screen.getByText("Evolución Diaria de Ventas")).toBeInTheDocument();
    });
  });

  it("renders charts and allows switching period", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSalesData,
    });
    global.fetch = fetchMock;

    render(<SalesAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText("Analítica de Ventas y Productos")).toBeInTheDocument();
      expect(screen.getByText("Evolución Diaria de Ventas")).toBeInTheDocument();
      expect(screen.getByText("Distribución de Ventas por Producto")).toBeInTheDocument();
    });

    // Switch period to "Hoy"
    const todayBtn = screen.getByRole("button", { name: "Hoy" });
    fireEvent.click(todayBtn);

    expect(fetchMock).toHaveBeenCalledWith("/api/reports?period=today");
  });

  it("supports custom date range filters", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockSalesData,
    });
    global.fetch = fetchMock;

    render(<SalesAnalyticsView />);

    await waitFor(() => {
      expect(screen.getByText("Analítica de Ventas y Productos")).toBeInTheDocument();
    });

    const customBtn = screen.getByRole("button", { name: "Personalizado" });
    fireEvent.click(customBtn);

    const startInput = screen.getByLabelText("Desde:");
    const endInput = screen.getByLabelText("Hasta:");
    const applyBtn = screen.getByRole("button", { name: /Aplicar Rango/i });

    fireEvent.change(startInput, { target: { value: "2026-08-01" } });
    fireEvent.change(endInput, { target: { value: "2026-08-10" } });
    fireEvent.click(applyBtn);

    expect(fetchMock).toHaveBeenCalledWith(
      "/api/reports?period=custom&startDate=2026-08-01&endDate=2026-08-10",
    );
  });
});
