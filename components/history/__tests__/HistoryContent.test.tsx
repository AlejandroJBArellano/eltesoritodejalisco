import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import { HistoryContent } from "../HistoryContent";
import { useOptionalUser } from "@/components/UserProvider";

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
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

vi.mock("@/components/pos/FacturacionModal", () => ({
  FacturacionModal: ({ onClose }: { onClose: () => void }) => (
    <div data-testid="facturacion-modal">
      <span>Modal de Facturación</span>
      <button onClick={onClose}>Cerrar Factura</button>
    </div>
  ),
}));

describe("HistoryContent Component", () => {
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
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
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
                order_items: [],
                payments: [],
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

  it("renders access denied view for WAITER role", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    render(<HistoryContent />);

    expect(screen.getByText("Acceso Denegado")).toBeDefined();
    expect(screen.getByText(/El rol de/)).toBeDefined();
    expect(screen.getByText("MESERO")).toBeDefined();
    expect(screen.getByRole("link", { name: /Volver al Dashboard/i })).toBeDefined();
  });

  it("renders full history view for ADMIN role, toggles archive, finalize modal, and billing modal", async () => {
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

    // Close finalize modal
    const cancelBtn = screen.getByText("Cancelar");
    fireEvent.click(cancelBtn);

    await waitFor(() => {
      expect(screen.queryByText("Efectivo Caja")).toBeNull();
    });

    // Expand order row to trigger Facturar Orden
    const row = screen.getByTestId("order-row-ord-1");
    fireEvent.click(row);

    await waitFor(() => {
      expect(screen.getByText("Facturar Orden")).toBeDefined();
    });

    const facturarBtn = screen.getByText("Facturar Orden");
    fireEvent.click(facturarBtn);

    await waitFor(() => {
      expect(screen.getByTestId("facturacion-modal")).toBeDefined();
    });

    // Close facturacion modal
    const closeFacturaBtn = screen.getByText("Cerrar Factura");
    fireEvent.click(closeFacturaBtn);

    await waitFor(() => {
      expect(screen.queryByTestId("facturacion-modal")).toBeNull();
    });
  });

  it("renders loading indicator while orders are being fetched", () => {
    global.fetch = vi.fn().mockImplementation(() => new Promise(() => {}));

    render(<HistoryContent />);

    expect(screen.getByText("Cargando historial y datos...")).toBeDefined();
  });
});
