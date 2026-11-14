import type {
  CustomizationGroup,
  CustomizationOption,
  MenuItemCustomization,
} from "./types";

export type IdFactory = () => string;

const defaultId: IdFactory = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : // Fallback (tests / navegadores viejos): UUID v4 con Math.random
      "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
        const r = (Math.random() * 16) | 0;
        return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
      });

export function createEmptyOption(
  sortOrder: number,
  newId: IdFactory = defaultId,
): CustomizationOption {
  return {
    id: newId(),
    name: "",
    sortOrder,
    isActive: true,
    priceSource: "CUSTOM",
    priceDelta: 0,
    linkedMenuItemId: null,
    deductLinkedInventory: true,
    outOfStockBehavior: "DISABLE",
    recipe: [],
  };
}

export function createEmptyGroup(
  sortOrder: number,
  newId: IdFactory = defaultId,
): CustomizationGroup {
  return {
    id: newId(),
    name: "",
    sortOrder,
    minSelect: 1,
    maxSelect: 1,
    allowRepeat: false,
    maxPerOption: null,
    pricingMode: "ADDITIVE",
    tierMatchMode: null,
    isActive: true,
    tiers: [],
    options: [createEmptyOption(0, newId)],
  };
}

/** Mueve un elemento y renumera sortOrder (0..n-1). */
export function moveItem<T extends { sortOrder: number }>(
  list: T[],
  index: number,
  delta: -1 | 1,
): T[] {
  const target = index + delta;
  if (target < 0 || target >= list.length) return list;
  const next = list.slice();
  [next[index], next[target]] = [next[target], next[index]];
  return next.map((item, i) => ({ ...item, sortOrder: i }));
}

/** Renumera sortOrder según la posición actual. */
export function resequence<T extends { sortOrder: number }>(list: T[]): T[] {
  return list.map((item, i) => ({ ...item, sortOrder: i }));
}

/**
 * Copia la personalización de otro producto con ids NUEVOS: después de copiar,
 * ambos productos son independientes. Las opciones enlazadas al producto
 * destino se desenlazan para no crear auto-referencias.
 */
export function cloneCustomization(
  source: MenuItemCustomization,
  targetMenuItemId: string,
  newId: IdFactory = defaultId,
): MenuItemCustomization {
  return {
    layout: source.layout,
    deductBase: source.deductBase,
    groups: resequence(
      source.groups
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder)
        .map((group) => ({
          ...group,
          id: newId(),
          tiers: group.tiers.map((t) => ({ ...t })),
          options: resequence(
            group.options
              .slice()
              .sort((a, b) => a.sortOrder - b.sortOrder)
              .map((option) => {
                const selfLink = option.linkedMenuItemId === targetMenuItemId;
                return {
                  ...option,
                  id: newId(),
                  linkedMenuItemId: selfLink ? null : option.linkedMenuItemId,
                  priceSource:
                    selfLink && option.priceSource === "LINKED_PRODUCT"
                      ? ("CUSTOM" as const)
                      : option.priceSource,
                  recipe: option.recipe.map((r) => ({ ...r })),
                  isOutOfStock: undefined,
                };
              }),
          ),
        })),
    ),
  };
}

/** Quita campos calculados por el servidor antes de guardar. */
export function toSavePayload(config: MenuItemCustomization): MenuItemCustomization {
  return {
    layout: config.layout,
    deductBase: config.deductBase,
    groups: resequence(config.groups).map((g) => ({
      id: g.id,
      name: g.name.trim(),
      sortOrder: g.sortOrder,
      minSelect: g.minSelect,
      maxSelect: g.maxSelect,
      allowRepeat: g.allowRepeat,
      maxPerOption: g.allowRepeat ? g.maxPerOption : null,
      pricingMode: g.pricingMode,
      tierMatchMode: g.pricingMode === "TIERED" ? g.tierMatchMode : null,
      isActive: g.isActive,
      tiers:
        g.pricingMode === "TIERED"
          ? g.tiers.map((t) => ({
              quantityFrom: t.quantityFrom,
              quantityTo: g.tierMatchMode === "RANGE" ? t.quantityTo : null,
              price: t.price,
            }))
          : [],
      options: resequence(g.options).map((o) => ({
        id: o.id,
        name: o.name.trim(),
        sortOrder: o.sortOrder,
        isActive: o.isActive,
        priceSource: o.linkedMenuItemId ? o.priceSource : "CUSTOM",
        priceDelta: o.priceDelta,
        linkedMenuItemId: o.linkedMenuItemId,
        deductLinkedInventory: o.deductLinkedInventory,
        outOfStockBehavior: o.outOfStockBehavior,
        recipe: o.linkedMenuItemId ? [] : o.recipe,
      })),
    })),
  };
}
