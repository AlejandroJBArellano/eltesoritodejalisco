import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const fake = vi.hoisted(() => ({
  db: null as null | { client: Record<string, unknown> },
  rpc: vi.fn(),
}));

vi.mock("@/lib/auth", () => ({ getProfile: vi.fn() }));
vi.mock("@/lib/tenant", () => ({ getTenantContext: vi.fn() }));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({ ...fake.db!.client, rpc: fake.rpc }),
}));

import { GET, PUT } from "../route";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { createFakeDb, tesoritoTables } from "@/test/fakeSupabase";

const TENANT = "tenant-123";
const params = (id: string) => ({ params: Promise.resolve({ id }) });

const validConfig = {
  layout: "SCROLL",
  deductBase: true,
  groups: [
    {
      id: "00000000-0000-4000-8000-000000000001",
      name: "Elige tus tacos",
      sortOrder: 0,
      minSelect: 3,
      maxSelect: 3,
      allowRepeat: true,
      maxPerOption: null,
      pricingMode: "TIERED",
      tierMatchMode: "EXACT",
      isActive: true,
      tiers: [{ quantityFrom: 3, quantityTo: null, price: 120 }],
      options: [
        {
          id: "00000000-0000-4000-8000-000000000002",
          name: "Birria",
          sortOrder: 0,
          isActive: true,
          priceSource: "CUSTOM",
          priceDelta: 0,
          linkedMenuItemId: null,
          deductLinkedInventory: true,
          outOfStockBehavior: "DISABLE",
          recipe: [{ ingredientId: "ing-birria", quantityRequired: 0.1 }],
        },
        {
          id: "00000000-0000-4000-8000-000000000003",
          name: "Coca",
          sortOrder: 1,
          isActive: true,
          priceSource: "LINKED_PRODUCT",
          priceDelta: 0,
          linkedMenuItemId: "mi-coca",
          deductLinkedInventory: true,
          outOfStockBehavior: "ALLOW",
          recipe: [],
        },
      ],
    },
  ],
};

const put = (body: unknown, id = "mi-mixtos") =>
  PUT(
    new NextRequest(`http://localhost/api/menu/${id}/customization`, {
      method: "PUT",
      body: JSON.stringify(body),
    }),
    params(id),
  );

describe("/api/menu/[id]/customization", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fake.db = createFakeDb(tesoritoTables(TENANT)) as never;
    fake.rpc.mockResolvedValue({ data: { ok: true }, error: null });
    vi.mocked(getTenantContext).mockResolvedValue({ id: TENANT } as never);
    vi.mocked(getProfile).mockResolvedValue({ role: "ADMIN" } as never);
  });

  it("requires the menu.manage_customization permission", async () => {
    vi.mocked(getProfile).mockResolvedValue({ role: "WAITER" } as never);
    const res = await GET(new NextRequest("http://localhost"), params("mi-mixtos"));
    expect(res.status).toBe(403);
    expect((await put({ customization: validConfig })).status).toBe(403);
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("allows custom roles that have the permission", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "CUSTOM",
      role_data: { permissions: ["menu.manage_customization"] },
    } as never);
    const res = await GET(new NextRequest("http://localhost"), params("mi-mixtos"));
    expect(res.status).toBe(200);
  });

  it("GET returns the full config (with recipes), price range and 404 for others", async () => {
    const res = await GET(new NextRequest("http://localhost"), params("mi-mixtos"));
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.menuItem).toEqual({ id: "mi-mixtos", name: "Tacos Mixtos", price: 0 });
    expect(body.customization.groups[0].options.map((o: { name: string }) => o.name)).toEqual([
      "Carnitas",
      "Birria",
      "Jamaica",
      "Pastor",
    ]);
    expect(body.customization.groups[0].options[1].recipe).toEqual([
      { ingredientId: "ing-birria", quantityRequired: 0.1 },
    ]);
    expect(body.priceRange).toEqual({ min: 120, max: 150 });

    const missing = await GET(new NextRequest("http://localhost"), params("ghost"));
    expect(missing.status).toBe(404);
  });

  it("GET returns an empty config for products without customization", async () => {
    const res = await GET(new NextRequest("http://localhost"), params("mi-coca"));
    const body = await res.json();
    expect(body.customization).toEqual({ layout: "SCROLL", deductBase: true, groups: [] });
  });

  it("PUT saves through the atomic RPC", async () => {
    const res = await put({ customization: validConfig });
    expect(res.status).toBe(200);
    expect(fake.rpc).toHaveBeenCalledWith("save_menu_item_customization", {
      p_tenant_id: TENANT,
      p_menu_item_id: "mi-mixtos",
      p_config: validConfig,
    });
  });

  it("PUT rejects structurally invalid payloads", async () => {
    const res = await put({
      customization: { ...validConfig, groups: [{ ...validConfig.groups[0], id: "not-a-uuid" }] },
    });
    expect(res.status).toBe(400);
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("PUT rejects business-rule errors with the issues list", async () => {
    const bad = structuredClone(validConfig);
    bad.groups[0].minSelect = 4;
    const res = await put({ customization: bad });
    const body = await res.json();
    expect(res.status).toBe(400);
    expect(body.error).toContain("mínimo (4) mayor al máximo (3)");
    expect(Array.isArray(body.issues)).toBe(true);
    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("PUT rejects duplicated ids, self links, foreign products and foreign ingredients", async () => {
    const dup = structuredClone(validConfig);
    dup.groups[0].options[1].id = dup.groups[0].options[0].id;
    expect((await put({ customization: dup })).status).toBe(400);

    const self = structuredClone(validConfig);
    self.groups[0].options[1].linkedMenuItemId = "mi-mixtos";
    expect((await put({ customization: self })).status).toBe(400);

    const foreignProduct = structuredClone(validConfig);
    foreignProduct.groups[0].options[1].linkedMenuItemId = "otro-tenant";
    const r1 = await put({ customization: foreignProduct });
    expect(r1.status).toBe(400);
    expect((await r1.json()).error).toBe("Un producto enlazado no existe en este restaurante");

    const foreignIngredient = structuredClone(validConfig);
    foreignIngredient.groups[0].options[0].recipe[0].ingredientId = "ing-ajeno";
    const r2 = await put({ customization: foreignIngredient });
    expect(r2.status).toBe(400);
    expect((await r2.json()).error).toBe("Un ingrediente de receta no existe en este restaurante");

    expect(fake.rpc).not.toHaveBeenCalled();
  });

  it("PUT 404s for a product of another tenant", async () => {
    const res = await put({ customization: { layout: "SCROLL", deductBase: true, groups: [] } }, "ghost");
    expect(res.status).toBe(404);
  });
});
