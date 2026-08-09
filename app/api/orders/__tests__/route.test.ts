import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";

const mockRpc = vi.fn();
const mockTenant = { id: "tenant-123", name: "Test Tenant" };

vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(() => Promise.resolve(mockTenant)),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(() =>
    Promise.resolve({
      rpc: mockRpc,
    }),
  ),
}));

describe("POST /api/orders", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should return 400 if order source is missing", async () => {
    const req = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        orderItems: [{ menuItemId: "item-1", quantity: 2 }],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("Order source is required");
  });

  it("should return 400 if order items are missing or empty", async () => {
    const req = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        source: "POS",
        orderItems: [],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(400);
    expect(data.error).toBe("At least one order item is required");
  });

  it("should call create_order_with_items RPC and return 201 with created order", async () => {
    const mockCreatedOrder = {
      id: "order-999",
      order_number: "260809-001",
      source: "POS",
      status: "PENDING",
      subtotal: 100,
      total: 100,
      order_items: [
        {
          id: "oi-1",
          menu_item_id: "item-1",
          quantity: 2,
          unit_price: 50,
          menu_items: { id: "item-1", name: "Taco" },
        },
      ],
      payments: [],
      customer: null,
    };

    mockRpc.mockResolvedValue({ data: mockCreatedOrder, error: null });

    const req = new NextRequest("http://localhost/api/orders", {
      method: "POST",
      body: JSON.stringify({
        source: "POS",
        table: "Mesa 4",
        notes: "Sin cebolla",
        orderItems: [{ menuItemId: "item-1", quantity: 2, notes: "Sin cebolla" }],
      }),
    });

    const res = await POST(req);
    const data = await res.json();

    expect(res.status).toBe(201);
    expect(data.order).toEqual(mockCreatedOrder);
    expect(mockRpc).toHaveBeenCalledWith("create_order_with_items", {
      p_tenant_id: "tenant-123",
      p_customer_id: null,
      p_source: "POS",
      p_table: "Mesa 4",
      p_notes: "Sin cebolla",
      p_items: [{ menu_item_id: "item-1", quantity: 2, notes: "Sin cebolla" }],
      p_pickup_time: null,
    });
  });
});
