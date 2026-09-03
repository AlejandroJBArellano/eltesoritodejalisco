import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HistoryContent } from "../HistoryContent";

const mockGetUser = vi.fn().mockResolvedValue({
  data: { user: { id: "user-admin" } },
});

const mockProfileSingle = vi.fn().mockResolvedValue({
  data: { role: "ADMIN" },
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    auth: { getUser: mockGetUser },
    from: () => ({
      select: () => ({
        eq: () => ({
          eq: () => ({
            single: mockProfileSingle,
          }),
        }),
      }),
    }),
  }),
}));

vi.mock("@/hooks/usePendingCut", () => ({
  usePendingCut: () => ({
    loading: false,
    hasPendingCut: false,
    pendingDate: null,
    pendingOrders: 0,
    refresh: vi.fn(),
  }),
}));

describe("HistoryContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/tenant") {
        return { ok: true, json: async () => ({ tenant: { id: "tenant-1" } }) };
      }
      if (url === "/api/orders") {
        return {
          ok: true,
          json: async () => ({
            orders: [
              {
                id: "ord-1",
                order_number: "1001",
                source: "POS",
                status: "PAID",
                total: 116,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
              },
            ],
          }),
        };
      }
      if (url === "/api/daily-cuts") {
        return { ok: true, json: async () => ({ cuts: [] }) };
      }
      return { ok: false };
    });
  });

  it("renders access denied view for WAITER role", async () => {
    mockProfileSingle.mockResolvedValueOnce({
      data: { role: "WAITER" },
    });

    render(<HistoryContent />);

    await waitFor(() => {
      expect(screen.getByText("Acceso Denegado")).toBeDefined();
    });
    expect(screen.getByText(/El rol de/)).toBeDefined();
    expect(screen.getByText("MESERO")).toBeDefined();
  });

  it("renders full history view for ADMIN role and handles archive toggle and finalize modal", async () => {
    mockProfileSingle.mockResolvedValueOnce({
      data: { role: "ADMIN" },
    });

    render(<HistoryContent />);

    await waitFor(() => {
      expect(screen.getByText("Historial de Ventas")).toBeDefined();
    });

    expect(screen.getByText("Corte de Caja Diario")).toBeDefined();
    expect(screen.getByText("Análisis y Tendencias")).toBeDefined();
    expect(screen.getByPlaceholderText("Buscar por folio (#1001)...")).toBeDefined();

    // Toggle cuts archive
    const archiveBtn = screen.getByText("Archivo de Cortes");
    fireEvent.click(archiveBtn);

    await waitFor(() => {
      expect(screen.getByText("Ocultar Archivo")).toBeDefined();
      expect(screen.getByText("Archivo de Cortes Diarios")).toBeDefined();
    });

    // Open finalize modal
    const finalizeBtn = screen.getByText("Finalizar Día");
    fireEvent.click(finalizeBtn);

    await waitFor(() => {
      expect(screen.getByText("Efectivo Caja")).toBeDefined();
      expect(screen.getByText("Tarjeta Caja")).toBeDefined();
    });

    // Close modal
    const cancelBtn = screen.getByText("Cancelar");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText("Efectivo Caja")).toBeNull();
    });
  });
});
