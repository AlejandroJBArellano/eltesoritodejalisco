import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  logOrderAction,
  getPushNotificationCopy,
} from "../orderAudit";

const { mockSendTenantPushNotification, mockInsert, mockSingle, mockSupabaseFrom } =
  vi.hoisted(() => {
    const mockSendTenantPushNotification = vi.fn().mockResolvedValue({ success: true });
    const mockSingle = vi.fn();
    const mockSelect = vi.fn().mockReturnValue({ single: mockSingle });
    const mockInsert = vi.fn().mockReturnValue({ select: mockSelect });
    const mockSupabaseFrom = vi.fn().mockReturnValue({
      insert: mockInsert,
    });

    return {
      mockSendTenantPushNotification,
      mockSingle,
      mockSelect,
      mockInsert,
      mockSupabaseFrom,
    };
  });

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: mockSupabaseFrom,
  }),
}));

vi.mock("@/lib/services/push", () => ({
  sendTenantPushNotification: mockSendTenantPushNotification,
}));

describe("lib/services/orderAudit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getPushNotificationCopy", () => {
    it("formats ITEMS_REMOVED copy with summary and authorizedBy", () => {
      const copy = getPushNotificationCopy("ITEMS_REMOVED", "Carlos", {
        summary: "Tacos de Birria x1",
        authorizedBy: "Gerente Juan",
      });
      expect(copy.title).toBe("Alerta: Productos eliminados");
      expect(copy.body).toContain("Carlos eliminó productos en la orden. Tacos de Birria x1");
      expect(copy.body).toContain("(Autorizado por Gerente Juan)");
    });

    it("formats CANCELLED copy with reason and authorizedBy", () => {
      const copy = getPushNotificationCopy("CANCELLED", "Ana", {
        reason: "Cliente se retiró",
        authorizedBy: "Gerente Juan",
      });
      expect(copy.title).toBe("Alerta: Comanda cancelada");
      expect(copy.body).toContain("Ana canceló la orden. Motivo: Cliente se retiró.");
      expect(copy.body).toContain("(Autorizado por Gerente Juan)");
    });

    it("formats DISCOUNT_APPLIED copy with percent discount", () => {
      const copy = getPushNotificationCopy("DISCOUNT_APPLIED", "Admin", {
        discountType: "PERCENT",
        discountValue: 15,
      });
      expect(copy.title).toBe("Alerta: Descuento aplicado");
      expect(copy.body).toContain("Admin aplicó un descuento (15%).");
    });

    it("formats DISCOUNT_APPLIED copy with fixed discount", () => {
      const copy = getPushNotificationCopy("DISCOUNT_APPLIED", "Admin", {
        discountType: "FIXED",
        discountValue: 50,
      });
      expect(copy.title).toBe("Alerta: Descuento aplicado");
      expect(copy.body).toContain("Admin aplicó un descuento ($50).");
    });

    it("formats REOPENED copy with reason", () => {
      const copy = getPushNotificationCopy("REOPENED", "Carlos", {
        reason: "Corrección de platillo",
        authorizedBy: "Gerente",
      });
      expect(copy.title).toBe("Alerta: Reapertura de comanda");
      expect(copy.body).toContain("Carlos reabrió la cuenta. Corrección de platillo.");
      expect(copy.body).toContain("(Autorizado por Gerente)");
    });

    it("omits authorization suffix if authorizedBy matches userName", () => {
      const copy = getPushNotificationCopy("ITEMS_REMOVED", "Alejandro Arellano", {
        summary: "papulince x4",
        authorizedBy: "Alejandro Arellano",
      });
      expect(copy.title).toBe("Alerta: Productos eliminados");
      expect(copy.body).toBe("Alejandro Arellano eliminó productos en la orden. papulince x4");
      expect(copy.body).not.toContain("Autorizado por");
    });

    it("provides fallback copy for unknown action type", () => {
      const copy = getPushNotificationCopy("UNKNOWN_ACTION", "Carlos");
      expect(copy.title).toBe("Modificación de comanda");
      expect(copy.body).toContain("Carlos realizó cambios en la comanda.");
    });
  });

  describe("logOrderAction", () => {
    it("successfully logs order action to console and database without push if notifyCritical is false", async () => {
      const mockLogData = {
        id: "audit-1",
        order_id: "order-123",
        tenant_id: "tenant-abc",
        user_id: "user-1",
        user_name: "Juan Perez",
        action_type: "CREATED",
        details: { items: ["Torta x2"] },
        created_at: new Date().toISOString(),
      };

      mockSingle.mockResolvedValueOnce({
        data: mockLogData,
        error: null,
      });

      const consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});

      const result = await logOrderAction({
        orderId: "order-123",
        tenantId: "tenant-abc",
        user: { id: "user-1", full_name: "Juan Perez" },
        actionType: "CREATED",
        details: { items: ["Torta x2"] },
        notifyCritical: false,
      });

      expect(result.success).toBe(true);
      expect(result.log).toEqual(mockLogData);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ORDER_AUDIT] [CREATED] Order: order-123 | User: Juan Perez"),
      );
      expect(mockSupabaseFrom).toHaveBeenCalledWith("order_audit_logs");
      expect(mockInsert).toHaveBeenCalledWith({
        order_id: "order-123",
        tenant_id: "tenant-abc",
        user_id: "user-1",
        user_name: "Juan Perez",
        action_type: "CREATED",
        details: { items: ["Torta x2"] },
      });
      expect(mockSendTenantPushNotification).not.toHaveBeenCalled();

      consoleSpy.mockRestore();
    });

    it("falls back to name, role, or 'Sistema' if full_name is not present", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: "audit-2" },
        error: null,
      });

      await logOrderAction({
        orderId: "order-123",
        tenantId: "tenant-abc",
        user: { name: "Maria" },
        actionType: "ITEMS_ADDED",
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_name: "Maria",
        }),
      );

      mockSingle.mockResolvedValueOnce({
        data: { id: "audit-3" },
        error: null,
      });

      await logOrderAction({
        orderId: "order-123",
        tenantId: "tenant-abc",
        user: { role: "WAITER" },
        actionType: "ITEMS_ADDED",
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_name: "WAITER",
        }),
      );

      mockSingle.mockResolvedValueOnce({
        data: { id: "audit-4" },
        error: null,
      });

      await logOrderAction({
        orderId: "order-123",
        tenantId: "tenant-abc",
        user: null,
        actionType: "ITEMS_ADDED",
      });

      expect(mockInsert).toHaveBeenCalledWith(
        expect.objectContaining({
          user_name: "Sistema",
          user_id: null,
        }),
      );
    });

    it("sends Web Push notification to ADMIN and MANAGER when notifyCritical is true", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: "audit-5" },
        error: null,
      });

      const result = await logOrderAction({
        orderId: "order-456",
        tenantId: "tenant-abc",
        user: { id: "user-2", full_name: "Mesero Alex" },
        actionType: "ITEMS_REMOVED",
        details: { summary: "Tacos x1", authorizedBy: "Gerente Laura" },
        notifyCritical: true,
      });

      expect(result.success).toBe(true);
      expect(mockSendTenantPushNotification).toHaveBeenCalledWith(
        "tenant-abc",
        expect.objectContaining({
          title: "Alerta: Productos eliminados",
          body: expect.stringContaining("Mesero Alex eliminó productos en la orden"),
          url: "/history",
          tag: "order-audit-order-456",
        }),
        ["ADMIN", "MANAGER"],
      );
    });

    it("handles database insert error gracefully", async () => {
      const dbError = new Error("DB connection error");
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: dbError,
      });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await logOrderAction({
        orderId: "order-789",
        tenantId: "tenant-abc",
        actionType: "CANCELLED",
      });

      expect(result.success).toBe(false);
      expect(result.error).toBe(dbError);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ORDER_AUDIT] Error al insertar registro de auditoría:"),
        dbError,
      );

      consoleErrorSpy.mockRestore();
    });

    it("handles push notification exception without failing the audit return", async () => {
      mockSingle.mockResolvedValueOnce({
        data: { id: "audit-6" },
        error: null,
      });
      mockSendTenantPushNotification.mockRejectedValueOnce(new Error("Push network error"));
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await logOrderAction({
        orderId: "order-999",
        tenantId: "tenant-abc",
        actionType: "CANCELLED",
        notifyCritical: true,
      });

      expect(result.success).toBe(true);
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining("[ORDER_AUDIT] Excepción al enviar Web Push a Gerencia:"),
        expect.any(Error),
      );

      consoleErrorSpy.mockRestore();
    });

    it("handles unexpected thrown exceptions gracefully", async () => {
      mockSupabaseFrom.mockImplementationOnce(() => {
        throw new Error("Fatal Supabase client crash");
      });
      const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

      const result = await logOrderAction({
        orderId: "order-000",
        tenantId: "tenant-abc",
        actionType: "PAID",
      });

      expect(result.success).toBe(false);
      expect(result.error).toEqual(expect.any(Error));

      consoleErrorSpy.mockRestore();
    });
  });
});
