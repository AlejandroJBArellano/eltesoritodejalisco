import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST, PUT, DELETE } from "../route";
import { NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { uploadMenuItemImage } from "@/lib/s3";

vi.mock("@/lib/auth", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

vi.mock("@/lib/s3", () => ({
  uploadMenuItemImage: vi.fn(),
}));

const mockSupabaseAdmin = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => mockSupabaseAdmin,
}));

const mockSupabaseServer = {
  from: vi.fn(),
};

vi.mock("@/lib/supabase/server", () => ({
  createClient: () => Promise.resolve(mockSupabaseServer),
}));

describe("Menu API Route Handlers (/api/menu)", () => {
  const mockTenant = { id: "tenant-123" };
  const mockAdminProfile = { id: "admin-1", role: "ADMIN", tenant_id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
    vi.mocked(getProfile).mockResolvedValue(mockAdminProfile as any);
  });

  describe("GET /api/menu", () => {
    it("returns enriched menu items for tenant", async () => {
      const mockOrderMenu = vi.fn().mockResolvedValue({
        data: [
          {
            id: "item-1",
            name: "Taco",
            ingredient_id: "ing-1",
            ingredients: { id: "ing-1", current_stock: 10, minimum_stock: 2 },
          },
        ],
        error: null,
      });
      const mockEqMenu = vi.fn().mockReturnValue({ order: mockOrderMenu });
      const mockSelectMenu = vi.fn().mockReturnValue({ eq: mockEqMenu });

      const mockLimitPopular = vi.fn().mockResolvedValue({
        data: [{ menu_item_id: "item-1" }],
        error: null,
      });
      const mockOrderPopular = vi.fn().mockReturnValue({ limit: mockLimitPopular });
      const mockGtePopular = vi.fn().mockReturnValue({ order: mockOrderPopular });
      const mockEqPopular = vi.fn().mockReturnValue({ gte: mockGtePopular });
      const mockSelectPopular = vi.fn().mockReturnValue({ eq: mockEqPopular });

      mockSupabaseServer.from.mockImplementation((table: string) => {
        if (table === "menu_items") {
          return { select: mockSelectMenu };
        }
        if (table === "popular_menu_items") {
          return { select: mockSelectPopular };
        }
        return {};
      });

      const res = await GET();
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.items).toHaveLength(1);
      expect(body.items[0].current_stock).toBe(10);
    });
  });

  describe("POST /api/menu", () => {
    it("returns 403 when user is unauthorized", async () => {
      vi.mocked(getProfile).mockResolvedValue({ role: "WAITER" } as any);
      const req = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
        body: new FormData(),
      });
      const res = await POST(req);
      expect(res.status).toBe(403);
      const body = await res.json();
      expect(body.error).toBe("No autorizado");
    });

    it("returns 400 when name is missing", async () => {
      const formData = new FormData();
      formData.set("price", "25");
      const req = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("El nombre es obligatorio");
    });

    it("returns 400 when price is invalid", async () => {
      const formData = new FormData();
      formData.set("name", "Taco");
      formData.set("price", "-5");
      const req = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
        body: formData,
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toBe("El precio debe ser un número mayor o igual a 0");
    });

    it("returns 400 when image validation fails", async () => {
      vi.mocked(uploadMenuItemImage).mockRejectedValueOnce(
        new Error("Formato de imagen no soportado. Usa JPEG, PNG, WebP o AVIF"),
      );

      const formData = new FormData();
      formData.set("name", "Taco Pastor");
      formData.set("price", "25");
      const dummyFile = new File(["data"], "test.gif", { type: "image/gif" });
      formData.set("image", dummyFile);

      const req = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
      });
      vi.spyOn(req, "formData").mockResolvedValue(formData);

      const res = await POST(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("Formato de imagen no soportado");
    });

    it("uploads image to S3 and creates menu item successfully", async () => {
      const s3Url = "https://kittnos.s3.us-east-1.amazonaws.com/tenant-123/menu-items/123-abc.jpg";
      vi.mocked(uploadMenuItemImage).mockResolvedValueOnce(s3Url);

      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: "item-1", name: "Taco Pastor", image_url: s3Url },
        error: null,
      });
      const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
      const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
      mockSupabaseAdmin.from.mockReturnValue({ insert: mockInsert });

      const formData = new FormData();
      formData.set("name", "Taco Pastor");
      formData.set("price", "25");
      const file = new File(["dummy"], "taco.jpg", { type: "image/jpeg" });
      formData.set("image", file);

      const req = new NextRequest("http://localhost:3000/api/menu", {
        method: "POST",
      });
      vi.spyOn(req, "formData").mockResolvedValue(formData);

      const res = await POST(req);
      expect(res.status).toBe(201);
      const body = await res.json();

      expect(uploadMenuItemImage).toHaveBeenCalledWith(file, "tenant-123");
      expect(body.item.image_url).toBe(s3Url);
    });
  });

  describe("PUT /api/menu", () => {
    it("returns 400 if id or name is missing", async () => {
      const formData = new FormData();
      formData.set("name", "Taco");
      const req = new NextRequest("http://localhost:3000/api/menu", {
        method: "PUT",
      });
      vi.spyOn(req, "formData").mockResolvedValue(formData);

      const res = await PUT(req);
      expect(res.status).toBe(400);
    });

    it("returns 400 when new image exceeds size limit", async () => {
      vi.mocked(uploadMenuItemImage).mockRejectedValueOnce(
        new Error("La imagen excede el tamaño máximo permitido de 5MB"),
      );

      const formData = new FormData();
      formData.set("id", "item-1");
      formData.set("name", "Taco Gigante");
      formData.set("price", "50");
      const file = new File(["huge"], "huge.jpg", { type: "image/jpeg" });
      formData.set("image", file);

      const req = new NextRequest("http://localhost:3000/api/menu", {
        method: "PUT",
      });
      vi.spyOn(req, "formData").mockResolvedValue(formData);

      const res = await PUT(req);
      expect(res.status).toBe(400);
      const body = await res.json();
      expect(body.error).toContain("La imagen excede el tamaño");
    });

    it("uploads new image to S3 and updates item successfully", async () => {
      const newS3Url = "https://kittnos.s3.us-east-1.amazonaws.com/tenant-123/menu-items/new-photo.webp";
      vi.mocked(uploadMenuItemImage).mockResolvedValueOnce(newS3Url);

      // Mock item lookup
      const mockMaybeSingle = vi.fn().mockResolvedValue({
        data: { stripe_product_id: null },
        error: null,
      });
      const mockEqTenant = vi.fn().mockReturnValue({ maybeSingle: mockMaybeSingle });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqTenant });
      const mockSelectProduct = vi.fn().mockReturnValue({ eq: mockEqId });

      // Mock update
      const mockSingle = vi.fn().mockResolvedValue({
        data: { id: "item-1", name: "Taco Actualizado", image_url: newS3Url },
        error: null,
      });
      const mockSelectUpdate = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEqUpdateTenant = vi.fn().mockReturnValue({ select: mockSelectUpdate });
      const mockEqUpdateId = vi.fn().mockReturnValue({ eq: mockEqUpdateTenant });
      const mockUpdate = vi.fn().mockReturnValue({ eq: mockEqUpdateId });

      mockSupabaseAdmin.from.mockImplementation((table: string) => {
        if (table === "menu_items") {
          return {
            select: mockSelectProduct,
            update: mockUpdate,
          };
        }
        return {};
      });

      const formData = new FormData();
      formData.set("id", "item-1");
      formData.set("name", "Taco Actualizado");
      formData.set("price", "30");
      const file = new File(["photo"], "dish.webp", { type: "image/webp" });
      formData.set("image", file);

      const req = new NextRequest("http://localhost:3000/api/menu", {
        method: "PUT",
      });
      vi.spyOn(req, "formData").mockResolvedValue(formData);

      const res = await PUT(req);
      expect(res.status).toBe(200);
      const body = await res.json();

      expect(uploadMenuItemImage).toHaveBeenCalledWith(file, "tenant-123");
      expect(body.item.image_url).toBe(newS3Url);
    });

  });

  describe("DELETE /api/menu", () => {
    it("returns 400 if ID is missing", async () => {
      const req = new NextRequest("http://localhost:3000/api/menu", {
        method: "DELETE",
        body: JSON.stringify({}),
      });
      const res = await DELETE(req);
      expect(res.status).toBe(400);
    });

    it("deletes product successfully", async () => {
      const mockEqTenant = vi.fn().mockResolvedValue({ error: null });
      const mockEqId = vi.fn().mockReturnValue({ eq: mockEqTenant });
      const mockDelete = vi.fn().mockReturnValue({ eq: mockEqId });
      mockSupabaseAdmin.from.mockReturnValue({ delete: mockDelete });

      const req = new NextRequest("http://localhost:3000/api/menu", {
        method: "DELETE",
        body: JSON.stringify({ id: "item-1" }),
      });
      const res = await DELETE(req);
      expect(res.status).toBe(200);
      const body = await res.json();
      expect(body.success).toBe(true);
    });
  });
});
