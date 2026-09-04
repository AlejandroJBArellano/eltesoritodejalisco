import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ReportsContent } from "../ReportsContent";
import { useOptionalUser } from "@/components/UserProvider";
import type { ReportData } from "../types";

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
}));

const mockData: ReportData = {
  period: "7days",
  summary: {
    totalSales: 12000,
    totalOrders: 60,
    averageTicket: 200,
    totalTips: 600,
    averageCompletionTimeMinutes: 7,
    totalExpenses: 4000,
    totalUncollected: 0,
  },
  salesByDay: {
    "2026-09-01": 7000,
    "2026-09-02": 5000,
  },
  ordersByDay: {
    "2026-09-01": 35,
    "2026-09-02": 25,
  },
  itemsByDay: {
    "2026-09-01": [{ name: "Americano", quantity: 20, revenue: 1000 }],
  },
  salesBySource: {
    POS: { count: 60, total: 12000 },
  },
  topSellingItems: [{ name: "Americano", quantity: 20, revenue: 1000 }],
  productSales: [
    { id: "p1", name: "Americano", category: "Café", quantity: 20, revenue: 1000 },
  ],
  customers: {
    topCustomers: [{ name: "Ana Torres", totalSpend: 800, loyaltyPoints: 80 }],
    newCustomersCount: 5,
  },
};

describe("ReportsContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "ADMIN",
      isAdmin: true,
      isWaiter: false,
      isChef: false,
      isAuthenticated: true,
    });
  });

  it("renders loading state initially", () => {
    global.fetch = vi.fn().mockReturnValue(new Promise(() => {})); // pending forever
    render(<ReportsContent />);
    expect(screen.getByText(/Cargando reportes & métricas/i)).toBeInTheDocument();
  });

  it("renders error state when API fails and allows retry", async () => {
    let callCount = 0;
    global.fetch = vi.fn().mockImplementation(() => {
      callCount++;
      if (callCount === 1) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Falla de conexión" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => mockData,
      });
    });

    render(<ReportsContent />);

    await waitFor(() => {
      expect(screen.getByText("Error al Cargar Datos")).toBeInTheDocument();
      expect(screen.getByText("Falla de conexión")).toBeInTheDocument();
    });

    const retryBtn = screen.getByRole("button", { name: /Reintentar/i });
    fireEvent.click(retryBtn);

    await waitFor(() => {
      expect(screen.getByText("Reportes & Balance")).toBeInTheDocument();
      expect(screen.getAllByText("$12,000.00").length).toBeGreaterThanOrEqual(1);
    });
  });

  it("renders full reports view on successful fetch", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockData,
    });

    render(<ReportsContent />);

    await waitFor(() => {
      expect(screen.getByText("Reportes & Balance")).toBeInTheDocument();
      expect(screen.getByText("Resumen Financiero y Operativo")).toBeInTheDocument();
      expect(screen.getByText("Detalle de Ventas Diarias")).toBeInTheDocument();
      expect(screen.getByText("Ventas por Producto (Detallado)")).toBeInTheDocument();
      expect(screen.getByText("Mejores Clientes")).toBeInTheDocument();
    });
  });

  it("renders Acceso Denegado when user is Waiter", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    render(<ReportsContent />);

    expect(screen.getByText("Acceso Denegado")).toBeInTheDocument();
    expect(screen.getByText("MESERO")).toBeInTheDocument();
    expect(
      screen.getByText(/no cuenta con permisos para acceder a reportes/i),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /Volver al Dashboard/i }),
    ).toBeInTheDocument();
  });
});
