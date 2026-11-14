import type { CustomizationOption } from "./types";

export interface IngredientRequirement {
  ingredientId: string;
  /** Cantidad por UNA unidad de la opción. */
  quantity: number;
}

export interface LinkedItemInventory {
  isAvailable: boolean;
  /** Ingrediente de rastreo directo (pieza). */
  ingredientId: string | null;
  recipe: { ingredientId: string; quantityRequired: number }[];
}

/**
 * Lo que consume una unidad de la opción:
 * - Producto enlazado (con `deductLinkedInventory`): su ingrediente directo (1 pieza)
 *   o, si no tiene, su receta.
 * - Receta propia: sus ingredientes.
 * - Nada: [].
 */
export function optionInventoryPerUnit(
  option: Pick<
    CustomizationOption,
    "linkedMenuItemId" | "deductLinkedInventory" | "recipe"
  >,
  linked?: LinkedItemInventory | null,
): IngredientRequirement[] {
  if (option.linkedMenuItemId) {
    if (!option.deductLinkedInventory || !linked) return [];
    if (linked.ingredientId) {
      return [{ ingredientId: linked.ingredientId, quantity: 1 }];
    }
    return linked.recipe
      .filter((r) => r.ingredientId && Number(r.quantityRequired) > 0)
      .map((r) => ({
        ingredientId: r.ingredientId,
        quantity: Number(r.quantityRequired),
      }));
  }
  return option.recipe
    .filter((r) => r.ingredientId && Number(r.quantityRequired) > 0)
    .map((r) => ({
      ingredientId: r.ingredientId,
      quantity: Number(r.quantityRequired),
    }));
}

/**
 * Una opción está agotada si su producto enlazado no está disponible o si
 * algún ingrediente requerido no alcanza para una unidad.
 */
export function isOptionOutOfStock(
  option: Pick<
    CustomizationOption,
    "linkedMenuItemId" | "deductLinkedInventory" | "recipe"
  >,
  stockByIngredient: Map<string, number>,
  linked?: LinkedItemInventory | null,
): boolean {
  if (option.linkedMenuItemId && linked && linked.isAvailable === false) {
    return true;
  }
  // Para disponibilidad se revisa el stock del enlazado aunque no descuente.
  const reqs = option.linkedMenuItemId
    ? optionInventoryPerUnit({ ...option, deductLinkedInventory: true }, linked)
    : optionInventoryPerUnit(option, linked);
  return reqs.some((r) => {
    const stock = stockByIngredient.get(r.ingredientId);
    return stock != null && stock < r.quantity;
  });
}

export interface InventoryLineInput {
  /** Unidades del renglón (order_items.quantity). */
  itemQuantity: number;
  options: {
    /** Unidades de la opción por unidad del renglón. */
    quantity: number;
    inventory: IngredientRequirement[];
  }[];
}

/** Suma lo que consumen las opciones de varios renglones, por ingrediente. */
export function aggregateOptionRequirements(
  lines: InventoryLineInput[],
): Map<string, number> {
  const totals = new Map<string, number>();
  for (const line of lines) {
    const itemQty = Number(line.itemQuantity) || 0;
    for (const opt of line.options) {
      const optQty = Number(opt.quantity) || 0;
      for (const req of opt.inventory || []) {
        if (!req?.ingredientId) continue;
        const add = Number((req.quantity * optQty * itemQty).toFixed(4));
        if (add <= 0) continue;
        totals.set(
          req.ingredientId,
          Number(((totals.get(req.ingredientId) || 0) + add).toFixed(4)),
        );
      }
    }
  }
  return totals;
}
