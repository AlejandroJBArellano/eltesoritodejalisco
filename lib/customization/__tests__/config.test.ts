import { describe, expect, it } from "vitest";
import {
  computePriceRange,
  hasBlockingIssues,
  validateCustomizationConfig,
} from "../config";
import {
  aggregateOptionRequirements,
  isOptionOutOfStock,
  optionInventoryPerUnit,
} from "../inventory";
import { group, option, tacosMixtos } from "./fixtures";
import type { MenuItemCustomization } from "../types";

const messages = (c: MenuItemCustomization, id?: string) =>
  validateCustomizationConfig(c, id)
    .filter((i) => i.level === "error")
    .map((i) => i.message);

describe("validateCustomizationConfig", () => {
  it("accepts the Tesorito configuration", () => {
    expect(hasBlockingIssues(validateCustomizationConfig(tacosMixtos()))).toBe(false);
  });

  it("flags min > max", () => {
    const c = tacosMixtos({ minSelect: 4, maxSelect: 3 });
    expect(messages(c).some((m) => m.includes("mínimo (4) mayor al máximo (3)"))).toBe(true);
  });

  it("flags min greater than distinct options when repeat is off", () => {
    const c: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [group("g", { name: "Salsas", minSelect: 3, options: [option("a"), option("b")] })],
    };
    expect(messages(c)[0]).toContain("al menos 3 opciones distintas");
  });

  it("flags min unreachable with maxPerOption", () => {
    const c: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [
        group("g", {
          name: "Tacos",
          minSelect: 5,
          allowRepeat: true,
          maxPerOption: 2,
          options: [option("a"), option("b")],
        }),
      ],
    };
    expect(messages(c)[0]).toContain("solo permite 4");
  });

  it("flags groups without name or active options", () => {
    const c: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [group("g", { name: "  ", options: [option("a", { isActive: false })] })],
    };
    const m = messages(c);
    expect(m).toContain("El grupo #1 necesita nombre");
    expect(m.some((x) => x.includes("no tiene opciones activas"))).toBe(true);
  });

  it("flags overlapping RANGE tiers and tiers outside bounds", () => {
    const c = tacosMixtos({
      minSelect: 1,
      maxSelect: 6,
      tierMatchMode: "RANGE",
      tiers: [
        { quantityFrom: 1, quantityTo: 4, price: 100 },
        { quantityFrom: 3, quantityTo: 8, price: 150 },
      ],
    });
    const m = messages(c);
    expect(m.some((x) => x.includes("se traslapan"))).toBe(true);
    expect(m.some((x) => x.includes("supera el máximo (6)"))).toBe(true);
  });

  it("flags duplicated EXACT tiers and unreachable tiers", () => {
    const dup = tacosMixtos({
      tiers: [
        { quantityFrom: 3, quantityTo: null, price: 1 },
        { quantityFrom: 3, quantityTo: null, price: 2 },
      ],
    });
    expect(messages(dup).some((x) => x.includes("dos niveles de 3"))).toBe(true);

    const unreachable = tacosMixtos({
      minSelect: 3,
      maxSelect: 3,
      tiers: [{ quantityFrom: 2, quantityTo: null, price: 50 }],
    });
    const m = messages(unreachable);
    expect(m.some((x) => x.includes("debajo del mínimo"))).toBe(true);
    expect(m.some((x) => x.includes("ningún nivel"))).toBe(true);
  });

  it("flags ROUND_UP top tier below max", () => {
    const c = tacosMixtos({
      minSelect: 1,
      maxSelect: 6,
      tierMatchMode: "ROUND_UP",
      tiers: [
        { quantityFrom: 3, quantityTo: null, price: 120 },
        { quantityFrom: 5, quantityTo: null, price: 190 },
      ],
    });
    expect(messages(c).some((x) => x.includes("debe cubrir el máximo (6)"))).toBe(true);
  });

  it("flags TIERED without tiers or mode", () => {
    const c = tacosMixtos({ tierMatchMode: null, tiers: [] });
    const m = messages(c);
    expect(m.some((x) => x.includes("no tiene modo de niveles"))).toBe(true);
    expect(m.some((x) => x.includes("no tiene niveles"))).toBe(true);
  });

  it("flags option problems: self link, linked+recipe, missing link, bad recipe", () => {
    const c: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [
        group("g", {
          name: "G",
          options: [
            option("self", { name: "Self", linkedMenuItemId: "me" }),
            option("both", {
              name: "Both",
              linkedMenuItemId: "other",
              recipe: [{ ingredientId: "i1", quantityRequired: 1 }],
            }),
            option("nolink", { name: "NoLink", priceSource: "LINKED_PRODUCT" }),
            option("badrecipe", {
              name: "Bad",
              recipe: [
                { ingredientId: "", quantityRequired: 1 },
                { ingredientId: "i2", quantityRequired: 0 },
              ],
            }),
            option("neg", { name: "Neg", priceDelta: -1 }),
          ],
        }),
      ],
    };
    const m = messages(c, "me");
    expect(m).toContain('"Self" no puede enlazarse al mismo producto');
    expect(m).toContain('"Both" debe usar producto enlazado o receta propia, no ambos');
    expect(m).toContain('"NoLink" usa el precio del producto enlazado pero no tiene producto');
    expect(m.some((x) => x.includes("ingrediente sin elegir"))).toBe(true);
    expect(m.some((x) => x.includes("cantidades mayores a 0"))).toBe(true);
    expect(m).toContain('"Neg" no puede tener precio negativo');
  });

  it("warns (non-blocking) on max above options and duplicate names", () => {
    const c: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [
        group("g", {
          name: "Extras",
          maxSelect: 5,
          options: [option("a", { name: "Queso" }), option("b", { name: "queso" })],
        }),
      ],
    };
    const issues = validateCustomizationConfig(c);
    expect(hasBlockingIssues(issues)).toBe(false);
    expect(issues.filter((i) => i.level === "warning")).toHaveLength(2);
  });
});

describe("computePriceRange", () => {
  it("tacos mixtos: 120 to 150", () => {
    expect(computePriceRange(0, tacosMixtos())).toEqual({ min: 120, max: 150 });
  });

  it("optional additive extras", () => {
    const c: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [
        group("x", {
          maxSelect: 2,
          options: [option("a", { priceDelta: 10 }), option("b", { priceDelta: 20 }), option("c", { priceDelta: 5 })],
        }),
      ],
    };
    expect(computePriceRange(50, c)).toEqual({ min: 50, max: 80 });
  });

  it("open-ended repeats with price produce max = null", () => {
    const c: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [group("x", { allowRepeat: true, options: [option("a", { priceDelta: 10 })] })],
    };
    expect(computePriceRange(50, c)).toEqual({ min: 50, max: null });
  });

  it("returns nulls when the group can never be satisfied", () => {
    const c = tacosMixtos({ tiers: [{ quantityFrom: 4, quantityTo: null, price: 1 }] });
    expect(computePriceRange(0, c)).toEqual({ min: null, max: null });
  });
});

describe("option inventory helpers", () => {
  const linked = {
    isAvailable: true,
    ingredientId: null,
    recipe: [
      { ingredientId: "tortilla", quantityRequired: 1 },
      { ingredientId: "pastor", quantityRequired: 0.08 },
    ],
  };

  it("uses linked recipe, linked piece or own recipe", () => {
    expect(
      optionInventoryPerUnit(option("o", { linkedMenuItemId: "m" }), linked),
    ).toEqual([
      { ingredientId: "tortilla", quantity: 1 },
      { ingredientId: "pastor", quantity: 0.08 },
    ]);
    expect(
      optionInventoryPerUnit(option("o", { linkedMenuItemId: "m" }), {
        ...linked,
        ingredientId: "lata",
      }),
    ).toEqual([{ ingredientId: "lata", quantity: 1 }]);
    expect(
      optionInventoryPerUnit(
        option("o", { linkedMenuItemId: "m", deductLinkedInventory: false }),
        linked,
      ),
    ).toEqual([]);
    expect(
      optionInventoryPerUnit(
        option("o", { recipe: [{ ingredientId: "birria", quantityRequired: 0.1 }] }),
      ),
    ).toEqual([{ ingredientId: "birria", quantity: 0.1 }]);
  });

  it("detects out of stock by ingredient or linked availability", () => {
    const stock = new Map([
      ["tortilla", 10],
      ["pastor", 0.05],
      ["birria", 3],
    ]);
    expect(isOptionOutOfStock(option("o", { linkedMenuItemId: "m" }), stock, linked)).toBe(true);
    expect(
      isOptionOutOfStock(
        option("o", { recipe: [{ ingredientId: "birria", quantityRequired: 0.1 }] }),
        stock,
      ),
    ).toBe(false);
    expect(
      isOptionOutOfStock(option("o", { linkedMenuItemId: "m" }), new Map(), {
        ...linked,
        isAvailable: false,
      }),
    ).toBe(true);
    // Sin rastreo de stock para el ingrediente ⇒ disponible
    expect(
      isOptionOutOfStock(
        option("o", { recipe: [{ ingredientId: "nuevo", quantityRequired: 1 }] }),
        stock,
      ),
    ).toBe(false);
  });

  it("aggregates requirements across lines", () => {
    const totals = aggregateOptionRequirements([
      {
        itemQuantity: 2,
        options: [
          { quantity: 2, inventory: [{ ingredientId: "pastor", quantity: 0.08 }] },
          { quantity: 1, inventory: [{ ingredientId: "birria", quantity: 0.1 }] },
        ],
      },
      {
        itemQuantity: 1,
        options: [{ quantity: 3, inventory: [{ ingredientId: "pastor", quantity: 0.08 }] }],
      },
    ]);
    expect(totals.get("pastor")).toBe(0.56);
    expect(totals.get("birria")).toBe(0.2);
  });
});
