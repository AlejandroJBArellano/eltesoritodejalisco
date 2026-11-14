import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fake = vi.hoisted(() => ({ db: null as null | { client: unknown } }));
const stripeMock = vi.hoisted(() => ({
  checkout: { sessions: { create: vi.fn() } },
  products: { create: vi.fn() },
}));

vi.mock("@/lib/stripe", () => ({ stripe: stripeMock }));
vi.mock("@/lib/tenant", () => ({ getTenantContext: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => fake.db!.client),
}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => fake.db!.client,
}));

import { POST } from "../route";
import { getTenantContext } from "@/lib/tenant";
import { createFakeDb, tesoritoTables, type FakeDb } from "@/test/fakeSupabase";

const TENANT = "tenant-123";

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/payments/checkout-session", {
      method: "POST",
      headers: { origin: "https://pickup.test" },
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/payments/checkout-session — personalización", () => {
  let db: FakeDb;

  beforeEach(() => {
    vi.clearAllMocks();
    const tables = tesoritoTables(TENANT);
    tables.menu_items = tables.menu_items.map((m) => ({
      ...m,
      stripe_product_id: `prod_${m.id}`,
      show_in_takeaway: true,
      show_in_dine_in: true,
    }));
    db = createFakeDb(tables);
    fake.db = db;
    vi.mocked(getTenantContext).mockResolvedValue({
      id: TENANT,
      stripe_account_id: "acct_1",
      stripe_charges_enabled: true,
      commission_rate: 0,
    } as never);
    stripeMock.checkout.sessions.create.mockResolvedValue({
      id: "cs_1",
      url: "https://stripe.test/cs_1",
    });
  });

  it("charges the server price, names the line with the selection and stores a draft", async () => {
    const res = await post({
      customerName: "Ana",
      type: "takeout",
      orderItems: [
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
    });
    expect(res.status).toBe(200);

    const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(args.line_items[0]).toEqual({
      price_data: {
        currency: "mxn",
        unit_amount: 14000,
        product_data: { name: "Tacos Mixtos (1x Birria, 2x Pastor)" },
      },
      quantity: 2,
    });
    expect(args.line_items[1]).toEqual({
      price_data: { currency: "mxn", unit_amount: 3000, product: "prod_mi-coca" },
      quantity: 1,
    });

    // Solo el id del borrador viaja en la metadata
    expect(args.metadata.draftId).toBeTruthy();
    expect(args.metadata.orderItems).toBeUndefined();
    for (const value of Object.values(args.metadata)) {
      expect(String(value).length).toBeLessThanOrEqual(500);
    }

    const draft = db.inserts.checkout_drafts[0];
    expect(draft.tenant_id).toBe(TENANT);
    expect(draft.order_id).toBe(args.metadata.orderId);
    const items = (draft.payload as { items: Array<Record<string, unknown>> }).items;
    expect(items[0]).toMatchObject({ menuItemId: "mi-mixtos", unitPrice: 140, quantity: 2, notes: "sin cebolla" });
    expect(items[1]).toMatchObject({ menuItemId: "mi-coca", unitPrice: 30 });
  });

  it("keeps the legacy compact metadata for carts without customization", async () => {
    await post({
      customerName: "Ana",
      type: "takeout",
      orderItems: [{ menuItemId: "mi-coca", quantity: 3 }],
    });
    const args = stripeMock.checkout.sessions.create.mock.calls[0][0];
    expect(args.metadata.draftId).toBeTruthy();
    expect(JSON.parse(args.metadata.orderItems)).toEqual([["mi-coca", 3]]);
  });

  it("rejects an invalid selection before talking to Stripe", async () => {
    const res = await post({
      customerName: "Ana",
      type: "takeout",
      orderItems: [
        { menuItemId: "mi-mixtos", quantity: 1, selections: [{ optionId: "o-pastor", quantity: 1 }] },
      ],
    });
    expect(res.status).toBe(400);
    expect((await res.json()).error).toBe("Tacos Mixtos: Faltan 2 en Elige tus tacos");
    expect(stripeMock.checkout.sessions.create).not.toHaveBeenCalled();
    expect(db.inserts.checkout_drafts).toBeUndefined();
  });
});
