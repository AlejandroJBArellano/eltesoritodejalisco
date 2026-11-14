import { describe, expect, it } from "vitest";
import {
  cloneCustomization,
  createEmptyGroup,
  moveItem,
  toSavePayload,
} from "../editor";
import { group, option, tacosMixtos } from "./fixtures";
import { validateCustomizationConfig } from "../config";

const seqIds = () => {
  let n = 0;
  return () => `00000000-0000-4000-8000-${String(++n).padStart(12, "0")}`;
};

describe("editor helpers", () => {
  it("createEmptyGroup creates a radio-like required group with one option", () => {
    const g = createEmptyGroup(2, seqIds());
    expect(g).toMatchObject({ sortOrder: 2, minSelect: 1, maxSelect: 1, allowRepeat: false });
    expect(g.options).toHaveLength(1);
    expect(g.id).not.toBe(g.options[0].id);
  });

  it("moveItem swaps and renumbers, ignoring out-of-range moves", () => {
    const list = [
      { id: "a", sortOrder: 0 },
      { id: "b", sortOrder: 1 },
      { id: "c", sortOrder: 2 },
    ];
    expect(moveItem(list, 0, 1).map((x) => [x.id, x.sortOrder])).toEqual([
      ["b", 0],
      ["a", 1],
      ["c", 2],
    ]);
    expect(moveItem(list, 0, -1)).toBe(list);
    expect(moveItem(list, 2, 1)).toBe(list);
  });

  it("cloneCustomization assigns fresh ids and unlinks self references", () => {
    const source = tacosMixtos();
    source.groups[0].options[0].linkedMenuItemId = "target";
    source.groups[0].options[0].priceSource = "LINKED_PRODUCT";
    source.groups[0].options[1].linkedMenuItemId = "other";
    source.groups[0].options[2].isOutOfStock = true;
    const clone = cloneCustomization(source, "target", seqIds());

    const ids = [clone.groups[0].id, ...clone.groups[0].options.map((o) => o.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("tacos");
    expect(clone.groups[0].options[0]).toMatchObject({
      linkedMenuItemId: null,
      priceSource: "CUSTOM",
    });
    expect(clone.groups[0].options[1].linkedMenuItemId).toBe("other");
    expect(clone.groups[0].options[2].isOutOfStock).toBeUndefined();
    // La copia sigue siendo válida
    expect(
      validateCustomizationConfig(clone, "target").filter((i) => i.level === "error"),
    ).toEqual([]);
    // La fuente no se modificó
    expect(source.groups[0].id).toBe("tacos");
  });

  it("toSavePayload strips computed fields and normalizes dependent settings", () => {
    const config = {
      layout: "SCROLL" as const,
      deductBase: true,
      groups: [
        group("g", {
          sortOrder: 5,
          name: "  Extras  ",
          allowRepeat: false,
          maxPerOption: 3,
          pricingMode: "ADDITIVE",
          tierMatchMode: "EXACT",
          tiers: [{ quantityFrom: 1, quantityTo: 2, price: 1 }],
          options: [
            option("o1", {
              name: " Queso ",
              sortOrder: 9,
              priceSource: "LINKED_PRODUCT",
              isOutOfStock: true,
              linkedMenuItemPrice: 30,
              linkedMenuItemName: "Queso",
            }),
            option("o2", {
              linkedMenuItemId: "m2",
              recipe: [{ ingredientId: "i", quantityRequired: 1 }],
            }),
          ],
        }),
      ],
    };
    const payload = toSavePayload(config);
    const g = payload.groups[0];
    expect(g).toMatchObject({
      name: "Extras",
      sortOrder: 0,
      maxPerOption: null,
      tierMatchMode: null,
      tiers: [],
    });
    expect(g.options[0]).toEqual({
      id: "o1",
      name: "Queso",
      sortOrder: 0,
      isActive: true,
      priceSource: "CUSTOM",
      priceDelta: 0,
      linkedMenuItemId: null,
      deductLinkedInventory: true,
      outOfStockBehavior: "DISABLE",
      recipe: [],
    });
    expect(g.options[1]).toMatchObject({ sortOrder: 1, linkedMenuItemId: "m2", recipe: [] });
  });

  it("toSavePayload keeps quantityTo only for RANGE tiers", () => {
    const exact = toSavePayload(tacosMixtos({ tiers: [{ quantityFrom: 3, quantityTo: 9, price: 120 }] }));
    expect(exact.groups[0].tiers[0].quantityTo).toBeNull();
    const range = toSavePayload(
      tacosMixtos({ tierMatchMode: "RANGE", tiers: [{ quantityFrom: 3, quantityTo: 3, price: 120 }] }),
    );
    expect(range.groups[0].tiers[0].quantityTo).toBe(3);
  });
});
