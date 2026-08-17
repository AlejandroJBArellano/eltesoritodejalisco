import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getContrastTextColor,
  getTenantAdminEmails,
  getTenantAdminUrl,
  sendNewOrderNotificationEmail,
  sendLowStockAlertEmail,
} from "../email";

const { mockResendSend, mockSupabaseFrom } = vi.hoisted(() => {
  const mockResendSend = vi.fn().mockResolvedValue({
    data: { id: "resend-msg-123" },
    error: null,
  });

  const mockIn = vi.fn();
  const mockEq = vi.fn().mockReturnValue({ in: mockIn });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockEq });

  const mockSupabaseFrom = vi.fn().mockReturnValue({
    select: mockSelect,
  });

  return {
    mockResendSend,
    mockSupabaseFrom,
    mockSelect,
    mockEq,
    mockIn,
  };
});

vi.mock("resend", () => {
  return {
    Resend: class {
      emails = {
        send: mockResendSend,
      };
    },
  };
});

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: mockSupabaseFrom,
  }),
}));

describe("lib/services/email", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getContrastTextColor", () => {
    it("should return dark text #121212 for light background colors", () => {
      expect(getContrastTextColor("#FFFFFF")).toBe("#121212");
      expect(getContrastTextColor("#FFB7CE")).toBe("#121212");
      expect(getContrastTextColor("#F59E0B")).toBe("#121212");
    });

    it("should return light text #ffffff for dark background colors", () => {
      expect(getContrastTextColor("#000000")).toBe("#ffffff");
      expect(getContrastTextColor("#1E1B4B")).toBe("#ffffff");
      expect(getContrastTextColor("#7F1D1D")).toBe("#ffffff");
    });

    it("should default to dark text if null or empty", () => {
      expect(getContrastTextColor(null)).toBe("#121212");
      expect(getContrastTextColor("")).toBe("#121212");
    });
  });

  describe("getTenantAdminUrl", () => {
    it("should return the correct production URL with slug and path", () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "production";

      const url = getTenantAdminUrl("sucursal-prueba", "/kitchen");
      expect(url).toBe("https://sucursal-prueba.admin.trykittn.com/kitchen");

      (process.env as any).NODE_ENV = originalEnv;
    });

    it("should return localhost URL when in development", () => {
      const originalEnv = process.env.NODE_ENV;
      (process.env as any).NODE_ENV = "development";

      const url = getTenantAdminUrl("sucursal-prueba", "/inventario");
      expect(url).toBe("http://sucursal-prueba.localhost:3000/inventario");

      (process.env as any).NODE_ENV = originalEnv;
    });
  });

  describe("getTenantAdminEmails", () => {
    it("should fetch profiles for the tenant with role ADMIN or MANAGER", async () => {
      const mockProfiles = [
        { email: "owner@sucursalprueba.com" },
        { email: "manager@sucursalprueba.com" },
        { email: "invalid-email" },
      ];

      mockSupabaseFrom().select().eq().in.mockResolvedValueOnce({
        data: mockProfiles,
        error: null,
      });

      const emails = await getTenantAdminEmails("tenant-123");

      expect(mockSupabaseFrom).toHaveBeenCalledWith("profiles");
      expect(emails).toEqual([
        "owner@sucursalprueba.com",
        "manager@sucursalprueba.com",
      ]);
    });

    it("should return empty array if database returns an error", async () => {
      mockSupabaseFrom().select().eq().in.mockResolvedValueOnce({
        data: null,
        error: new Error("DB Error"),
      });

      const emails = await getTenantAdminEmails("tenant-123");
      expect(emails).toEqual([]);
    });
  });

  describe("sendNewOrderNotificationEmail", () => {
    it("should skip sending if no admin recipients found", async () => {
      mockSupabaseFrom().select().eq().in.mockResolvedValueOnce({
        data: [],
        error: null,
      });

      const result = await sendNewOrderNotificationEmail({
        tenant: {
          id: "tenant-123",
          name: "Sucursal de Prueba",
          slug: "sucursal-prueba",
          system_name: "Sucursal de Prueba",
        },
        orderNumber: "101",
        customerName: "Juan Pérez",
        phone: "3312345678",
        email: "juan@example.com",
        type: "takeout",
        items: [{ name: "Tacos Birria", quantity: 3, unitPrice: 35 }],
        subtotal: 105,
        tipAmount: 15,
        total: 105,
      });

      expect(result).toEqual({ success: false, reason: "no_recipients" });
      expect(mockResendSend).not.toHaveBeenCalled();
    });

    it("should send email with custom primary color and logo URL", async () => {
      mockSupabaseFrom().select().eq().in.mockResolvedValueOnce({
        data: [{ email: "admin@sucursalprueba.com" }],
        error: null,
      });

      const result = await sendNewOrderNotificationEmail({
        tenant: {
          id: "tenant-123",
          name: "Tacos El Profe",
          slug: "tacos-el-profe",
          system_name: "Tacos El Profe",
          primary_color: "#3B82F6",
          logo_url: "https://example.com/logo.png",
        },
        orderNumber: "102",
        customerName: "María López",
        phone: "3398765432",
        email: "maria@example.com",
        type: "dine-in",
        table: "Mesa 4",
        notes: "Salsa aparte por favor",
        items: [
          { name: "Hamburguesa Clásica", quantity: 2, unitPrice: 120, notes: "Sin cebolla" },
        ],
        subtotal: 240,
        tipAmount: 30,
        total: 240,
      });

      expect(result.success).toBe(true);
      expect(result.emailId).toBe("resend-msg-123");
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Tacos El Profe <orders@trykittn.com>",
          to: ["admin@sucursalprueba.com"],
          subject: expect.stringContaining("Tacos El Profe"),
          html: expect.stringContaining("#3B82F6"),
        }),
      );
      const callArgs = mockResendSend.mock.calls[0][0];
      expect(callArgs.html).toContain("https://example.com/logo.png");
      expect(callArgs.html).toContain("background:#3B82F6");
    });
  });

  describe("sendLowStockAlertEmail", () => {
    it("should render low stock email with tenant branding and item details", async () => {
      mockSupabaseFrom().select().eq().in.mockResolvedValueOnce({
        data: [{ email: "manager@restaurante.com" }],
        error: null,
      });

      const result = await sendLowStockAlertEmail({
        tenant: {
          id: "tenant-456",
          name: "Restaurante Central",
          slug: "restaurante-central",
          system_name: "Restaurante Central",
          primary_color: "#10B981",
        },
        lowStock: [
          { id: "ing-1", name: "Carne Asada", current_stock: 0, minimum_stock: 5, unit: "kg" },
          { id: "ing-2", name: "Queso Oaxaca", current_stock: 2, minimum_stock: 4, unit: "kg" },
        ],
        outOfStock: [
          { id: "ing-1", name: "Carne Asada", current_stock: 0, minimum_stock: 5, unit: "kg" },
        ],
        belowMin: [
          { id: "ing-2", name: "Queso Oaxaca", current_stock: 2, minimum_stock: 4, unit: "kg" },
        ],
      });

      expect(result.success).toBe(true);
      expect(mockResendSend).toHaveBeenCalledWith(
        expect.objectContaining({
          from: "Restaurante Central <alerts@trykittn.com>",
          to: ["manager@restaurante.com"],
          subject: expect.stringContaining("1 ingrediente(s) AGOTADO(S)"),
          html: expect.stringContaining("background:#10B981"),
        }),
      );
    });
  });
});
