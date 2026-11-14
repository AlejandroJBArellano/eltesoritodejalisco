import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fake = vi.hoisted(() => ({ db: null as null | { client: unknown } }));

vi.mock("@/lib/auth", () => ({
  getProfile: vi.fn(),
  verifyManagerPin: vi.fn(),
}));
vi.mock("@/lib/tenant", () => ({ getTenantContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => fake.db!.client),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => fake.db!.client,
}));
vi.mock("@/lib/services/orderAudit", () => ({
  logOrderAction: vi.fn().mockResolvedValue({ success: true }),
}));
vi.mock("@/lib/services/inventory", () => ({
  deductInventoryForOrder: vi.fn().mockResolvedValue({ success: true, deductions: [] }),
  reverseInventoryForOrder: vi.fn().mockResolvedValue({ success: true, deductions: [] }),
  reverseOptionInventoryForItems: vi.fn().mockResolvedValue({ success: true, deductions: [] }),
}));

import { PATCH, PUT } from "../route";
import { getProfile, verifyManagerPin } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { logOrderAction } from "@/lib/services/orderAudit";
import {
  deductInventoryForOrder,
  reverseOptionInventoryForItems,
} from "@/lib/services/inventory";
import { createFakeDb, tesoritoTables, type FakeDb } from "@/test/fakeSupabase";

const TENANT = "tenant-123";

function seed(): FakeDb {
  return createFakeDb({
    ...tesoritoTables(TENANT),
    orders: [
      {
        id: "o1",
        tenant_id: TENANT,
        status: "READY",
        subtotal: 120,
        total: 120,
        tax: 0,
        discount_type: null,
        discount_value: null,
        discount_reason: null,
      },
    ],
    order_items: [
      {
        id: "oi1",
        order_id: "o1",
        tenant_id: TENANT,
        menu_item_id: "mi-mixtos",
        quantity: 1,
        unit_price: 120,
        base_unit_price: 0,
        discount_base_price: 120,
        options_inventory_deducted: true,
        status: "READY",
        discount_type: null,
        discount_value: null,
        discount_scope: "ROW",
        discount_reason: null,
        notes: null,
      },
    ],
    order_item_options: [
      {
        order_item_id: "oi1",
        option_id: "o-carnitas",
        group_id: "g-tacos",
        group_name: "Elige tus tacos",
        option_name: "Carnitas",
        quantity: 3,
        unit_price: 0,
        group_sort: 0,
        option_sort: 0,
      },
    ],
  });
}

const put = (body: unknown) =>
  PUT(
    new NextRequest("http://localhost:3000/api/orders/o1", {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    { params: Promise.resolve({ id: "o1" }) },
  );

const newSelection = [
  { optionId: "o-pastor", quantity: 2 },
  { optionId: "o-birria", quantity: 1 },
];

describe("PUT /api/orders/[id] — editar personalización", () => {
  let db: FakeDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = seed();
    fake.db = db;
    vi.mocked(getTenantContext).mockResolvedValue({ id: TENANT } as never);
    vi.mocked(getProfile).mockResolvedValue({ role: "WAITER", full_name: "Mesero" } as never);
  });

  it("re-prices, replaces the snapshot, notifies KDS and asks to reprint (default policy)", async () => {
    const response = await put({ items: [{ id: "oi1", quantity: 1, selections: newSelection }] });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.reprintItemIds).toEqual(["oi1"]);

    const item = db.tables.order_items[0];
    expect(item).toMatchObject({
      unit_price: 140,
      base_unit_price: 0,
      discount_base_price: 140,
      status: "PENDING",
      options_inventory_deducted: false,
    });
    expect(item.customization_modified_at).toBeTruthy();

    const order = db.tables.orders[0];
    expect(order).toMatchObject({ subtotal: 140, total: 140, status: "PENDING" });

    expect(db.tables.order_item_options.map((o) => [o.option_name, o.quantity])).toEqual([
      ["Birria", 1],
      ["Pastor", 2],
    ]);
    expect(db.tables.order_item_group_tiers).toEqual([
      expect.objectContaining({ order_item_id: "oi1", quantity: 3, price: 120 }),
    ]);

    expect(reverseOptionInventoryForItems).toHaveBeenCalledWith("o1", ["oi1"]);
    expect(deductInventoryForOrder).toHaveBeenCalledWith("o1");

    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "CUSTOMIZATION_EDITED",
        details: expect.objectContaining({
          summary: "Tacos Mixtos: 3x Carnitas → 1x Birria, 2x Pastor",
          itemIds: ["oi1"],
        }),
      }),
    );
  });

  it("blocks edits when the tenant policy is NEVER", async () => {
    vi.mocked(getTenantContext).mockResolvedValue({
      id: TENANT,
      customization_edit_after_kitchen: "NEVER",
    } as never);
    const response = await put({ items: [{ id: "oi1", quantity: 1, selections: newSelection }] });
    expect(response.status).toBe(403);
    expect(db.tables.order_items[0].unit_price).toBe(120);
    expect(db.tables.order_item_options).toHaveLength(1);
  });

  it("reads the edit policy fresh from the DB, not from the cached tenant", async () => {
    // Caché del proceso: política vieja. Base: el admin ya cambió a NEVER.
    vi.mocked(getTenantContext).mockResolvedValue({
      id: TENANT,
      customization_edit_after_kitchen: "WITH_PERMISSION",
    } as never);
    db.tables.tenants = [{ id: TENANT, customization_edit_after_kitchen: "NEVER" }];
    const response = await put({ items: [{ id: "oi1", quantity: 1, selections: newSelection }] });
    expect(response.status).toBe(403);
    expect(db.tables.order_items[0].unit_price).toBe(120);
  });

  it("WITH_PERMISSION rejects roles without pos.edit_order", async () => {
    vi.mocked(getProfile).mockResolvedValue({ role: "CHEF" } as never);
    const response = await put({ items: [{ id: "oi1", quantity: 1, selections: newSelection }] });
    expect(response.status).toBe(403);
  });

  it("WITH_MANAGER_AUTH requires a manager PIN for waiters", async () => {
    vi.mocked(getTenantContext).mockResolvedValue({
      id: TENANT,
      customization_edit_after_kitchen: "WITH_MANAGER_AUTH",
    } as never);

    const noPin = await put({ items: [{ id: "oi1", quantity: 1, selections: newSelection }] });
    expect(noPin.status).toBe(403);
    expect((await noPin.json()).requiresManagerAuth).toBe(true);

    vi.mocked(verifyManagerPin).mockResolvedValue(null);
    const badPin = await put({ items: [{ id: "oi1", quantity: 1, selections: newSelection }], pin: "0000" });
    expect(badPin.status).toBe(401);

    vi.mocked(verifyManagerPin).mockResolvedValue({ full_name: "Gerente Ana", role: "MANAGER" } as never);
    const ok = await put({ items: [{ id: "oi1", quantity: 1, selections: newSelection }], pin: "1234" });
    expect(ok.status).toBe(200);
    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "CUSTOMIZATION_EDITED",
        details: expect.objectContaining({ authorizedBy: "Gerente Ana" }),
      }),
    );
  });

  it("WITH_MANAGER_AUTH lets managers edit without PIN", async () => {
    vi.mocked(getTenantContext).mockResolvedValue({
      id: TENANT,
      customization_edit_after_kitchen: "WITH_MANAGER_AUTH",
    } as never);
    vi.mocked(getProfile).mockResolvedValue({ role: "MANAGER" } as never);
    const response = await put({ items: [{ id: "oi1", quantity: 1, selections: newSelection }] });
    expect(response.status).toBe(200);
  });

  it("does not notify KDS nor reprint when disabled", async () => {
    vi.mocked(getTenantContext).mockResolvedValue({
      id: TENANT,
      customization_edit_notify_kds: false,
      customization_edit_reprint: false,
    } as never);
    const response = await put({ items: [{ id: "oi1", quantity: 1, selections: newSelection }] });
    const body = await response.json();
    expect(body.reprintItemIds).toEqual([]);
    expect(db.tables.order_items[0].customization_modified_at).toBeUndefined();
    expect(db.tables.order_items[0].status).toBe("READY");
    expect(db.tables.orders[0].status).toBe("READY");
  });

  it("rejects an invalid selection with 400", async () => {
    const response = await put({
      items: [{ id: "oi1", quantity: 1, selections: [{ optionId: "o-pastor", quantity: 1 }] }],
    });
    expect(response.status).toBe(400);
    expect(db.tables.order_items[0].unit_price).toBe(120);
  });

  it("ignores unchanged selections (no edit, no audit)", async () => {
    const response = await put({
      items: [{ id: "oi1", quantity: 1, selections: [{ optionId: "o-carnitas", quantity: 3 }] }],
    });
    expect(response.status).toBe(200);
    expect(reverseOptionInventoryForItems).not.toHaveBeenCalled();
    expect(logOrderAction).not.toHaveBeenCalledWith(
      expect.objectContaining({ actionType: "CUSTOMIZATION_EDITED" }),
    );
  });

  it("applies item discount on the base price when modifiers are excluded", async () => {
    vi.mocked(getTenantContext).mockResolvedValue({
      id: TENANT,
      discount_includes_modifiers: false,
    } as never);
    // Base $10 para que el descuento sobre base sea visible
    db.tables.menu_items[0].price = 10;
    const response = await put({
      items: [
        {
          id: "oi1",
          quantity: 1,
          selections: newSelection,
          discountType: "PERCENT",
          discountValue: 50,
        },
      ],
    });
    expect(response.status).toBe(200);
    const item = db.tables.order_items[0];
    expect(item.unit_price).toBe(150);
    expect(item.discount_base_price).toBe(10);
    expect(item.discount_amount).toBe(5);
    expect(db.tables.orders[0].total).toBe(145);
  });
});

describe("PATCH /api/orders/[id] — agregar productos personalizados", () => {
  let db: FakeDb;

  beforeEach(() => {
    vi.clearAllMocks();
    db = seed();
    fake.db = db;
    vi.mocked(getTenantContext).mockResolvedValue({ id: TENANT } as never);
    vi.mocked(getProfile).mockResolvedValue({ role: "WAITER" } as never);
  });

  const patch = (body: unknown) =>
    PATCH(
      new NextRequest("http://localhost:3000/api/orders/o1", {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
      { params: Promise.resolve({ id: "o1" }) },
    );

  it("inserts the priced row and its snapshot, then deducts inventory", async () => {
    const response = await patch({
      orderItems: [
        { menuItemId: "mi-mixtos", quantity: 2, selections: newSelection },
        { menuItemId: "mi-coca", quantity: 1 },
      ],
    });
    expect(response.status).toBe(200);

    const inserted = db.inserts.order_items;
    expect(inserted).toHaveLength(2);
    expect(inserted[0]).toMatchObject({ menu_item_id: "mi-mixtos", quantity: 2, unit_price: 140, base_unit_price: 0 });
    expect(inserted[1]).toMatchObject({ menu_item_id: "mi-coca", unit_price: 30, base_unit_price: null });

    const snapshot = db.inserts.order_item_options;
    expect(snapshot.map((o) => [o.order_item_id, o.option_name, o.quantity])).toEqual([
      [inserted[0].id, "Birria", 1],
      [inserted[0].id, "Pastor", 2],
    ]);
    // 120 previos + 2×140 + 30
    expect(db.tables.orders[0].total).toBe(430);
    expect(deductInventoryForOrder).toHaveBeenCalledWith("o1");
    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        actionType: "ITEMS_ADDED",
        details: expect.objectContaining({
          summary: "Tacos Mixtos (1x Birria, 2x Pastor) x2, Coca Cola x1",
        }),
      }),
    );
  });

  it("returns 400 for an invalid selection without inserting", async () => {
    const response = await patch({
      orderItems: [{ menuItemId: "mi-mixtos", quantity: 1, selections: [] }],
    });
    expect(response.status).toBe(400);
    expect(db.inserts.order_items).toBeUndefined();
  });
});
