import type {
  CustomizationGroup,
  CustomizationOption,
  MenuItemCustomization,
} from "../types";

export function option(
  id: string,
  overrides: Partial<CustomizationOption> = {},
): CustomizationOption {
  return {
    id,
    name: id,
    sortOrder: 0,
    isActive: true,
    priceSource: "CUSTOM",
    priceDelta: 0,
    linkedMenuItemId: null,
    deductLinkedInventory: true,
    outOfStockBehavior: "DISABLE",
    recipe: [],
    ...overrides,
  };
}

export function group(
  id: string,
  overrides: Partial<CustomizationGroup> = {},
): CustomizationGroup {
  return {
    id,
    name: id,
    sortOrder: 0,
    minSelect: 0,
    maxSelect: null,
    allowRepeat: false,
    maxPerOption: null,
    pricingMode: "ADDITIVE",
    tierMatchMode: null,
    isActive: true,
    tiers: [],
    options: [],
    ...overrides,
  };
}

/** Caso Tesorito: elige 3, repetir sí, nivel exacto 3→$120, Pastor +$10. */
export function tacosMixtos(
  overrides: Partial<CustomizationGroup> = {},
): MenuItemCustomization {
  return {
    layout: "SCROLL",
    deductBase: true,
    groups: [
      group("tacos", {
        name: "Elige tus tacos",
        minSelect: 3,
        maxSelect: 3,
        allowRepeat: true,
        pricingMode: "TIERED",
        tierMatchMode: "EXACT",
        tiers: [{ quantityFrom: 3, quantityTo: null, price: 120 }],
        options: [
          option("carnitas", { name: "Carnitas", sortOrder: 0 }),
          option("birria", { name: "Birria", sortOrder: 1 }),
          option("jamaica", { name: "Jamaica", sortOrder: 2 }),
          option("pastor", { name: "Pastor", sortOrder: 3, priceDelta: 10 }),
        ],
        ...overrides,
      }),
    ],
  };
}
