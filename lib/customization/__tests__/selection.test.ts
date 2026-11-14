import { describe, expect, it } from "vitest";
import {
  applyOptionChange,
  canIncrementOption,
  getActiveGroups,
  getDefaultSelections,
  getGroupStatus,
  hasCustomization,
  normalizeSelections,
  selectionsEqual,
  toggleOption,
  validateSelection,
} from "../selection";
import { group, option, tacosMixtos } from "./fixtures";
import type { MenuItemCustomization } from "../types";

describe("normalizeSelections", () => {
  it("merges duplicates, drops non-positive and sorts by id", () => {
    expect(
      normalizeSelections([
        { optionId: "b", quantity: 1 },
        { optionId: "a", quantity: 2 },
        { optionId: "b", quantity: 2 },
        { optionId: "c", quantity: 0 },
        { optionId: "d", quantity: -1 },
        { optionId: "", quantity: 1 },
      ]),
    ).toEqual([
      { optionId: "a", quantity: 2 },
      { optionId: "b", quantity: 3 },
    ]);
  });

  it("handles null/undefined", () => {
    expect(normalizeSelections(null)).toEqual([]);
    expect(normalizeSelections(undefined)).toEqual([]);
  });

  it("selectionsEqual ignores order and duplicates", () => {
    expect(
      selectionsEqual(
        [
          { optionId: "a", quantity: 1 },
          { optionId: "a", quantity: 1 },
        ],
        [{ optionId: "a", quantity: 2 }],
      ),
    ).toBe(true);
    expect(
      selectionsEqual(
        [{ optionId: "a", quantity: 1 }],
        [{ optionId: "a", quantity: 2 }],
      ),
    ).toBe(false);
  });
});

describe("getActiveGroups / hasCustomization", () => {
  it("filters inactive groups and options and sorts them", () => {
    const config: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [
        group("g2", { sortOrder: 2, options: [option("x")] }),
        group("g1", {
          sortOrder: 1,
          options: [
            option("b", { sortOrder: 2 }),
            option("a", { sortOrder: 1 }),
            option("off", { isActive: false }),
          ],
        }),
        group("off", { isActive: false, options: [option("y")] }),
      ],
    };
    const groups = getActiveGroups(config);
    expect(groups.map((g) => g.id)).toEqual(["g1", "g2"]);
    expect(groups[0].options.map((o) => o.id)).toEqual(["a", "b"]);
  });

  it("hasCustomization requires an active group with active options", () => {
    expect(hasCustomization(null)).toBe(false);
    expect(
      hasCustomization({ layout: "SCROLL", deductBase: true, groups: [] }),
    ).toBe(false);
    expect(
      hasCustomization({
        layout: "SCROLL",
        deductBase: true,
        groups: [group("g", { options: [option("a", { isActive: false })] })],
      }),
    ).toBe(false);
    expect(hasCustomization(tacosMixtos())).toBe(true);
  });
});

describe("validateSelection — tacos mixtos (EXACT 3)", () => {
  const config = tacosMixtos();

  it("accepts exactly 3 with repeats", () => {
    const r = validateSelection(config, [
      { optionId: "pastor", quantity: 2 },
      { optionId: "birria", quantity: 1 },
    ]);
    expect(r.valid).toBe(true);
    expect(r.errors).toEqual([]);
  });

  it("rejects fewer than minimum", () => {
    const r = validateSelection(config, [{ optionId: "pastor", quantity: 2 }]);
    expect(r.valid).toBe(false);
    expect(r.errors[0].code).toBe("BELOW_MIN");
    expect(r.errors[0].message).toBe("Faltan 1 en Elige tus tacos");
  });

  it("rejects more than maximum", () => {
    const r = validateSelection(config, [{ optionId: "pastor", quantity: 4 }]);
    expect(r.errors.map((e) => e.code)).toContain("ABOVE_MAX");
  });

  it("rejects unknown and inactive options", () => {
    const withInactive = tacosMixtos();
    withInactive.groups[0].options[0].isActive = false;
    const r = validateSelection(withInactive, [
      { optionId: "carnitas", quantity: 1 },
      { optionId: "ghost", quantity: 1 },
      { optionId: "pastor", quantity: 1 },
    ]);
    const codes = r.errors.map((e) => e.code);
    expect(codes).toContain("INACTIVE_OPTION");
    expect(codes).toContain("UNKNOWN_OPTION");
  });

  it("rejects non-integer or negative quantities", () => {
    const r = validateSelection(config, [
      { optionId: "pastor", quantity: 1.5 },
      { optionId: "birria", quantity: 2 },
    ]);
    expect(r.errors.map((e) => e.code)).toContain("INVALID_QUANTITY");
  });

  it("rejects DISABLE out-of-stock options but allows ALLOW ones", () => {
    const disabled = tacosMixtos();
    disabled.groups[0].options[1].isOutOfStock = true; // birria
    expect(
      validateSelection(disabled, [{ optionId: "birria", quantity: 3 }]).errors.map(
        (e) => e.code,
      ),
    ).toContain("OUT_OF_STOCK");

    const allowed = tacosMixtos();
    allowed.groups[0].options[1].isOutOfStock = true;
    allowed.groups[0].options[1].outOfStockBehavior = "ALLOW";
    expect(
      validateSelection(allowed, [{ optionId: "birria", quantity: 3 }]).valid,
    ).toBe(true);
  });
});

describe("validateSelection — repeat rules", () => {
  it("rejects repeats when the group does not allow them", () => {
    const config: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [group("g", { maxSelect: 3, options: [option("a"), option("b")] })],
    };
    const r = validateSelection(config, [{ optionId: "a", quantity: 2 }]);
    expect(r.errors.map((e) => e.code)).toContain("REPEAT_NOT_ALLOWED");
  });

  it("enforces maxPerOption", () => {
    const config: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [
        group("g", {
          allowRepeat: true,
          maxPerOption: 2,
          options: [option("a"), option("b")],
        }),
      ],
    };
    expect(
      validateSelection(config, [{ optionId: "a", quantity: 3 }]).errors.map(
        (e) => e.code,
      ),
    ).toContain("MAX_PER_OPTION");
    expect(validateSelection(config, [{ optionId: "a", quantity: 2 }]).valid).toBe(
      true,
    );
  });

  it("optional groups accept empty selection", () => {
    const config: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [group("extras", { maxSelect: 2, options: [option("queso")] })],
    };
    expect(validateSelection(config, []).valid).toBe(true);
  });
});

describe("validateSelection — tier modes", () => {
  const tiered = (mode: "EXACT" | "ROUND_UP" | "RANGE", tiers: { quantityFrom: number; quantityTo: number | null; price: number }[]) =>
    ({
      layout: "SCROLL",
      deductBase: true,
      groups: [
        group("g", {
          name: "Tacos",
          minSelect: 1,
          maxSelect: 6,
          allowRepeat: true,
          pricingMode: "TIERED",
          tierMatchMode: mode,
          tiers,
          options: [option("a")],
        }),
      ],
    }) as MenuItemCustomization;

  it("EXACT blocks quantities without tier", () => {
    const c = tiered("EXACT", [
      { quantityFrom: 3, quantityTo: null, price: 120 },
      { quantityFrom: 5, quantityTo: null, price: 190 },
    ]);
    expect(validateSelection(c, [{ optionId: "a", quantity: 4 }]).errors[0].code).toBe(
      "NO_TIER",
    );
    expect(validateSelection(c, [{ optionId: "a", quantity: 5 }]).valid).toBe(true);
  });

  it("ROUND_UP allows in-between and blocks above top tier", () => {
    const c = tiered("ROUND_UP", [
      { quantityFrom: 3, quantityTo: null, price: 120 },
      { quantityFrom: 5, quantityTo: null, price: 190 },
    ]);
    expect(validateSelection(c, [{ optionId: "a", quantity: 4 }]).valid).toBe(true);
    expect(validateSelection(c, [{ optionId: "a", quantity: 6 }]).errors[0].code).toBe(
      "NO_TIER",
    );
  });

  it("RANGE allows quantities inside ranges only", () => {
    const c = tiered("RANGE", [
      { quantityFrom: 3, quantityTo: 4, price: 120 },
      { quantityFrom: 5, quantityTo: 6, price: 190 },
    ]);
    expect(validateSelection(c, [{ optionId: "a", quantity: 4 }]).valid).toBe(true);
    expect(validateSelection(c, [{ optionId: "a", quantity: 2 }]).valid).toBe(false);
  });
});

describe("applyOptionChange / toggleOption / canIncrementOption", () => {
  it("increments up to group max and stops", () => {
    const config = tacosMixtos();
    const g = getActiveGroups(config)[0];
    const pastor = g.options.find((o) => o.id === "pastor")!;
    let sel = applyOptionChange(g, pastor, [], 1);
    sel = applyOptionChange(g, pastor, sel, 1);
    sel = applyOptionChange(g, pastor, sel, 1);
    expect(sel).toEqual([{ optionId: "pastor", quantity: 3 }]);
    expect(canIncrementOption(g, pastor, sel)).toBe(false);
    expect(applyOptionChange(g, pastor, sel, 1)).toBe(sel);
    sel = applyOptionChange(g, pastor, sel, -1);
    expect(sel).toEqual([{ optionId: "pastor", quantity: 2 }]);
  });

  it("decrement on zero is a no-op", () => {
    const g = getActiveGroups(tacosMixtos())[0];
    const sel: { optionId: string; quantity: number }[] = [];
    expect(applyOptionChange(g, g.options[0], sel, -1)).toBe(sel);
  });

  it("radio groups replace the previous choice", () => {
    const g = group("salsa", {
      minSelect: 1,
      maxSelect: 1,
      options: [option("verde"), option("roja")],
    });
    let sel = toggleOption(g, g.options[0], []);
    expect(sel).toEqual([{ optionId: "verde", quantity: 1 }]);
    sel = toggleOption(g, g.options[1], sel);
    expect(sel).toEqual([{ optionId: "roja", quantity: 1 }]);
    sel = toggleOption(g, g.options[1], sel);
    expect(sel).toEqual([]);
  });

  it("checkbox groups toggle and respect max", () => {
    const g = group("extras", {
      maxSelect: 1,
      allowRepeat: false,
      options: [option("a"), option("b")],
    });
    // maxSelect 1 sin repetición = radio
    let sel = toggleOption(g, g.options[0], []);
    sel = toggleOption(g, g.options[1], sel);
    expect(sel).toEqual([{ optionId: "b", quantity: 1 }]);

    const g2 = group("extras2", {
      maxSelect: 2,
      options: [option("a"), option("b"), option("c")],
    });
    let s2 = toggleOption(g2, g2.options[0], []);
    s2 = toggleOption(g2, g2.options[1], s2);
    const blocked = toggleOption(g2, g2.options[2], s2);
    expect(blocked).toBe(s2);
  });

  it("cannot select DISABLE out-of-stock options", () => {
    const g = group("g", {
      options: [option("a", { isOutOfStock: true })],
    });
    expect(canIncrementOption(g, g.options[0], [])).toBe(false);
    expect(applyOptionChange(g, g.options[0], [], 1)).toEqual([]);
  });
});

describe("getGroupStatus", () => {
  it("reports missing units and tier problems", () => {
    const g = getActiveGroups(tacosMixtos())[0];
    expect(getGroupStatus(g, [{ optionId: "a", quantity: 0 }])).toMatchObject({
      satisfied: false,
      reason: "Faltan 3 en Elige tus tacos",
    });
    expect(
      getGroupStatus(g, [{ optionId: "pastor", quantity: 3 }]).satisfied,
    ).toBe(true);
  });
});

describe("getDefaultSelections", () => {
  it("preselects required groups with a single selectable option", () => {
    const config: MenuItemCustomization = {
      layout: "SCROLL",
      deductBase: true,
      groups: [
        group("salsa", { minSelect: 1, maxSelect: 1, options: [option("verde")] }),
        group("tacos", { minSelect: 3, allowRepeat: true, options: [option("x"), option("y")] }),
      ],
    };
    expect(getDefaultSelections(config)).toEqual([
      { optionId: "verde", quantity: 1 },
    ]);
  });
});
