import type {
  CustomizationOption,
  MenuItemCustomization,
  PricedGroupTier,
  PricedOption,
  Selection,
  SelectionPrice,
  SelectionSnapshotLine,
} from "./types";
import {
  getActiveGroups,
  getGroupQuantity,
  normalizeSelections,
} from "./selection";
import { resolveTier } from "./tiers";

export { resolveTier } from "./tiers";

export const roundMoney = (n: number): number =>
  Math.round((Number(n) || 0) * 100) / 100;

/** Precio por unidad de una opción según su origen. */
export function getEffectiveOptionPrice(option: CustomizationOption): number {
  if (option.priceSource === "LINKED_PRODUCT") {
    return Math.max(0, Number(option.linkedMenuItemPrice) || 0);
  }
  return Math.max(0, Number(option.priceDelta) || 0);
}

/**
 * Calcula el precio unitario del renglón:
 *   base + Σ niveles (grupos TIERED) + Σ precio efectivo × cantidad de cada opción.
 * Las opciones desconocidas se ignoran (validateSelection las rechaza aparte).
 */
export function priceSelection(
  basePrice: number,
  customization: MenuItemCustomization | null | undefined,
  rawSelections: Selection[] | null | undefined,
): SelectionPrice {
  const base = Math.max(0, Number(basePrice) || 0);
  const selections = normalizeSelections(rawSelections);
  const groups = getActiveGroups(customization);

  const options: PricedOption[] = [];
  const tiers: PricedGroupTier[] = [];
  let optionsTotal = 0;
  let tiersTotal = 0;

  for (const group of groups) {
    const byId = new Map(group.options.map((o) => [o.id, o]));
    for (const s of selections) {
      const option = byId.get(s.optionId);
      if (!option) continue;
      const unitPrice = getEffectiveOptionPrice(option);
      optionsTotal += unitPrice * s.quantity;
      options.push({
        optionId: option.id,
        groupId: group.id,
        quantity: s.quantity,
        unitPrice: roundMoney(unitPrice),
      });
    }

    if (group.pricingMode === "TIERED") {
      const quantity = getGroupQuantity(group, selections);
      const { tier, price } = resolveTier(group, quantity);
      if (tier) {
        tiersTotal += price;
        tiers.push({
          groupId: group.id,
          groupName: group.name,
          quantity,
          price: roundMoney(price),
        });
      }
    }
  }

  optionsTotal = roundMoney(optionsTotal);
  tiersTotal = roundMoney(tiersTotal);

  return {
    basePrice: roundMoney(base),
    tiersTotal,
    optionsTotal,
    unitPrice: roundMoney(base + tiersTotal + optionsTotal),
    options,
    tiers,
  };
}

/** Copia congelada de las opciones elegidas, en el orden del modal. */
export function buildSelectionSnapshot(
  customization: MenuItemCustomization | null | undefined,
  rawSelections: Selection[] | null | undefined,
): SelectionSnapshotLine[] {
  const selections = normalizeSelections(rawSelections);
  const qtyById = new Map(selections.map((s) => [s.optionId, s.quantity]));
  const lines: SelectionSnapshotLine[] = [];
  for (const group of getActiveGroups(customization)) {
    for (const option of group.options) {
      const quantity = qtyById.get(option.id);
      if (!quantity) continue;
      lines.push({
        optionId: option.id,
        groupId: group.id,
        groupName: group.name,
        optionName: option.name,
        quantity,
        unitPrice: roundMoney(getEffectiveOptionPrice(option)),
        groupSort: group.sortOrder,
        optionSort: option.sortOrder,
      });
    }
  }
  return lines;
}

/**
 * Precio que se usa como base del descuento por artículo.
 * Con `includeModifiers=false` el descuento solo aplica sobre el precio base.
 */
export function getDiscountBasePrice(
  price: Pick<SelectionPrice, "basePrice" | "unitPrice">,
  includeModifiers: boolean,
): number {
  return includeModifiers ? price.unitPrice : price.basePrice;
}
