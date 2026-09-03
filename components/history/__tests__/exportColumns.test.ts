import { describe, it, expect } from "vitest";
import { ORDERS_EXPORT_COLUMNS, DAILY_CUTS_EXPORT_COLUMNS } from "../exportColumns";
import { type OrderWithDetails, OrderStatus, PaymentMethod } from "@/types";
import type { DailyCut } from "../types";

describe("exportColumns in components/history", () => {
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

  it("exports ORDERS_EXPORT_COLUMNS correctly", () => {
    expect(ORDERS_EXPORT_COLUMNS.length).toBeGreaterThan(0);
    const folioCol = ORDERS_EXPORT_COLUMNS.find((c) => c.header === "Folio");
    expect(folioCol?.key).toBe("orderNumber");
  });

  describe("DAILY_CUTS_EXPORT_COLUMNS", () => {
    const cut: DailyCut = {
      id: "cut-1",
      cut_date: "2026-09-01",
      venta_neta: 1000,
      iva_acumulado: 160,
      propinas_efectivo: 100,
      propinas_tarjeta: 50,
      caja_efectivo: 1100,
      caja_tarjeta: 210,
      utilidad_real: 1150,
      total_gastos: 300,
      utilidad_final: 850,
      total_orders: 25,
      notes: null,
      expenses_detail: null,
      created_at: "2026-09-01T23:00:00Z",
    };

    it("formats Venta Bruta correctly", () => {
      const col = DAILY_CUTS_EXPORT_COLUMNS.find((c) => c.header === "Venta Bruta");
      expect(col?.accessor!(cut)).toBe("$1160.00");
    });

    it("formats Venta Neta correctly", () => {
      const col = DAILY_CUTS_EXPORT_COLUMNS.find((c) => c.header === "Venta Neta");
      expect(col?.accessor!(cut)).toBe("$1000.00");
    });

    it("formats IVA correctly", () => {
      const col = DAILY_CUTS_EXPORT_COLUMNS.find((c) => c.header === "IVA");
      expect(col?.accessor!(cut)).toBe("$160.00");
    });

    it("formats Gastos correctly", () => {
      const col = DAILY_CUTS_EXPORT_COLUMNS.find((c) => c.header === "Gastos");
      expect(col?.accessor!(cut)).toBe("-$300.00");
    });

    it("formats Utilidad Final correctly", () => {
      const col = DAILY_CUTS_EXPORT_COLUMNS.find((c) => c.header === "Utilidad Final");
      expect(col?.accessor!(cut)).toBe("$850.00");
    });
  });
});
