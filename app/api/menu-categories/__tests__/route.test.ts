import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, PUT, DELETE } from "../route";
import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import { invalidateMenuCache } from "@/lib/menuCache";

const mockAdmin = { from: vi.fn() };

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockAdmin,
}));
vi.mock("@/lib/tenant", () => ({ getTenantContext: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getProfile: vi.fn() }));
vi.mock("@/lib/menuCache", () => ({ invalidateMenuCache: vi.fn() }));

describe("/api/menu-categories", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue({ id: "tenant-1" } as any);
    vi.mocked(getProfile).mockResolvedValue({ role: "ADMIN" } as any);
  });

  it("GET returns ordered categories with public Cache-Control", async () => {
    mockAdmin.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          order: vi.fn().mockResolvedValue({
            data: [{ id: "c1", name: "TACOS", sort_order: 10 }],
            error: null,
          }),
        }),
      }),
    });

    const res = await GET();
    expect(res.status).toBe(200);
    expect(res.headers.get("Cache-Control")).toContain("s-maxage=60");
    const body = await res.json();
    expect(body.categories).toHaveLength(1);
  });

  it("POST creates category and defaults sort_order", async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { sort_order: 20 } });
    const insertSingle = vi.fn().mockResolvedValue({
      data: { id: "c2", name: "BEBIDAS", sort_order: 30 },
      error: null,
    });

    mockAdmin.from.mockReturnValue({
      select: () => ({
        eq: () => ({ order: () => ({ limit: () => ({ maybeSingle }) }) }),
      }),
      insert: () => ({ select: () => ({ single: insertSingle }) }),
    });

    const res = await POST(
      new NextRequest("http://localhost/api/menu-categories", {
        method: "POST",
        body: JSON.stringify({ name: " bebidas " }),
      }),
    );
    expect(res.status).toBe(201);
    expect((await res.json()).category.name).toBe("BEBIDAS");
  });

  it("PUT cascade renames menu_items and invalidates menu cache", async () => {
    const fetchExistingSingle = vi.fn().mockResolvedValue({
      data: { name: "TACOS" },
      error: null,
    });
    const updateCategorySingle = vi.fn().mockResolvedValue({
      data: { id: "c1", name: "ESPECIALES" },
      error: null,
    });
    const cascadeEq = vi.fn().mockResolvedValue({ error: null });

    mockAdmin.from.mockImplementation((table: string) => {
      if (table === "menu_categories") {
        return {
          select: () => ({
            eq: () => ({ eq: () => ({ single: fetchExistingSingle }) }),
          }),
          update: () => ({
            eq: () => ({
              eq: () => ({ select: () => ({ single: updateCategorySingle }) }),
            }),
          }),
        };
      }
      return {
        update: () => ({
          ilike: () => ({ eq: cascadeEq }),
        }),
      };
    });

    const res = await PUT(
      new NextRequest("http://localhost/api/menu-categories", {
        method: "PUT",
        body: JSON.stringify({ id: "c1", name: "Especiales" }),
      }),
    );

    expect(res.status).toBe(200);
    expect(cascadeEq).toHaveBeenCalledWith("tenant_id", "tenant-1");
    expect(invalidateMenuCache).toHaveBeenCalledWith("tenant-1");
  });

  it("DELETE prevents removing category with assigned products and deletes empty category", async () => {
    const existingSingle = vi.fn().mockResolvedValue({ data: { name: "TACOS" } });
    const countEq = vi
      .fn()
      .mockResolvedValueOnce({ count: 2 })
      .mockResolvedValueOnce({ count: 0 });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });

    mockAdmin.from.mockImplementation((table: string) => {
      if (table === "menu_items") {
        return {
          select: () => ({ ilike: () => ({ eq: countEq }) }),
        };
      }
      return {
        select: () => ({
          eq: () => ({ eq: () => ({ single: existingSingle }) }),
        }),
        delete: () => ({ eq: () => ({ eq: deleteEq }) }),
      };
    });

    const conflict = await DELETE(
      new NextRequest("http://localhost/api/menu-categories", {
        method: "DELETE",
        body: JSON.stringify({ id: "c1" }),
      }),
    );
    expect(conflict.status).toBe(409);

    const ok = await DELETE(
      new NextRequest("http://localhost/api/menu-categories", {
        method: "DELETE",
        body: JSON.stringify({ id: "c1" }),
      }),
    );
    expect(ok.status).toBe(200);
  });
});
