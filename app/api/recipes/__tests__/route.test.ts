import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, PUT, DELETE } from "../route";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";
import { invalidateMenuCache } from "@/lib/menuCache";

vi.mock("@/lib/supabase/server", () => ({ createClient: vi.fn() }));
vi.mock("@/lib/tenant", () => ({ getTenantContext: vi.fn() }));
vi.mock("@/lib/auth", () => ({ getProfile: vi.fn() }));
vi.mock("@/lib/menuCache", () => ({ invalidateMenuCache: vi.fn() }));

describe("/api/recipes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue({ id: "tenant-1" } as any);
    vi.mocked(getProfile).mockResolvedValue({ role: "ADMIN" } as any);
  });

  it("GET validates menuItemId and returns formatted recipeItems", async () => {
    const r400 = await GET(new NextRequest("http://localhost/api/recipes"));
    expect(r400.status).toBe(400);

    vi.mocked(createClient).mockResolvedValue({
      from: () => ({
        select: () => ({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: "r1",
                menu_item_id: "m1",
                ingredient_id: "i1",
                quantity_required: 2,
                ingredients: { name: "Limón" },
              },
            ],
            error: null,
          }),
        }),
      }),
    } as any);

    const r200 = await GET(
      new NextRequest("http://localhost/api/recipes?menuItemId=m1"),
    );
    expect(r200.status).toBe(200);
    const body = await r200.json();
    expect(body.recipeItems[0].ingredientName).toBe("Limón");
  });

  it("POST, PUT, DELETE mutate recipes and invalidate menu cache", async () => {
    vi.mocked(createClient).mockResolvedValue({
      from: () => ({
        insert: () => ({
          select: () => ({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "r1",
                menu_item_id: "m1",
                ingredient_id: "i1",
                quantity_required: 3,
                ingredients: { name: "Sal" },
              },
              error: null,
            }),
          }),
        }),
        update: () => ({
          eq: () => ({
            eq: () => ({
              select: () => ({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "r1",
                    menu_item_id: "m1",
                    ingredient_id: "i1",
                    quantity_required: 5,
                    ingredients: null,
                  },
                  error: null,
                }),
              }),
            }),
          }),
        }),
        delete: () => ({
          eq: () => ({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }),
    } as any);

    const postRes = await POST(
      new NextRequest("http://localhost/api/recipes", {
        method: "POST",
        body: JSON.stringify({ menuItemId: "m1", ingredientId: "i1", quantityRequired: 3 }),
      }),
    );
    expect(postRes.status).toBe(201);
    expect(invalidateMenuCache).toHaveBeenCalledWith("tenant-1");

    const putRes = await PUT(
      new NextRequest("http://localhost/api/recipes", {
        method: "PUT",
        body: JSON.stringify({ id: "r1", quantityRequired: 5 }),
      }),
    );
    expect(putRes.status).toBe(200);
    expect(invalidateMenuCache).toHaveBeenCalledTimes(2);

    const delRes = await DELETE(
      new NextRequest("http://localhost/api/recipes", {
        method: "DELETE",
        body: JSON.stringify({ id: "r1" }),
      }),
    );
    expect(delRes.status).toBe(200);
    expect(invalidateMenuCache).toHaveBeenCalledTimes(3);
  });

  it("POST/PUT/DELETE reject unauthorized users and invalid payloads", async () => {
    vi.mocked(getProfile).mockResolvedValue({ role: "WAITER" } as any);
    expect(
      (
        await POST(
          new NextRequest("http://localhost/api/recipes", {
            method: "POST",
            body: JSON.stringify({}),
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await PUT(
          new NextRequest("http://localhost/api/recipes", {
            method: "PUT",
            body: JSON.stringify({}),
          }),
        )
      ).status,
    ).toBe(403);
    expect(
      (
        await DELETE(
          new NextRequest("http://localhost/api/recipes", {
            method: "DELETE",
            body: JSON.stringify({}),
          }),
        )
      ).status,
    ).toBe(403);

    vi.mocked(getProfile).mockResolvedValue({ role: "ADMIN" } as any);
    expect(
      (
        await POST(
          new NextRequest("http://localhost/api/recipes", {
            method: "POST",
            body: JSON.stringify({ menuItemId: "m1" }),
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await POST(
          new NextRequest("http://localhost/api/recipes", {
            method: "POST",
            body: JSON.stringify({ menuItemId: "m1", ingredientId: "i1", quantityRequired: 0 }),
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await PUT(
          new NextRequest("http://localhost/api/recipes", {
            method: "PUT",
            body: JSON.stringify({}),
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await PUT(
          new NextRequest("http://localhost/api/recipes", {
            method: "PUT",
            body: JSON.stringify({ id: "r1", quantityRequired: -1 }),
          }),
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await DELETE(
          new NextRequest("http://localhost/api/recipes", {
            method: "DELETE",
            body: JSON.stringify({}),
          }),
        )
      ).status,
    ).toBe(400);
  });
});
