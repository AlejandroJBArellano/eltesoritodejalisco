import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, PATCH } from "../route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import { invalidateMenuCache } from "@/lib/menuCache";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/tenant", () => ({ getTenantContext: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getProfile: vi.fn() }));
vi.mock("@/lib/menuCache", () => ({ invalidateMenuCache: vi.fn() }));

describe("/api/inventory/[id]", () => {
  const params = Promise.resolve({ id: "ing-1" });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue({ id: "tenant-1" } as any);
    vi.mocked(getProfile).mockResolvedValue({
      id: "u1",
      role: "INVENTORY",
      tenant_id: "tenant-1",
    } as any);
  });

  it("GET returns ingredient with history or 404 when missing", async () => {
    const singleMock = vi
      .fn()
      .mockResolvedValueOnce({
        data: {
          id: "ing-1",
          name: "Carne",
          unit: "kg",
          current_stock: 10,
          minimum_stock: 2,
          cost_per_unit: 100,
          tracking_type: "MEASURABLE",
          created_at: "2026-01-01",
          updated_at: "2026-01-02",
        },
        error: null,
      })
      .mockResolvedValueOnce({ data: null, error: new Error("not found") });

    const limitHistoryMock = vi.fn().mockResolvedValue({
      data: [{ id: "adj-1", adjustment: 5, reason: "Compra", created_at: "x", user_id: "u1" }],
    });

    vi.mocked(createClient).mockResolvedValue({
      from: (table: string) => {
        if (table === "ingredients") {
          return {
            select: () => ({ eq: () => ({ eq: () => ({ single: singleMock }) }) }),
          };
        }
        return {
          select: () => ({
            eq: () => ({ order: () => ({ limit: limitHistoryMock }) }),
          }),
        };
      },
    } as any);

    const resOk = await GET(new NextRequest("http://localhost/api/inventory/ing-1"), { params });
    expect(resOk.status).toBe(200);
    const body = await resOk.json();
    expect(body.ingredient.name).toBe("Carne");
    expect(body.history).toHaveLength(1);

    const res404 = await GET(new NextRequest("http://localhost/api/inventory/ing-1"), { params });
    expect(res404.status).toBe(404);
  });

  it("PATCH updates stock and invalidates menu cache", async () => {
    const maybeSingleMock = vi.fn().mockResolvedValue({ data: { id: "ing-1" } });
    const updateSingleMock = vi.fn().mockResolvedValue({
      data: {
        id: "ing-1",
        name: "Carne",
        unit: "kg",
        current_stock: 15,
        minimum_stock: 3,
        cost_per_unit: 100,
        tracking_type: "MEASURABLE",
      },
      error: null,
    });

    vi.mocked(createClient).mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }) }),
        update: () => ({ eq: () => ({ select: () => ({ single: updateSingleMock }) }) }),
      }),
    } as any);

    const req = new NextRequest("http://localhost/api/inventory/ing-1", {
      method: "PATCH",
      body: JSON.stringify({ currentStock: 15, minimumStock: 3 }),
    });
    const res = await PATCH(req, { params });
    expect(res.status).toBe(200);
    expect(invalidateMenuCache).toHaveBeenCalledWith("tenant-1");
  });

  it("PATCH validates role, missing ingredient, and empty payload", async () => {
    vi.mocked(getProfile).mockResolvedValueOnce({ role: "WAITER" } as any);
    const r403 = await PATCH(
      new NextRequest("http://localhost/api/inventory/ing-1", {
        method: "PATCH",
        body: JSON.stringify({ currentStock: 5 }),
      }),
      { params },
    );
    expect(r403.status).toBe(403);

    const maybeSingleMock = vi
      .fn()
      .mockResolvedValueOnce({ data: null })
      .mockResolvedValueOnce({ data: { id: "ing-1" } });
    vi.mocked(createClient).mockResolvedValue({
      from: () => ({
        select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: maybeSingleMock }) }) }),
      }),
    } as any);

    const r404 = await PATCH(
      new NextRequest("http://localhost/api/inventory/ing-1", {
        method: "PATCH",
        body: JSON.stringify({ currentStock: 5 }),
      }),
      { params },
    );
    expect(r404.status).toBe(404);

    const r400 = await PATCH(
      new NextRequest("http://localhost/api/inventory/ing-1", {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
      { params },
    );
    expect(r400.status).toBe(400);
  });
});
