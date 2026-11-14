import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, DELETE } from "../route";
import { NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { logOrderAction } from "@/lib/services/orderAudit";

vi.mock("@/lib/auth", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/orderAudit", () => ({
  logOrderAction: vi.fn().mockResolvedValue({ success: true }),
}));

const fake = vi.hoisted(() => ({ db: null as null | { client: unknown } }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => fake.db!.client,
}));
vi.mock("@/lib/services/inventory", () => ({
  deductInventoryForOrder: vi.fn().mockResolvedValue({ success: true, deductions: [] }),
  reverseInventoryForOrder: vi.fn().mockResolvedValue({ success: true, deductions: [] }),
}));

import { createFakeDb, tesoritoTables } from "@/test/fakeSupabase";
import { deductInventoryForOrder } from "@/lib/services/inventory";

describe("GET /api/orders", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  it("returns 403 Forbidden when user is WAITER and posParam is not 'true'", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/orders");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe(
      "No autorizado para consultar el historial general de órdenes",
    );
  });

  it("allows WAITER when posParam is 'true' and filters after latest cut", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);

    const mockOrders = [{ id: "order-pos-1", total: 100 }];
    const mockOrdersBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
    };

    const mockCutsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "cut-1", created_at: "2026-09-25T12:00:00Z" },
      }),
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "daily_cuts") return mockCutsBuilder;
        return mockOrdersBuilder;
      }),
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/orders?pos=true",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toEqual(mockOrders);
    expect(mockOrdersBuilder.or).toHaveBeenCalledWith(
      "created_at.gt.2026-09-25T12:00:00Z,and(corte_id.is.null,estado_cierre.neq.ARCHIVADA)",
    );
  });

  it("filters unarchived orders when posParam is 'true' and no cuts exist", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);

    const mockOrders = [{ id: "order-pos-1", total: 100 }];
    const mockOrdersBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
    };

    const mockCutsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: null,
      }),
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "daily_cuts") return mockCutsBuilder;
        return mockOrdersBuilder;
      }),
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/orders?pos=true",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toEqual(mockOrders);
    expect(mockOrdersBuilder.or).toHaveBeenCalledWith(
      "corte_id.is.null,estado_cierre.neq.ARCHIVADA",
    );
  });

  it("allows ADMIN to query general orders history without posParam", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const mockOrders = [{ id: "order-hist-1", total: 250 }];
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/orders");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toEqual(mockOrders);
  });
});

describe("POST /api/orders", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
    fake.db = createFakeDb({
      ...tesoritoTables(),
      menu_items: [
        ...tesoritoTables().menu_items,
        { id: "item-1", tenant_id: "tenant-123", name: "Producto", price: 45, is_available: true },
        { id: "item-2", tenant_id: "tenant-123", name: "papulince", price: 50, is_available: true },
        { id: "item-3", tenant_id: "tenant-123", name: "Coca Cola", price: 30, is_available: true },
      ],
    });
  });

  it("creates an order passing item discounts and order discount to the RPC", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: { id: "new-order-1", order_number: "260907-001", total: 45 },
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue({
      rpc: mockRpc,
    } as any);

    const payload = {
      source: "POS",
      table: "Mesa 1",
      discountType: "FIXED",
      discountValue: 5,
      discountReason: "Promoción",
      orderItems: [
        {
          menuItemId: "item-1",
          quantity: 1,
          discountType: "PERCENT",
          discountValue: 10,
          discountScope: "ROW",
          discountReason: "Cortesía",
        },
      ],
    };

    const request = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.order).toBeDefined();

    expect(mockRpc).toHaveBeenCalledWith(
      "create_order_with_items",
      expect.objectContaining({
        p_discount_type: "FIXED",
        p_discount_value: 5,
        p_items: [
          expect.objectContaining({
            menu_item_id: "item-1",
            quantity: 1,
            unit_price: 45,
            discount_type: "PERCENT",
            discount_value: 10,
            discount_scope: "ROW",
            discount_reason: "Cortesía",
            options: [],
            tiers: [],
          }),
        ],
      }),
    );

    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "new-order-1",
        actionType: "CREATED",
      }),
    );
  });

  it("includes detailed items summary when RPC returns order items with menu item names", async () => {
    const mockRpc = vi.fn().mockResolvedValue({
      data: {
        id: "new-order-2",
        order_number: "260908-002",
        total: 1505,
        order_items: [
          { quantity: 1, menu_items: { name: "Producto" } },
          { quantity: 4, menu_items: { name: "papulince" } },
          { quantity: 8, menu_items: { name: "Coca Cola" } },
        ],
      },
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue({
      rpc: mockRpc,
    } as any);

    const payload = {
      source: "POS",
      table: "Comedor",
      orderItems: [
        { menuItemId: "item-1", quantity: 1 },
        { menuItemId: "item-2", quantity: 4 },
        { menuItemId: "item-3", quantity: 8 },
      ],
    };

    const request = new NextRequest("http://localhost:3000/api/orders", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    const response = await POST(request);
    expect(response.status).toBe(201);

    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "new-order-2",
        actionType: "CREATED",
        details: expect.objectContaining({
          summary: "Producto x1, papulince x4, Coca Cola x8",
          itemsCount: 3,
        }),
      }),
    );
  });
});

describe("POST /api/orders — personalización", () => {
  const mockTenant = { id: "tenant-123" };
  const okRpc = () =>
    vi.fn().mockResolvedValue({
      data: { id: "o-mix", order_number: "261113-001", total: 140, order_items: [] },
      error: null,
    });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
    fake.db = createFakeDb(tesoritoTables());
  });

  const post = (orderItems: unknown[]) =>
    POST(
      new NextRequest("http://localhost:3000/api/orders", {
        method: "POST",
        body: JSON.stringify({ source: "POS", orderItems }),
      }),
    );

  it("prices on the server and sends the snapshot to the RPC", async () => {
    const mockRpc = okRpc();
    vi.mocked(createClient).mockResolvedValue({ rpc: mockRpc } as any);

    const response = await post([
      {
        menuItemId: "mi-mixtos",
        quantity: 2,
        notes: "sin cebolla",
        // El precio del cliente se ignora
        unitPrice: 1,
        selections: [
          { optionId: "o-pastor", quantity: 2 },
          { optionId: "o-birria", quantity: 1 },
        ],
      },
    ]);

    expect(response.status).toBe(201);
    const item = mockRpc.mock.calls[0][1].p_items[0];
    expect(item).toMatchObject({
      menu_item_id: "mi-mixtos",
      quantity: 2,
      notes: "sin cebolla",
      unit_price: 140,
      base_unit_price: 0,
      discount_base_price: 140,
      skip_base_inventory: false,
      tiers: [{ group_id: "g-tacos", group_name: "Elige tus tacos", quantity: 3, price: 120 }],
    });
    expect(item.options).toEqual([
      expect.objectContaining({ option_id: "o-birria", option_name: "Birria", quantity: 1, unit_price: 0, inventory: [{ ingredientId: "ing-birria", quantity: 0.1 }] }),
      expect.objectContaining({ option_id: "o-pastor", option_name: "Pastor", quantity: 2, unit_price: 10, inventory: [] }),
    ]);
    // Birria consume inventario ⇒ se descuentan las opciones
    expect(deductInventoryForOrder).toHaveBeenCalledWith("o-mix");
  });

  it("respects discount_includes_modifiers=false", async () => {
    vi.mocked(getTenantContext).mockResolvedValue({
      id: "tenant-123",
      discount_includes_modifiers: false,
    } as any);
    const mockRpc = okRpc();
    vi.mocked(createClient).mockResolvedValue({ rpc: mockRpc } as any);
    await post([
      { menuItemId: "mi-mixtos", quantity: 1, selections: [{ optionId: "o-carnitas", quantity: 3 }] },
    ]);
    expect(mockRpc.mock.calls[0][1].p_items[0]).toMatchObject({
      unit_price: 120,
      discount_base_price: 0,
    });
  });

  it("rejects an incomplete selection with 400 and does not create the order", async () => {
    const mockRpc = okRpc();
    vi.mocked(createClient).mockResolvedValue({ rpc: mockRpc } as any);
    const response = await post([
      { menuItemId: "mi-mixtos", quantity: 1, selections: [{ optionId: "o-pastor", quantity: 2 }] },
    ]);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe("Tacos Mixtos: Faltan 1 en Elige tus tacos");
    expect(mockRpc).not.toHaveBeenCalled();
  });

  it("rejects a customizable product sent without selection", async () => {
    vi.mocked(createClient).mockResolvedValue({ rpc: okRpc() } as any);
    const response = await post([{ menuItemId: "mi-mixtos", quantity: 1 }]);
    expect(response.status).toBe(400);
  });

  it("rejects selections on a product without customization", async () => {
    vi.mocked(createClient).mockResolvedValue({ rpc: okRpc() } as any);
    const response = await post([
      { menuItemId: "mi-coca", quantity: 1, selections: [{ optionId: "o-pastor", quantity: 1 }] },
    ]);
    const body = await response.json();
    expect(response.status).toBe(400);
    expect(body.error).toBe("Coca Cola no admite personalización");
  });

  it("rejects products from another tenant", async () => {
    vi.mocked(createClient).mockResolvedValue({ rpc: okRpc() } as any);
    const response = await post([{ menuItemId: "ghost", quantity: 1 }]);
    expect(response.status).toBe(400);
  });

  it("skips the base product inventory when deductBase is off", async () => {
    fake.db = createFakeDb({
      ...tesoritoTables(),
      menu_items: tesoritoTables().menu_items.map((m) =>
        m.id === "mi-mixtos" ? { ...m, customization_deduct_base: false } : m,
      ),
    });
    const mockRpc = okRpc();
    vi.mocked(createClient).mockResolvedValue({ rpc: mockRpc } as any);
    await post([
      { menuItemId: "mi-mixtos", quantity: 1, selections: [{ optionId: "o-carnitas", quantity: 3 }] },
    ]);
    expect(mockRpc.mock.calls[0][1].p_items[0].skip_base_inventory).toBe(true);
    // Carnitas no consume inventario ⇒ no hace falta llamar al descuento
    expect(deductInventoryForOrder).not.toHaveBeenCalled();
  });
});

describe("DELETE /api/orders", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  it("deletes an order and registers CANCELLED audit action", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const mockDeleteEq = vi.fn().mockResolvedValue({ error: null });
    const mockDelete = vi
      .fn()
      .mockReturnValue({ eq: vi.fn().mockReturnValue({ eq: mockDeleteEq }) });

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        delete: mockDelete,
      }),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/orders", {
      method: "DELETE",
      body: JSON.stringify({ id: "order-to-cancel" }),
    });

    const response = await DELETE(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);

    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-to-cancel",
        actionType: "CANCELLED",
        notifyCritical: true,
      }),
    );
  });
});
