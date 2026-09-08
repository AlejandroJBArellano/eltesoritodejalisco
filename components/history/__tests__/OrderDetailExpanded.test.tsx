import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { OrderDetailExpanded } from "../OrderDetailExpanded";
import { OrderStatus, type OrderWithDetails, type OrderAuditLog } from "@/types";

const mockOrder: OrderWithDetails = {
  id: "ord-1",
  orderNumber: "1001",
  source: "POS",
  status: OrderStatus.PAID,
  table: "Mesa 1",
  notes: "Notas adicionales",
  subtotal: 100,
  tax: 16,
  total: 116,
  createdAt: new Date("2026-09-08T12:00:00Z"),
  updatedAt: new Date("2026-09-08T12:00:00Z"),
  customer: {
    id: "cust-1",
    name: "Alejandro",
    phone: "1234567890",
    loyaltyPoints: 10,
    totalSpend: 1500,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  orderItems: [
    {
      id: "item-1",
      orderId: "ord-1",
      menuItemId: "menu-1",
      quantity: 2,
      unitPrice: 50,
      notes: "Sin picante",
      createdAt: new Date(),
      menuItem: {
        id: "menu-1",
        name: "Tacos de Birria",
        price: 50,
        category: "Tacos",
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
    {
      id: "item-2",
      orderId: "ord-1",
      menuItemId: "menu-2",
      quantity: 1,
      unitPrice: 30,
      createdAt: new Date(),
      menuItem: undefined as unknown as any,
    },
  ],
  payments: [],
};

describe("OrderDetailExpanded Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders order item details, customer name and notes", () => {
    render(
      <OrderDetailExpanded
        order={mockOrder}
        onBillOrder={vi.fn()}
        initialAuditLogs={[]}
      />,
    );

    expect(screen.getByText("Detalle de la Orden #1001")).toBeDefined();
    expect(screen.getByText("Alejandro")).toBeDefined();
    expect(screen.getByText("Tacos de Birria")).toBeDefined();
    expect(screen.getByText("Notas: Sin picante")).toBeDefined();
    expect(screen.getByText("Notas generales:")).toBeDefined();
    expect(screen.getByText("Notas adicionales")).toBeDefined();
    expect(screen.getByText("$100.00")).toBeDefined();
    expect(screen.getAllByText("Producto").length).toBe(2); // Table header + fallback item name
  });

  it("calls onBillOrder when Facturar button is clicked", () => {
    const onBillOrder = vi.fn();
    render(
      <OrderDetailExpanded
        order={mockOrder}
        onBillOrder={onBillOrder}
        initialAuditLogs={[]}
      />,
    );

    const billBtn = screen.getByText("Facturar Orden");
    fireEvent.click(billBtn);
    expect(onBillOrder).toHaveBeenCalledWith(mockOrder);
  });

  it("shows empty state when there are no audit logs", () => {
    render(
      <OrderDetailExpanded
        order={mockOrder}
        onBillOrder={vi.fn()}
        initialAuditLogs={[]}
      />,
    );

    expect(screen.getByText("Sin modificaciones registradas")).toBeDefined();
  });

  it("renders audit timeline with all event types and badges", () => {
    const sampleLogs: OrderAuditLog[] = [
      {
        id: "log-1",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-1",
        user_name: "Papulince",
        action_type: "CREATED",
        details: { summary: "Torta Ahogada x3, Horchata x2" },
        created_at: "2026-09-08T18:42:00Z",
      },
      {
        id: "log-2",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-2",
        user_name: "Mesero Juan",
        action_type: "ITEMS_ADDED",
        details: { summary: "Cerveza x1" },
        created_at: "2026-09-08T18:45:00Z",
      },
      {
        id: "log-3",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-3",
        user_name: "Mamulince",
        action_type: "ITEMS_REMOVED",
        details: {
          summary: "Torta Ahogada x1",
          authorizedBy: "Gerente Laura",
        },
        created_at: "2026-09-08T18:48:00Z",
      },
      {
        id: "log-4",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-4",
        user_name: "Admin",
        action_type: "DISCOUNT_APPLIED",
        details: {
          discountType: "PERCENT",
          discountValue: 10,
          discountReason: "Cortesía",
          authorizedBy: "Gerente",
        },
        created_at: "2026-09-08T18:55:00Z",
      },
      {
        id: "log-5",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-5",
        user_name: "Admin",
        action_type: "DISCOUNT_APPLIED",
        details: {
          discountType: "FIXED",
          discountValue: 25,
        },
        created_at: "2026-09-08T18:56:00Z",
      },
      {
        id: "log-6",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-6",
        user_name: "Carlos",
        action_type: "PAID",
        details: { method: "Efectivo" },
        created_at: "2026-09-08T19:00:00Z",
      },
      {
        id: "log-7",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-7",
        user_name: "Gerente Laura",
        action_type: "REOPENED",
        details: {
          reason: "Error en propina",
          authorizedBy: "Laura",
        },
        created_at: "2026-09-08T19:05:00Z",
      },
      {
        id: "log-8",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-8",
        user_name: "Admin",
        action_type: "CANCELLED",
        details: {
          reason: "Cancelación definitiva",
          authorizedBy: "Dueño",
        },
        created_at: "invalid-date-test",
      },
      {
        id: "log-9",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-9",
        user_name: "Sistema",
        action_type: "OTHER_UNKNOWN",
        details: { authorizedBy: "Admin" },
        created_at: "2026-09-08T19:15:00Z",
      },
      {
        id: "log-10",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-10",
        user_name: "Mesero",
        action_type: "CREATED",
        details: { itemsCount: 4 },
        created_at: "2026-09-08T19:20:00Z",
      },
      {
        id: "log-11",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-11",
        user_name: "Mesero",
        action_type: "CREATED",
        details: {},
        created_at: "2026-09-08T19:21:00Z",
      },
      {
        id: "log-12",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-12",
        user_name: "Mesero",
        action_type: "ITEMS_ADDED",
        details: {},
        created_at: "2026-09-08T19:22:00Z",
      },
      {
        id: "log-13",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-13",
        user_name: "Mesero",
        action_type: "ITEMS_REMOVED",
        details: {},
        created_at: "2026-09-08T19:23:00Z",
      },
    ];

    render(
      <OrderDetailExpanded
        order={mockOrder}
        onBillOrder={vi.fn()}
        initialAuditLogs={sampleLogs}
      />,
    );

    expect(screen.getByText("Historial de Modificaciones")).toBeDefined();
    expect(screen.getAllByText("Comanda creada").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Productos agregados").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Productos eliminados").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Descuento aplicado").length).toBeGreaterThan(0);
    expect(screen.getByText("Comanda pagada")).toBeDefined();
    expect(screen.getByText("Cuenta reabierta")).toBeDefined();
    expect(screen.getByText("Comanda cancelada")).toBeDefined();
    expect(screen.getByText("Modificación")).toBeDefined();

    expect(screen.getByText(/Papulince comandó: Torta Ahogada x3, Horchata x2/)).toBeDefined();
    expect(screen.getByText(/Mesero Juan agregó: Cerveza x1/)).toBeDefined();
    expect(screen.getByText(/Mamulince eliminó: Torta Ahogada x1 \(Autorizado con PIN\)/)).toBeDefined();
    expect(screen.getByText(/Admin aplicó descuento: -10% \(Cortesía\) \(Autorizado con PIN\)/)).toBeDefined();
    expect(screen.getByText(/Admin aplicó descuento: -\$25.00/)).toBeDefined();
    expect(screen.getByText(/Carlos registró cobro \(Efectivo\)/)).toBeDefined();
    expect(screen.getByText(/Gerente Laura reabrió la cuenta: Error en propina \(Autorizado con PIN\)/)).toBeDefined();
    expect(screen.getByText(/Admin canceló la orden \(Cancelación definitiva\) \(Autorizado con PIN\)/)).toBeDefined();
    expect(screen.getByText(/Sistema modificó la comanda \(Autorizado con PIN\)/)).toBeDefined();
    expect(screen.getByText(/Mesero comandó: 4 productos/)).toBeDefined();
  });

  it("fetches audit logs from API when initialAuditLogs is not provided", async () => {
    const apiLogs: OrderAuditLog[] = [
      {
        id: "api-log-1",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-1",
        user_name: "Mesero",
        action_type: "CREATED",
        details: { summary: "Orden inicial" },
        created_at: "2026-09-08T18:00:00Z",
      },
    ];

    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ logs: apiLogs }),
    } as Response);

    render(
      <OrderDetailExpanded
        order={mockOrder}
        onBillOrder={vi.fn()}
      />,
    );

    expect(screen.getByText("Cargando historial...")).toBeDefined();

    await waitFor(() => {
      expect(screen.getByText(/Mesero comandó: Orden inicial/)).toBeDefined();
    });

    expect(fetchSpy).toHaveBeenCalledWith("/api/orders/ord-1/audit");
    fetchSpy.mockRestore();
  });

  it("handles fetch error gracefully without crashing", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(global, "fetch").mockRejectedValueOnce(new Error("Network failure"));

    render(
      <OrderDetailExpanded
        order={mockOrder}
        onBillOrder={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Sin modificaciones registradas")).toBeDefined();
    });

    expect(consoleErrorSpy).toHaveBeenCalledWith(
      "Error al cargar historial de auditoría:",
      expect.any(Error),
    );

    fetchSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("handles non-ok API response gracefully", async () => {
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const fetchSpy = vi.spyOn(global, "fetch").mockResolvedValueOnce({
      ok: false,
      status: 500,
      json: async () => ({ error: "Server error" }),
    } as Response);

    render(
      <OrderDetailExpanded
        order={mockOrder}
        onBillOrder={vi.fn()}
      />,
    );

    await waitFor(() => {
      expect(screen.getByText("Sin modificaciones registradas")).toBeDefined();
    });

    fetchSpy.mockRestore();
    consoleErrorSpy.mockRestore();
  });

  it("does not show '(Autorizado con PIN)' when user is Admin or same user as authorizedBy", () => {
    const adminLogs: OrderAuditLog[] = [
      {
        id: "log-admin-1",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-admin",
        user_name: "Alejandro Arellano",
        action_type: "ITEMS_REMOVED",
        details: {
          summary: "papulince x4",
          // Mismo usuario guardado previamente en base de datos
          authorizedBy: "Alejandro Arellano",
        },
        created_at: "2026-09-08T17:03:00Z",
      },
      {
        id: "log-admin-2",
        order_id: "ord-1",
        tenant_id: "tenant-1",
        user_id: "u-admin",
        user_name: "Alejandro Arellano",
        action_type: "ITEMS_REMOVED",
        details: {
          summary: "1 producto(s) eliminado(s)",
        },
        created_at: "2026-09-08T17:04:00Z",
      },
    ];

    render(
      <OrderDetailExpanded
        order={mockOrder}
        onBillOrder={vi.fn()}
        initialAuditLogs={adminLogs}
      />,
    );

    // Debe mostrar los productos exactos
    expect(screen.getByText(/Alejandro Arellano eliminó: papulince x4/)).toBeDefined();
    // No debe contener el sufijo de PIN
    expect(screen.queryByText(/papulince x4 \(Autorizado con PIN\)/)).toBeNull();

    // Debe limpiar el sufijo redundante 'eliminado(s)' del resumen antiguo
    expect(screen.getByText(/Alejandro Arellano eliminó: 1 producto\(s\)$/)).toBeDefined();
    expect(screen.queryByText(/1 producto\(s\) eliminado\(s\)/)).toBeNull();
  });
});
