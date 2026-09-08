import { describe, it, expect, vi, beforeEach } from "vitest";
import { PUT, DELETE } from "../route";
import { NextRequest } from "next/server";
import { getProfile, verifyManagerPin } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { logOrderAction } from "@/lib/services/orderAudit";
import { reverseInventoryForOrder } from "@/lib/services/inventory";

vi.mock("@/lib/auth", () => ({
  getProfile: vi.fn(),
  verifyManagerPin: vi.fn(),
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

vi.mock("@/lib/services/inventory", () => ({
  reverseInventoryForOrder: vi.fn().mockResolvedValue(undefined),
  deductInventoryForOrder: vi.fn().mockResolvedValue(undefined),
}));

describe("PUT /api/orders/[id]", () => {
  const mockTenant = { id: "tenant-123" };
  const mockOrder = {
    id: "order-123",
    tenant_id: "tenant-123",
    order_number: "260908-002",
    status: "PENDING",
    discount_type: null,
    discount_value: null,
    discount_reason: null,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  it("logs exact product name and quantity when an item is deleted by Admin without PIN", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: "admin-1",
      full_name: "Alejandro Arellano",
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const currentItemsInDb = [
      {
        id: "item-1",
        unit_price: 125,
        quantity: 1,
        menu_items: { name: "Producto" },
      },
      {
        id: "item-2",
        unit_price: 185,
        quantity: 4,
        menu_items: { name: "papulince" },
      },
      {
        id: "item-3",
        unit_price: 80,
        quantity: 8,
        menu_items: { name: "Coca Cola" },
      },
    ];

    const mockFrom = vi.fn((table: string) => {
      if (table === "orders") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockOrder, total: 765 },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: currentItemsInDb,
              error: null,
            }),
          }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
    } as any);

    // Mandamos solo item-1 e item-3; item-2 (papulince x4) fue eliminado
    const request = new NextRequest("http://localhost:3000/api/orders/order-123", {
      method: "PUT",
      body: JSON.stringify({
        items: [
          { id: "item-1", quantity: 1 },
          { id: "item-3", quantity: 8 },
        ],
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "order-123" }) });
    expect(response.status).toBe(200);

    // Debe registrar la acción con el nombre del producto y omitir authorizedBy
    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-123",
        actionType: "ITEMS_REMOVED",
        details: expect.objectContaining({
          summary: "papulince x4",
          removedItemIds: ["item-2"],
        }),
      }),
    );

    const callArgs = vi.mocked(logOrderAction).mock.calls[0][0];
    expect(callArgs.details?.authorizedBy).toBeUndefined();
  });

  it("logs reduced quantity with (-diff) when item quantity decreases", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: "admin-1",
      full_name: "Alejandro Arellano",
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const currentItemsInDb = [
      {
        id: "item-3",
        unit_price: 80,
        quantity: 8,
        menu_items: { name: "Coca Cola" },
      },
    ];

    const mockFrom = vi.fn((table: string) => {
      if (table === "orders") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockOrder, total: 400 },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: currentItemsInDb,
              error: null,
            }),
          }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
    } as any);

    // Reducimos Coca Cola de 8 a 5 (diferencia de -3)
    const request = new NextRequest("http://localhost:3000/api/orders/order-123", {
      method: "PUT",
      body: JSON.stringify({
        items: [{ id: "item-3", quantity: 5 }],
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "order-123" }) });
    expect(response.status).toBe(200);

    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-123",
        actionType: "ITEMS_REMOVED",
        details: expect.objectContaining({
          summary: "Coca Cola (-3)",
        }),
      }),
    );
  });

  it("includes authorizedBy when a WAITER provides a valid manager PIN", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: "waiter-1",
      full_name: "Mesero Juan",
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);

    vi.mocked(verifyManagerPin).mockResolvedValue({
      id: "mgr-1",
      full_name: "Gerente Laura",
      role: "MANAGER",
    } as any);

    const currentItemsInDb = [
      {
        id: "item-1",
        unit_price: 100,
        quantity: 2,
        menu_items: { name: "Tacos" },
      },
    ];

    const mockFrom = vi.fn((table: string) => {
      if (table === "orders") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { ...mockOrder, total: 100 },
                    error: null,
                  }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "order_items") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: currentItemsInDb,
              error: null,
            }),
          }),
          delete: vi.fn().mockReturnValue({
            in: vi.fn().mockResolvedValue({ error: null }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
    } as any);

    const request = new NextRequest("http://localhost:3000/api/orders/order-123", {
      method: "PUT",
      body: JSON.stringify({
        items: [{ id: "item-1", quantity: 1 }],
        pin: "1234",
      }),
    });

    const response = await PUT(request, { params: Promise.resolve({ id: "order-123" }) });
    expect(response.status).toBe(200);

    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-123",
        actionType: "ITEMS_REMOVED",
        details: expect.objectContaining({
          summary: "Tacos (-1)",
          authorizedBy: "Gerente Laura",
        }),
      }),
    );
  });
});

describe("DELETE /api/orders/[id]", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  it("cancels an order by Admin without PIN and omits authorizedBy", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: "admin-1",
      full_name: "Alejandro Arellano",
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const mockFrom = vi.fn((table: string) => {
      if (table === "orders") {
        return {
          delete: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ error: null }),
            }),
          }),
        };
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
    } as any);

    const request = new NextRequest("http://localhost:3000/api/orders/order-123", {
      method: "DELETE",
      body: JSON.stringify({ reason: "Cancelado por error de mesa" }),
    });

    const response = await DELETE(request, { params: Promise.resolve({ id: "order-123" }) });
    expect(response.status).toBe(200);

    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "order-123",
        actionType: "CANCELLED",
        details: expect.objectContaining({
          reason: "Cancelado por error de mesa",
        }),
      }),
    );

    const callArgs = vi.mocked(logOrderAction).mock.calls[0][0];
    expect(callArgs.details?.authorizedBy).toBeUndefined();
  });
});
