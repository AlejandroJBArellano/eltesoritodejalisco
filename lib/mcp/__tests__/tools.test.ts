import { describe, it, expect, vi, beforeEach } from "vitest";
import { MCP_TOOLS } from "../tools";

const mockChain: any = {};
const mockFrom = vi.fn(() => mockChain);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

describe("lib/mcp/tools", () => {
  const ctx = {
    tenantId: "test-tenant-123",
    scopes: ["analytics:read", "orders:read", "inventory:read", "menu:read"],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    mockChain.select = vi.fn().mockReturnValue(mockChain);
    mockChain.eq = vi.fn().mockReturnValue(mockChain);
    mockChain.gte = vi.fn().mockReturnValue(mockChain);
    mockChain.lte = vi.fn().mockReturnValue(mockChain);
    mockChain.not = vi.fn().mockReturnValue(mockChain);
    mockChain.order = vi.fn().mockReturnValue(mockChain);
    mockChain.limit = vi.fn().mockReturnValue(mockChain);
    mockChain.ilike = vi.fn().mockReturnValue(mockChain);
    mockChain.single = vi.fn().mockResolvedValue({ data: null, error: null });
    mockChain.maybeSingle = vi
      .fn()
      .mockResolvedValue({ data: null, error: null });
  });

  it("get_dashboard_metrics: should calculate totals, active orders and avg ticket", async () => {
    mockChain.lte.mockResolvedValueOnce({
      data: [
        {
          id: "o-1",
          total: 250,
          status: "COMPLETADO",
          payment_status: "PAID",
          created_at: "2026-09-21T12:00:00Z",
        },
        {
          id: "o-2",
          total: 150,
          status: "EN_PREPARACION",
          payment_status: "PENDING",
          created_at: "2026-09-21T13:00:00Z",
        },
        {
          id: "o-3",
          total: 100,
          status: "CANCELADO",
          payment_status: "CANCELLED",
          created_at: "2026-09-21T14:00:00Z",
        },
      ],
      error: null,
    });

    const res = await MCP_TOOLS.get_dashboard_metrics.execute(
      { date: "2026-09-21" },
      ctx,
    );
    expect(res.total_sales).toBe(250);
    expect(res.completed_orders_count).toBe(1);
    expect(res.active_orders_count).toBe(1);
    expect(res.average_ticket).toBe(250);
    expect(res.total_orders_recorded).toBe(2);
  });

  it("get_active_orders: should format orders with elapsed minutes", async () => {
    mockChain.limit.mockResolvedValueOnce({
      data: [
        {
          id: "o-1",
          order_number: "CMD-101",
          table_number: "Mesa 4",
          order_type: "DINE_IN",
          status: "EN_PREPARACION",
          total: 300,
          created_at: new Date(Date.now() - 15 * 60000).toISOString(),
          order_items: [
            {
              id: "item-1",
              quantity: 2,
              notes: "Sin cebolla",
              unit_price: 150,
              total_price: 300,
              menu_items: { name: "Tacos de Ribeye" },
            },
          ],
        },
      ],
      error: null,
    });

    const res = await MCP_TOOLS.get_active_orders.execute({}, ctx);
    expect(res.active_count).toBe(1);
    expect(res.orders[0].elapsed_minutes).toBeGreaterThanOrEqual(14);
    expect(res.orders[0].items[0].name).toBe("Tacos de Ribeye");
  });

  it("get_order_details: should return order details by orderId", async () => {
    mockChain.single.mockResolvedValueOnce({
      data: {
        id: "a1b2c3d4-e5f6-7890-abcd-ef1234567890",
        order_number: "CMD-202",
        status: "EN_PREPARACION",
        total: 500,
        order_items: [],
      },
      error: null,
    });

    const res = await MCP_TOOLS.get_order_details.execute(
      { orderId: "a1b2c3d4-e5f6-7890-abcd-ef1234567890" },
      ctx,
    );
    expect(res.order_number).toBe("CMD-202");
    expect(res.total).toBe(500);
  });

  it("get_sales_report: should aggregate sales by day", async () => {
    mockChain.lte.mockResolvedValueOnce({
      data: [
        {
          id: "o-1",
          total: 200,
          status: "ENTREGADO",
          payment_status: "PAID",
          created_at: "2026-09-20T10:00:00Z",
        },
        {
          id: "o-2",
          total: 300,
          status: "ENTREGADO",
          payment_status: "PAID",
          created_at: "2026-09-20T15:00:00Z",
        },
        {
          id: "o-3",
          total: 400,
          status: "ENTREGADO",
          payment_status: "PAID",
          created_at: "2026-09-21T11:00:00Z",
        },
      ],
      error: null,
    });

    const res = await MCP_TOOLS.get_sales_report.execute(
      { startDate: "2026-09-20", endDate: "2026-09-21" },
      ctx,
    );
    expect(res.total_revenue).toBe(900);
    expect(res.paid_orders_count).toBe(3);
    expect(res.average_ticket).toBe(300);
    expect(res.daily_breakdown["2026-09-20"].total).toBe(500);
    expect(res.daily_breakdown["2026-09-21"].total).toBe(400);
  });

  it("get_popular_items: should aggregate item sales and sort by quantity", async () => {
    mockChain.not.mockResolvedValueOnce({
      data: [
        {
          menu_item_id: "m-1",
          quantity: 5,
          total_price: 500,
          menu_items: { name: "Hamburguesa" },
        },
        {
          menu_item_id: "m-1",
          quantity: 3,
          total_price: 300,
          menu_items: { name: "Hamburguesa" },
        },
        {
          menu_item_id: "m-2",
          quantity: 2,
          total_price: 100,
          menu_items: { name: "Papas" },
        },
      ],
      error: null,
    });

    const res = await MCP_TOOLS.get_popular_items.execute({ limit: 5 }, ctx);
    expect(res.top_items.length).toBe(2);
    expect(res.top_items[0].name).toBe("Hamburguesa");
    expect(res.top_items[0].quantity).toBe(8);
    expect(res.top_items[0].revenue).toBe(800);
  });

  it("get_inventory_status: should flag low stock items", async () => {
    mockChain.order.mockResolvedValueOnce({
      data: [
        {
          id: "ing-1",
          name: "Carne",
          current_stock: 2,
          min_stock: 5,
          unit: "kg",
          cost: 120,
        },
        {
          id: "ing-2",
          name: "Queso",
          current_stock: 10,
          min_stock: 5,
          unit: "kg",
          cost: 90,
        },
      ],
      error: null,
    });

    const res = await MCP_TOOLS.get_inventory_status.execute(
      { onlyLowStock: true },
      ctx,
    );
    expect(res.total_items).toBe(2);
    expect(res.low_stock_count).toBe(1);
    expect(res.items.length).toBe(1);
    expect(res.items[0].name).toBe("Carne");
    expect(res.items[0].is_low_stock).toBe(true);
  });

  it("get_recipe_details: should calculate food cost and margin", async () => {
    mockChain.maybeSingle.mockResolvedValueOnce({
      data: {
        id: "m-1",
        name: "Pizza Margarita",
        price: 200,
        description: "Pizza clásica",
      },
      error: null,
    });

    mockChain.eq.mockImplementation((field: string, val: any) => {
      if (field === "menu_item_id") {
        return Promise.resolve({
          data: [
            {
              id: "r-1",
              quantity: 0.2,
              ingredients: {
                id: "ing-1",
                name: "Queso",
                cost: 100,
                unit: "kg",
              },
            }, // 20
            {
              id: "r-2",
              quantity: 0.1,
              ingredients: { id: "ing-2", name: "Salsa", cost: 50, unit: "l" },
            }, // 5
          ],
          error: null,
        });
      }
      return mockChain;
    });

    const res = await MCP_TOOLS.get_recipe_details.execute(
      { menuItemId: "m-1" },
      ctx,
    );
    expect(res.estimated_food_cost).toBe(25);
    expect(res.margin_percent).toBe(88);
  });

  it("get_daily_cuts: should return daily cuts history", async () => {
    mockChain.limit.mockResolvedValueOnce({
      data: [
        {
          id: "cut-1",
          total_sales: 15000,
          cash_expected: 5000,
          card_sales: 10000,
        },
      ],
      error: null,
    });

    const res = await MCP_TOOLS.get_daily_cuts.execute({ limit: 5 }, ctx);
    expect(res.count).toBe(1);
    expect(res.cuts[0].id).toBe("cut-1");
  });

  it("get_expenses_summary: should aggregate expenses by category", async () => {
    mockChain.order.mockResolvedValueOnce({
      data: [
        {
          id: "e-1",
          amount: 1200,
          date: "2026-09-20",
          expense_categories: { name: "Insumos" },
        },
        {
          id: "e-2",
          amount: 800,
          date: "2026-09-21",
          expense_categories: { name: "Servicios" },
        },
      ],
      error: null,
    });

    const res = await MCP_TOOLS.get_expenses_summary.execute({}, ctx);
    expect(res.total_expenses).toBe(2000);
    expect(res.by_category["Insumos"]).toBe(1200);
    expect(res.by_category["Servicios"]).toBe(800);
  });

  it("get_menu_catalog: should return categories and items", async () => {
    mockChain.order
      .mockResolvedValueOnce({
        data: [{ id: "cat-1", name: "Bebidas", sort_order: 1 }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            id: "item-1",
            name: "Limonada",
            price: 45,
            is_available: true,
            category_id: "cat-1",
          },
        ],
        error: null,
      });

    const res = await MCP_TOOLS.get_menu_catalog.execute({}, ctx);
    expect(res.categories.length).toBe(1);
    expect(res.total_items).toBe(1);
    expect(res.items[0].name).toBe("Limonada");
  });
});
