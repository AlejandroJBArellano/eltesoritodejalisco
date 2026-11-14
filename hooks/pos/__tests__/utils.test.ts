import { describe, it, expect } from "vitest";
import {
  addOrMergeDraft,
  isCustomizableMenuItem,
  priceDraftItem,
} from "../usePOSCart";
import { tacosMixtos } from "@/lib/customization/__tests__/fixtures";
import type { MenuItem } from "@/types/pos";

const mixtos: MenuItem = {
  id: "mi-mixtos",
  name: "Tacos Mixtos",
  price: 0,
  isAvailable: true,
  customization: tacosMixtos(),
};
const coca: MenuItem = { id: "mi-coca", name: "Coca", price: 30, isAvailable: true };

describe("usePOSCart utils", () => {
  describe("isCustomizableMenuItem", () => {
    it("is true only with an active group that has options", () => {
      expect(isCustomizableMenuItem(mixtos)).toBe(true);
      expect(isCustomizableMenuItem(coca)).toBe(false);
      expect(isCustomizableMenuItem({ customization: null })).toBe(false);
      expect(isCustomizableMenuItem(undefined)).toBe(false);
    });
  });

  describe("priceDraftItem", () => {
    it("prices plain products at their menu price", () => {
      expect(priceDraftItem(coca, undefined, true)).toEqual({
        unitPrice: 30,
        discountBasePrice: null,
        lines: [],
        customizable: false,
      });
    });

    it("prices customized lines and exposes the kitchen lines", () => {
      const pricing = priceDraftItem(
        mixtos,
        [
          { optionId: "pastor", quantity: 2 },
          { optionId: "birria", quantity: 1 },
        ],
        true,
      );
      expect(pricing.unitPrice).toBe(140);
      expect(pricing.discountBasePrice).toBeNull();
      expect(pricing.lines.map((l) => l.optionName)).toEqual(["Birria", "Pastor"]);
    });

    it("uses the base price as discount base when modifiers are excluded", () => {
      expect(
        priceDraftItem(mixtos, [{ optionId: "carnitas", quantity: 3 }], false)
          .discountBasePrice,
      ).toBe(0);
    });

    it("returns zero for unknown products", () => {
      expect(priceDraftItem(undefined, [], true).unitPrice).toBe(0);
    });
  });

  describe("addOrMergeDraft", () => {
    it("merges identical product + selection + empty note", () => {
      let items = addOrMergeDraft([], "mi-mixtos", [{ optionId: "pastor", quantity: 3 }]);
      items = addOrMergeDraft(items, "mi-mixtos", [{ optionId: "pastor", quantity: 3 }]);
      expect(items).toEqual([
        {
          menuItemId: "mi-mixtos",
          quantity: "2",
          notes: "",
          selections: [{ optionId: "pastor", quantity: 3 }],
        },
      ]);
    });

    it("keeps different selections as separate lines", () => {
      let items = addOrMergeDraft([], "mi-mixtos", [{ optionId: "pastor", quantity: 3 }]);
      items = addOrMergeDraft(items, "mi-mixtos", [{ optionId: "birria", quantity: 3 }]);
      expect(items).toHaveLength(2);
    });

    it("does not merge into lines with notes or discounts", () => {
      const base = [
        { menuItemId: "mi-coca", quantity: "1", notes: "sin hielo" },
        { menuItemId: "mi-coca", quantity: "1", notes: "", discountType: "PERCENT" as const },
      ];
      expect(addOrMergeDraft(base, "mi-coca")).toHaveLength(3);
    });

    it("plain products omit the selections field", () => {
      expect(addOrMergeDraft([], "mi-coca")).toEqual([
        { menuItemId: "mi-coca", quantity: "1", notes: "" },
      ]);
    });
  });
});
