import { describe, it, expect } from "vitest";
import { isMixedOrderItem, formatMixedNotes } from "../usePOSCart";

describe("usePOSCart utils", () => {
  describe("isMixedOrderItem", () => {
    it("should return true for items containing 'orden mixta' case insensitively", () => {
      expect(isMixedOrderItem("Orden Mixta de Tacos")).toBe(true);
      expect(isMixedOrderItem("orden mixta")).toBe(true);
      expect(isMixedOrderItem("ORDEN MIXTA")).toBe(true);
    });

    it("should return false for regular items", () => {
      expect(isMixedOrderItem("Taco de Pastor")).toBe(false);
      expect(isMixedOrderItem("Gringas")).toBe(false);
    });
  });

  describe("formatMixedNotes", () => {
    it("should format flavor counts correctly into a string", () => {
      const counts = {
        Carnitas: 2,
        Birria: 1,
        Pastor: 0,
        Jamaica: 0,
      };
      expect(formatMixedNotes(counts)).toBe("2x Carnitas, 1x Birria");
    });

    it("should return an empty string if all counts are 0", () => {
      const counts = {
        Carnitas: 0,
        Birria: 0,
        Pastor: 0,
        Jamaica: 0,
      };
      expect(formatMixedNotes(counts)).toBe("");
    });
  });
});
