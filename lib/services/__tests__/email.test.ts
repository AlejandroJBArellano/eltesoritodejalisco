import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTenantAdminEmails,
  getTenantAdminUrl,
  sendNewOrderNotificationEmail,
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

    it("should send email to tenant admins with dynamic tenant name in subject and body", async () => {
      mockSupabaseFrom().select().eq().in.mockResolvedValueOnce({
        data: [{ email: "admin@sucursalprueba.com" }],
        error: null,
      });

      const result = await sendNewOrderNotificationEmail({
        tenant: {
          id: "tenant-123",
          name: "Sucursal de Prueba",
          slug: "sucursal-prueba",
          system_name: "Sucursal de Prueba",
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
          from: "Sucursal de Prueba <orders@trykittn.com>",
          to: ["admin@sucursalprueba.com"],
          subject: expect.stringContaining("Sucursal de Prueba"),
          html: expect.stringContaining("Sucursal de Prueba"),
        }),
      );
    });
  });
});
