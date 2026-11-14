import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fake = vi.hoisted(() => ({ db: null as null | { client: unknown }, event: null as unknown }));

vi.mock("@/lib/stripe", () => ({
  stripe: { webhooks: { constructEvent: vi.fn(() => fake.event) } },
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => fake.db!.client,
}));
vi.mock("@/lib/tenant", () => ({ invalidateTenantCache: vi.fn() }));
vi.mock("@/lib/services/email", () => ({
  sendCustomerOrderConfirmationEmail: vi.fn().mockResolvedValue(undefined),
  sendNewOrderNotificationEmail: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/services/push", () => ({
  sendTenantPushNotification: vi.fn().mockResolvedValue(undefined),
}));
vi.mock("@/lib/services/inventory", () => ({
  deductInventoryForOrder: vi.fn().mockResolvedValue({ success: true, deductions: [] }),
}));

import { POST } from "../route";
import { deductInventoryForOrder } from "@/lib/services/inventory";
import { createFakeDb, tesoritoTables, type FakeDb } from "@/test/fakeSupabase";
import { resolveOrderItems } from "@/lib/customization/server";

const TENANT = "tenant-123";

function sessionEvent(metadata: Record<string, string>) {
  return {
    type: "checkout.session.completed",
    data: {
      object: {
        id: "cs_1",
        payment_status: "paid",
        customer_details: { email: null, phone: null },
        metadata: {
          orderId: "order-pickup-1",
          tenantId: TENANT,
          customerName: "Ana",
          type: "takeout",
          notes: "",
          pickupTime: "",
          tipAmount: "0",
          commissionRate: "0",
          ...metadata,
        },
      },
    },
  };
}

const callWebhook = () =>
  POST(
    new NextRequest("http://localhost/api/webhooks/stripe", {
      method: "POST",
      headers: { "stripe-signature": "sig" },
      body: "{}",
    }),
  );

describe("Stripe webhook — pedidos de Pickup con personalización", () => {
  let db: FakeDb;

  beforeEach(async () => {
    vi.clearAllMocks();
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_test";
    db = createFakeDb({
      ...tesoritoTables(TENANT),
      tenants: [{ id: TENANT, name: "Tesorito", slug: "tesorito", commission_rate: 0 }],
      orders: [],
      daily_cuts: [],
      customers: [],
    });
    fake.db = db;

    // Borrador creado en el checkout (precio calculado por el servidor)
    const items = await resolveOrderItems(
      TENANT,
      [
        {
          menuItemId: "mi-mixtos",
          quantity: 2,
          notes: "sin cebolla",
          selections: [
            { optionId: "o-pastor", quantity: 2 },
            { optionId: "o-birria", quantity: 1 },
          ],
        },
        { menuItemId: "mi-coca", quantity: 1 },
      ],
      { includeModifiersInDiscount: true, client: db.client as never },
    );
    db.tables.checkout_drafts = [
      { id: "draft-1", tenant_id: TENANT, order_id: "order-pickup-1", payload: { version: 1, items } },
    ];
  });

  it("creates the order from the draft with final prices and the option snapshot", async () => {
    fake.event = sessionEvent({ draftId: "draft-1" });
    const res = await callWebhook();
    expect(res.status).toBe(200);

    const order = db.inserts.orders[0];
    expect(order).toMatchObject({ id: "order-pickup-1", source: "PICKUP_APP", subtotal: 310, total: 310 });
    expect(String(order.notes)).toContain("2x Tacos Mixtos (1x Birria, 2x Pastor)");

    const items = db.inserts.order_items;
    expect(items[0]).toMatchObject({
      menu_item_id: "mi-mixtos",
      quantity: 2,
      unit_price: 140,
      base_unit_price: 0,
      notes: "sin cebolla",
    });
    expect(items[1]).toMatchObject({ menu_item_id: "mi-coca", unit_price: 30 });

    expect(
      db.inserts.order_item_options.map((o) => [o.order_item_id, o.option_name, o.quantity]),
    ).toEqual([
      [items[0].id, "Birria", 1],
      [items[0].id, "Pastor", 2],
    ]);
    expect(db.inserts.order_item_group_tiers[0]).toMatchObject({ price: 120, quantity: 3 });
    expect(db.tables.checkout_drafts[0].consumed_at).toBeTruthy();
    expect(deductInventoryForOrder).toHaveBeenCalledWith("order-pickup-1");
  });

  it("still supports legacy sessions that carry orderItems in the metadata", async () => {
    fake.event = sessionEvent({ orderItems: JSON.stringify([["mi-coca", 2]]) });
    const res = await callWebhook();
    expect(res.status).toBe(200);
    expect(db.inserts.order_items[0]).toMatchObject({ menu_item_id: "mi-coca", quantity: 2, unit_price: 30 });
    expect(db.inserts.orders[0].total).toBe(60);
  });

  it("ignores sessions without order data", async () => {
    fake.event = sessionEvent({});
    const res = await callWebhook();
    expect(res.status).toBe(200);
    expect(db.inserts.orders).toBeUndefined();
  });
});
