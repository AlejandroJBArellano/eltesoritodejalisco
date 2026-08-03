import { describe, it, expect } from "vitest";
import { safeParseDate, mapOrderData, DbOrderPayload } from "../orders";

describe("lib/mappers/orders", () => {
  describe("safeParseDate", () => {
    it("should return a Date object for valid ISO strings", () => {
      const dateStr = "2026-07-26T14:00:00.000Z";
      const parsed = safeParseDate(dateStr);
      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.toISOString()).toBe(dateStr);
    });

    it("should handle space instead of T in date strings", () => {
      const dateStr = "2026-07-26 14:00:00";
      const parsed = safeParseDate(dateStr);
      expect(parsed).toBeInstanceOf(Date);
      expect(isNaN(parsed.getTime())).toBe(false);
    });

    it("should parse space-separated or standard ISO strings without timezone as UTC", () => {
      const dateStr = "2026-07-26 14:00:00";
      const parsed = safeParseDate(dateStr);
      expect(parsed.toISOString()).toBe("2026-07-26T14:00:00.000Z");

      const dateStrT = "2026-07-26T14:00:00";
      const parsedT = safeParseDate(dateStrT);
      expect(parsedT.toISOString()).toBe("2026-07-26T14:00:00.000Z");
    });

    it("should return current Date for null, undefined, or invalid inputs", () => {
      const now = Date.now();
      expect(safeParseDate(null).getTime()).toBeGreaterThanOrEqual(now - 1000);
      expect(safeParseDate(undefined).getTime()).toBeGreaterThanOrEqual(now - 1000);
      expect(safeParseDate("invalid-date-string").getTime()).toBeGreaterThanOrEqual(now - 1000);
    });

    it("should preserve existing Date objects if valid", () => {
      const d = new Date("2026-01-01");
      expect(safeParseDate(d)).toBe(d);
    });
  });

  describe("mapOrderData", () => {
    it("should transform raw Supabase snake_case DbOrderPayload to camelCase OrderWithDetails", () => {
      const rawDbOrder: DbOrderPayload = {
        id: "ord-123",
        order_number: "1050",
        customer_id: "cust-456",
        source: "Mesa",
        status: "PENDING",
        table: "Mesa 4",
        notes: "Sin cebolla",
        subtotal: 100,
        tax: 0,
        total: 100,
        created_at: "2026-07-26T12:00:00Z",
        updated_at: "2026-07-26T12:05:00Z",
        completed_at: "2026-07-26T12:30:00Z",
        order_items: [
          {
            id: "item-1",
            order_id: "ord-123",
            menu_item_id: "menu-10",
            quantity: 2,
            unit_price: 50,
            notes: "Extra salsa",
            status: "PENDING",
            tiempo_preparacion_segundos: 120,
            created_at: "2026-07-26T12:00:00Z",
            menu_items: {
              id: "menu-10",
              name: "Taco de Birria",
              price: 50,
              is_available: true,
            },
          },
        ],
        payments: [
          {
            id: "pay-1",
            order_id: "ord-123",
            method: "CASH",
            amount: 100,
            received_amount: 200,
            change: 100,
            tip_amount: 10,
            created_at: "2026-07-26T12:30:00Z",
          },
        ],
        customer: {
          id: "cust-456",
          name: "Juan Pérez",
          loyaltyPoints: 0,
          totalSpend: 100,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      };

      const mapped = mapOrderData(rawDbOrder);

      expect(mapped.id).toBe("ord-123");
      expect(mapped.orderNumber).toBe("1050");
      expect(mapped.customerId).toBe("cust-456");
      expect(mapped.source).toBe("Mesa");
      expect(mapped.status).toBe("PENDING");
      expect(mapped.table).toBe("Mesa 4");
      expect(mapped.notes).toBe("Sin cebolla");
      expect(mapped.subtotal).toBe(100);
      expect(mapped.total).toBe(100);
      expect(mapped.createdAt).toBeInstanceOf(Date);
      expect(mapped.completedAt).toBeInstanceOf(Date);

      // Order Items check
      expect(mapped.orderItems.length).toBe(1);
      expect(mapped.orderItems[0].menuItemId).toBe("menu-10");
      expect(mapped.orderItems[0].menuItem?.name).toBe("Taco de Birria");
      expect(mapped.orderItems[0].preparationTimeSeconds).toBe(120);

      // Payments check
      expect(mapped.payments).toBeDefined();
      expect(mapped.payments?.length).toBe(1);
      expect(mapped.payments?.[0].method).toBe("CASH");
      expect(mapped.payments?.[0].tipAmount).toBe(10);

      // Customer check
      expect(mapped.customer?.name).toBe("Juan Pérez");
    });
  });
});
