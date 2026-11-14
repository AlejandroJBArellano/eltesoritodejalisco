import { describe, expect, it } from "vitest";
import {
  buildSelectionSnapshot,
  getDiscountBasePrice,
  getEffectiveOptionPrice,
  priceSelection,
  resolveTier,
} from "../pricing";
import { formatSelectionLine, selectionKey } from "../format";
import { group, option, tacosMixtos } from "./fixtures";
import type { MenuItemCustomization } from "../types";

describe("resolveTier", () => {
  const g = (mode: "EXACT" | "ROUND_UP" | "RANGE") =>
    group("g", {
      pricingMode: "TIERED",
      tierMatchMode: mode,
      tiers: [
        { quantityFrom: 5, quantityTo: mode === "RANGE" ? 6 : null, price: 190 },
        { quantityFrom: 3, quantityTo: mode === "RANGE" ? 4 : null, price: 120 },
      ],
    });

  it("EXACT matches only listed quantities", () => {
    expect(resolveTier(g("EXACT"), 3)).toMatchObject({ allowed: true, price: 120 });
    expect(resolveTier(g("EXACT"), 4)).toMatchObject({ allowed: false, price: 0 });
  });

  it("ROUND_UP charges the next tier", () => {
    expect(resolveTier(g("ROUND_UP"), 4)).toMatchObject({ allowed: true, price: 190 });
    expect(resolveTier(g("ROUND_UP"), 1)).toMatchObject({ allowed: true, price: 120 });
    expect(resolveTier(g("ROUND_UP"), 6).allowed).toBe(false);
  });

  it("RANGE charges the containing range, open-ended supported", () => {
    expect(resolveTier(g("RANGE"), 4)).toMatchObject({ allowed: true, price: 120 });
    expect(resolveTier(g("RANGE"), 7).allowed).toBe(false);
    const open = group("o", {
      pricingMode: "TIERED",
      tierMatchMode: "RANGE",
      tiers: [{ quantityFrom: 3, quantityTo: null, price: 99 }],
    });
    expect(resolveTier(open, 50)).toMatchObject({ allowed: true, price: 99 });
  });

  it("zero quantity never charges a tier; ADDITIVE always allowed", () => {
    expect(resolveTier(g("EXACT"), 0)).toMatchObject({ allowed: true, price: 0 });
    expect(resolveTier(group("a"), 7)).toMatchObject({ allowed: true, price: 0 });
  });

  it("TIERED without tiers is never allowed", () => {
    expect(
      resolveTier(group("t", { pricingMode: "TIERED", tierMatchMode: "EXACT" }), 1)
        .allowed,
    ).toBe(false);
  });
});

describe("priceSelection", () => {
  it("tacos mixtos: base 0 + tier 120 + pastor deltas", () => {
    const p = priceSelection(0, tacosMixtos(), [
      { optionId: "pastor", quantity: 2 },
      { optionId: "birria", quantity: 1 },
    ]);
    expect(p.unitPrice).toBe(140);
    expect(p.tiersTotal).toBe(120);
    expect(p.optionsTotal).toBe(20);
    expect(p.tiers).toEqual([
      { groupId: "tacos", groupName: "Elige tus tacos", quantity: 3, price: 120 },
    ]);
  });

  it("3x carnitas costs exactly the tier", () => {
    expect(
      priceSelection(0, tacosMixtos(), [{ optionId: "carnitas", quantity: 3 }])
        .unitPrice,
    ).toBe(120);
  });

  it("ADDITIVE sums deltas over base", () => {
    const config: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [
        group("extras", {
          allowRepeat: true,
          options: [option("queso", { priceDelta: 15 }), option("aguacate", { priceDelta: 12.5 })],
        }),
      ],
    };
    expect(
      priceSelection(50, config, [
        { optionId: "queso", quantity: 2 },
        { optionId: "aguacate", quantity: 1 },
      ]).unitPrice,
    ).toBe(92.5);
  });

  it("LINKED_PRODUCT uses the linked product price", () => {
    const opt = option("taco", {
      priceSource: "LINKED_PRODUCT",
      linkedMenuItemId: "mi-taco",
      linkedMenuItemPrice: 35,
      priceDelta: 999,
    });
    expect(getEffectiveOptionPrice(opt)).toBe(35);
    expect(getEffectiveOptionPrice({ ...opt, linkedMenuItemPrice: null })).toBe(0);
  });

  it("ignores unknown options and negative base", () => {
    expect(
      priceSelection(-5, tacosMixtos(), [{ optionId: "ghost", quantity: 3 }])
        .unitPrice,
    ).toBe(0);
  });

  it("discount base price respects the tenant setting", () => {
    const p = priceSelection(10, tacosMixtos(), [{ optionId: "pastor", quantity: 3 }]);
    expect(getDiscountBasePrice(p, true)).toBe(160);
    expect(getDiscountBasePrice(p, false)).toBe(10);
  });
});

describe("snapshot + formatSelectionLine", () => {
  it("formats the kitchen line with quantities per group", () => {
    const config: MenuItemCustomization = {
      ...tacosMixtos(),
      groups: [
        ...tacosMixtos().groups,
        group("extras", {
          name: "Extras",
          sortOrder: 1,
          options: [option("queso", { name: "Queso extra", priceDelta: 15 })],
        }),
      ],
    };
    const snapshot = buildSelectionSnapshot(config, [
      { optionId: "birria", quantity: 1 },
      { optionId: "pastor", quantity: 2 },
      { optionId: "queso", quantity: 1 },
    ]);
    expect(snapshot.map((s) => s.optionName)).toEqual(["Birria", "Pastor", "Queso extra"]);
    // Orden del modal: Birria (1) antes que Pastor (3)
    expect(formatSelectionLine(snapshot)).toBe("1x Birria, 2x Pastor · Queso extra");
  });

  it("omits quantities when every option in a group is single", () => {
    const snapshot = buildSelectionSnapshot(tacosMixtos(), [
      { optionId: "carnitas", quantity: 1 },
      { optionId: "birria", quantity: 1 },
      { optionId: "pastor", quantity: 1 },
    ]);
    expect(formatSelectionLine(snapshot)).toBe("Carnitas, Birria, Pastor");
  });

  it("returns empty string for no lines", () => {
    expect(formatSelectionLine([])).toBe("");
    expect(formatSelectionLine(null)).toBe("");
  });
});

describe("selectionKey", () => {
  it("is stable across order and merges duplicates", () => {
    expect(
      selectionKey("m", [
        { optionId: "b", quantity: 1 },
        { optionId: "a", quantity: 1 },
        { optionId: "a", quantity: 1 },
      ]),
    ).toBe(selectionKey("m", [{ optionId: "a", quantity: 2 }, { optionId: "b", quantity: 1 }]));
  });

  it("differs by notes and selection", () => {
    expect(selectionKey("m", [], "sin cebolla")).not.toBe(selectionKey("m", []));
    expect(selectionKey("m", [{ optionId: "a", quantity: 1 }])).not.toBe(
      selectionKey("m", [{ optionId: "a", quantity: 2 }]),
    );
  });
});
