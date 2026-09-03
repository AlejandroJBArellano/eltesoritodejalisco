import { describe, it, expect } from "vitest";
import { ORDERS_EXPORT_COLUMNS } from "../page";
import { type OrderWithDetails, OrderStatus, PaymentMethod } from "@/types";

describe("ORDERS_EXPORT_COLUMNS in History Page", () => {
  const baseOrder: OrderWithDetails = {
    id: "ord-1",
    orderNumber: "1001",
    source: "POS",
    status: OrderStatus.PAID,
    table: "Mesa 4",
    notes: "Sin cebolla en los tacos",
    subtotal: 100,
    tax: 16,
    total: 116,
    createdAt: new Date("2026-09-01T12:00:00Z"),
    updatedAt: new Date("2026-09-01T12:30:00Z"),
    completedAt: new Date("2026-09-01T12:25:00Z"),
    pickupTime: new Date("2026-09-01T12:45:00Z"),
    orderItems: [
      {
        id: "item-1",
        orderId: "ord-1",
        menuItemId: "menu-1",
        quantity: 2,
        unitPrice: 50,
        createdAt: new Date("2026-09-01T12:00:00Z"),
        menuItem: {
          id: "menu-1",
          name: "Tacos de Barbacoa",
          price: 50,
          category: "cat-1",
          isAvailable: true,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      },
    ],
    payments: [
      {
        id: "pay-1",
        orderId: "ord-1",
        method: PaymentMethod.CASH,
        amount: 116,
        tipAmount: 20,
        createdAt: new Date("2026-09-01T12:20:00Z"),
      },
    ],
  };

  const getCol = (header: string) => {
    const col = ORDERS_EXPORT_COLUMNS.find((c) => c.header === header);
    if (!col) throw new Error(`Column "${header}" not found in ORDERS_EXPORT_COLUMNS`);
    return col;
  };

  it("should contain the 4 newly requested columns alongside existing columns", () => {
    const headers = ORDERS_EXPORT_COLUMNS.map((c) => c.header);
    expect(headers).toContain("Canal de Venta");
    expect(headers).toContain("Fecha/Hora de Completado");
    expect(headers).toContain("Hora de Pickup / Programada");
    expect(headers).toContain("Notas del Pedido");
  });

  describe("Canal de Venta column", () => {
    const col = () => getCol("Canal de Venta");

    it("should display 'App Móvil / Pickup' when source is PICKUP_APP", () => {
      const order = { ...baseOrder, source: "PICKUP_APP" };
      expect(col().accessor!(order)).toBe("App Móvil / Pickup");
    });

    it("should display 'Punto de Venta (POS)' when source is POS or other", () => {
      const order = { ...baseOrder, source: "POS" };
      expect(col().accessor!(order)).toBe("Punto de Venta (POS)");
    });
  });

  describe("Fecha/Hora de Completado column", () => {
    const col = () => getCol("Fecha/Hora de Completado");

    it("should format completedAt date when present", () => {
      const order = { ...baseOrder, completedAt: new Date("2026-09-01T18:25:00Z") };
      const val = col().accessor!(order);
      expect(val).not.toBe("N/A");
      expect(val).toContain("2026");
    });

    it("should read completed_at fallback if completedAt is missing", () => {
      const order = {
        ...baseOrder,
        completedAt: undefined,
        completed_at: "2026-09-01T18:25:00Z",
      } as unknown as OrderWithDetails;
      const val = col().accessor!(order);
      expect(val).not.toBe("N/A");
      expect(val).toContain("2026");
    });

    it("should return 'N/A' when no completed date is available", () => {
      const order = { ...baseOrder, completedAt: undefined };
      expect(col().accessor!(order)).toBe("N/A");
    });

    it("should return 'N/A' on invalid date", () => {
      const order = { ...baseOrder, completedAt: new Date("invalid") };
      expect(col().accessor!(order)).toBe("N/A");
    });
  });

  describe("Hora de Pickup / Programada column", () => {
    const col = () => getCol("Hora de Pickup / Programada");

    it("should format pickupTime date when present", () => {
      const order = { ...baseOrder, pickupTime: new Date("2026-09-01T19:00:00Z") };
      const val = col().accessor!(order);
      expect(val).not.toBe("Inmediato / N/A");
      expect(val).toContain("2026");
    });

    it("should read pickup_time fallback if pickupTime is missing", () => {
      const order = {
        ...baseOrder,
        pickupTime: null,
        pickup_time: "2026-09-01T19:00:00Z",
      } as unknown as OrderWithDetails;
      const val = col().accessor!(order);
      expect(val).not.toBe("Inmediato / N/A");
      expect(val).toContain("2026");
    });

    it("should return 'Inmediato / N/A' when no pickup time is specified", () => {
      const order = { ...baseOrder, pickupTime: null };
      expect(col().accessor!(order)).toBe("Inmediato / N/A");
    });

    it("should return 'Inmediato / N/A' on invalid date", () => {
      const order = { ...baseOrder, pickupTime: new Date("invalid") };
      expect(col().accessor!(order)).toBe("Inmediato / N/A");
    });
  });

  describe("Notas del Pedido column", () => {
    const col = () => getCol("Notas del Pedido");

    it("should display trimmed notes when available", () => {
      const order = { ...baseOrder, notes: "   Sin cebolla y extra salsa   " };
      expect(col().accessor!(order)).toBe("Sin cebolla y extra salsa");
    });

    it("should display 'N/A' when notes is null, undefined or empty", () => {
      expect(col().accessor!({ ...baseOrder, notes: undefined })).toBe("N/A");
      expect(col().accessor!({ ...baseOrder, notes: "" })).toBe("N/A");
      expect(col().accessor!({ ...baseOrder, notes: "   " })).toBe("N/A");
    });
  });

  describe("Existing columns sanity", () => {
    it("should format Subtotal, IVA, Propina and Total correctly", () => {
      const subtotalCol = getCol("Subtotal");
      const ivaCol = getCol("IVA");
      const propinaCol = getCol("Propina");
      const totalCol = getCol("Total");

      expect(subtotalCol.accessor!(baseOrder)).toBe("$100.00");
      expect(ivaCol.accessor!(baseOrder)).toBe("$16.00");
      expect(propinaCol.accessor!(baseOrder)).toBe("$20.00");
      expect(totalCol.accessor!(baseOrder)).toBe("$136.00");
    });

    it("should list products correctly", () => {
      const prodCol = getCol("Productos");
      expect(prodCol.accessor!(baseOrder)).toBe("2x Tacos de Barbacoa");
    });
  });
});
