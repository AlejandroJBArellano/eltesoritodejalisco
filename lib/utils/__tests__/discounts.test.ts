import { describe, it, expect } from "vitest";
import {
  calculateItemDiscount,
  calculateOrderDiscountTotals,
  formatDiscountBadge,
  DISCOUNT_PERCENT_PRESETS,
  DISCOUNT_REASONS,
} from "../discounts";

describe("lib/utils/discounts", () => {
  describe("calculateItemDiscount", () => {
    it("returns 0 discount when no discountType is specified or value <= 0", () => {
      expect(calculateItemDiscount({ unitPrice: 50, quantity: 2 })).toEqual({
        discountAmount: 0,
        finalPrice: 100,
      });

      expect(
        calculateItemDiscount({
          unitPrice: 50,
          quantity: 2,
          discountType: "PERCENT",
          discountValue: 0,
        }),
      ).toEqual({
        discountAmount: 0,
        finalPrice: 100,
      });
    });

    it("calculates percentage discount accurately", () => {
      const result = calculateItemDiscount({
        unitPrice: 50,
        quantity: 2, // 100 total
        discountType: "PERCENT",
        discountValue: 20,
      });
      expect(result).toEqual({
        discountAmount: 20,
        finalPrice: 80,
      });
    });

    it("calculates fixed discount on ROW scope", () => {
      const result = calculateItemDiscount({
        unitPrice: 50,
        quantity: 2, // 100 total
        discountType: "FIXED",
        discountValue: 15,
        discountScope: "ROW",
      });
      expect(result).toEqual({
        discountAmount: 15,
        finalPrice: 85,
      });
    });

    it("calculates fixed discount on UNIT scope (multiplies by quantity)", () => {
      const result = calculateItemDiscount({
        unitPrice: 50,
        quantity: 2, // 100 total
        discountType: "FIXED",
        discountValue: 15,
        discountScope: "UNIT",
      });
      expect(result).toEqual({
        discountAmount: 30,
        finalPrice: 70,
      });
    });

    it("caps discount amount to gross price so final price is never negative", () => {
      const result = calculateItemDiscount({
        unitPrice: 50,
        quantity: 1,
        discountType: "FIXED",
        discountValue: 100,
      });
      expect(result).toEqual({
        discountAmount: 50,
        finalPrice: 0,
      });
    });
  });

  describe("calculateOrderDiscountTotals", () => {
    it("handles empty items array correctly", () => {
      const totals = calculateOrderDiscountTotals({ items: [] });
      expect(totals).toEqual({
        subtotalGross: 0,
        itemsDiscount: 0,
        subtotalNet: 0,
        orderDiscount: 0,
        totalDiscount: 0,
        total: 0,
      });
    });

    it("calculates order with item discounts and order discount in cascade", () => {
      const items = [
        // Item 1: 2 x $50 = $100, with 20% discount = $20 off -> $80 net
        {
          unitPrice: 50,
          quantity: 2,
          discountType: "PERCENT" as const,
          discountValue: 20,
        },
        // Item 2: 1 x $100 = $100, with $10 fixed discount -> $90 net
        {
          unitPrice: 100,
          quantity: 1,
          discountType: "FIXED" as const,
          discountValue: 10,
        },
      ];

      // Gross = $200. Items discount = $30. Net = $170.
      // Order discount = 10% on $170 = $17 off.
      // Total discount = $47. Total = $153.
      const totals = calculateOrderDiscountTotals({
        items,
        orderDiscountType: "PERCENT",
        orderDiscountValue: 10,
      });

      expect(totals).toEqual({
        subtotalGross: 200,
        itemsDiscount: 30,
        subtotalNet: 170,
        orderDiscount: 17,
        totalDiscount: 47,
        total: 153,
      });
    });

    it("calculates order with fixed order discount", () => {
      const items = [{ unitPrice: 100, quantity: 1 }];
      const totals = calculateOrderDiscountTotals({
        items,
        orderDiscountType: "FIXED",
        orderDiscountValue: 25,
      });

      expect(totals).toEqual({
        subtotalGross: 100,
        itemsDiscount: 0,
        subtotalNet: 100,
        orderDiscount: 25,
        totalDiscount: 25,
        total: 75,
      });
    });

    it("caps 100% discount or excessive fixed discount to 0 total", () => {
      const items = [{ unitPrice: 100, quantity: 1 }];
      const totals = calculateOrderDiscountTotals({
        items,
        orderDiscountType: "FIXED",
        orderDiscountValue: 200,
      });

      expect(totals.total).toBe(0);
      expect(totals.orderDiscount).toBe(100);
      expect(totals.totalDiscount).toBe(100);
    });
  });

  describe("formatDiscountBadge", () => {
    it("returns formatted percentage and fixed strings with and without reason", () => {
      expect(formatDiscountBadge("PERCENT", 15)).toBe("-15%");
      expect(formatDiscountBadge("PERCENT", 15, "Cortesía")).toBe(
        "-15% (Cortesía)",
      );
      expect(formatDiscountBadge("FIXED", 50)).toBe("-$50.00");
      expect(formatDiscountBadge("FIXED", 50, "Empleado")).toBe(
        "-$50.00 (Empleado)",
      );
      expect(formatDiscountBadge(null, null)).toBe("");
    });
  });

  describe("presets and reasons constants", () => {
    it("defines presets and reasons", () => {
      expect(DISCOUNT_PERCENT_PRESETS).toContain(10);
      expect(DISCOUNT_PERCENT_PRESETS).toContain(100);
      expect(DISCOUNT_REASONS).toContain("Cortesía");
    });
  });
});
