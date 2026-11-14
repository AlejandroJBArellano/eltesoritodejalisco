import type {
  CustomizationGroup,
  CustomizationOption,
  MenuItemCustomization,
  Selection,
  SelectionError,
  SelectionValidationResult,
} from "./types";
import { resolveTier } from "./tiers";

/** Grupos activos, ordenados como se muestran en el modal. */
export function getActiveGroups(
  customization: MenuItemCustomization | null | undefined,
): CustomizationGroup[] {
  if (!customization) return [];
  return customization.groups
    .filter((g) => g.isActive)
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
      ...g,
      options: g.options
        .filter((o) => o.isActive)
        .slice()
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
}

/** Un producto abre el modal si tiene al menos un grupo activo con opciones. */
export function hasCustomization(
  customization: MenuItemCustomization | null | undefined,
): boolean {
  return getActiveGroups(customization).some((g) => g.options.length > 0);
}

/**
 * Une ids repetidos, descarta cantidades ≤ 0 o no enteras y ordena por id.
 * El orden estable permite comparar selecciones y generar claves.
 */
export function normalizeSelections(
  selections: Selection[] | null | undefined,
): Selection[] {
  const map = new Map<string, number>();
  for (const s of selections || []) {
    if (!s || typeof s.optionId !== "string" || !s.optionId) continue;
    const qty = Number(s.quantity);
    if (!Number.isFinite(qty) || qty <= 0) continue;
    map.set(s.optionId, (map.get(s.optionId) || 0) + Math.floor(qty));
  }
  return Array.from(map.entries())
    .filter(([, q]) => q > 0)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))
    .map(([optionId, quantity]) => ({ optionId, quantity }));
}

export function selectionsEqual(a: Selection[], b: Selection[]): boolean {
  const na = normalizeSelections(a);
  const nb = normalizeSelections(b);
  if (na.length !== nb.length) return false;
  return na.every(
    (s, i) => s.optionId === nb[i].optionId && s.quantity === nb[i].quantity,
  );
}

function buildOptionIndex(groups: CustomizationGroup[]) {
  const index = new Map<
    string,
    { group: CustomizationGroup; option: CustomizationOption }
  >();
  for (const group of groups) {
    for (const option of group.options) {
      index.set(option.id, { group, option });
    }
  }
  return index;
}

export function getGroupQuantity(
  group: CustomizationGroup,
  selections: Selection[],
): number {
  const ids = new Set(group.options.map((o) => o.id));
  return selections.reduce(
    (sum, s) => (ids.has(s.optionId) ? sum + (Number(s.quantity) || 0) : sum),
    0,
  );
}

export function getOptionQuantity(
  optionId: string,
  selections: Selection[],
): number {
  return selections.reduce(
    (sum, s) => (s.optionId === optionId ? sum + (Number(s.quantity) || 0) : sum),
    0,
  );
}

/** Tope efectivo de unidades para una opción dentro de su grupo. */
export function getOptionCap(group: CustomizationGroup): number {
  if (!group.allowRepeat) return 1;
  if (group.maxPerOption != null && group.maxPerOption > 0) {
    return group.maxPerOption;
  }
  return Number.POSITIVE_INFINITY;
}

export function isOptionSelectable(option: CustomizationOption): boolean {
  return (
    option.isActive &&
    !(option.isOutOfStock && option.outOfStockBehavior === "DISABLE")
  );
}

/**
 * ¿Se puede sumar una unidad más de esta opción?
 * Para grupos de una sola elección (radio), siempre se puede: reemplaza.
 */
export function canIncrementOption(
  group: CustomizationGroup,
  option: CustomizationOption,
  selections: Selection[],
): boolean {
  if (!isOptionSelectable(option)) return false;
  const current = getOptionQuantity(option.id, selections);
  if (current >= getOptionCap(group)) return false;
  if (isSingleChoice(group)) return true;
  const total = getGroupQuantity(group, selections);
  if (group.maxSelect != null && total >= group.maxSelect) return false;
  return true;
}

/** Radio: sin repetición y máximo 1. */
export function isSingleChoice(group: CustomizationGroup): boolean {
  return !group.allowRepeat && group.maxSelect === 1;
}

/**
 * Aplica +1/−1 (o toggle) a una opción respetando las reglas del grupo.
 * Devuelve la nueva lista normalizada; si el cambio no procede, la original.
 */
export function applyOptionChange(
  group: CustomizationGroup,
  option: CustomizationOption,
  selections: Selection[],
  delta: 1 | -1,
): Selection[] {
  const current = getOptionQuantity(option.id, selections);
  if (delta === -1) {
    if (current <= 0) return selections;
    return normalizeSelections(
      selections.map((s) =>
        s.optionId === option.id ? { ...s, quantity: s.quantity - 1 } : s,
      ),
    );
  }
  if (!isOptionSelectable(option)) return selections;
  if (isSingleChoice(group)) {
    const groupIds = new Set(group.options.map((o) => o.id));
    if (current > 0) return selections;
    return normalizeSelections([
      ...selections.filter((s) => !groupIds.has(s.optionId)),
      { optionId: option.id, quantity: 1 },
    ]);
  }
  if (!canIncrementOption(group, option, selections)) return selections;
  return normalizeSelections([
    ...selections,
    { optionId: option.id, quantity: 1 },
  ]);
}

/** Alterna una opción de checkbox/radio (sin repetición). */
export function toggleOption(
  group: CustomizationGroup,
  option: CustomizationOption,
  selections: Selection[],
): Selection[] {
  const current = getOptionQuantity(option.id, selections);
  return applyOptionChange(group, option, selections, current > 0 ? -1 : 1);
}

export interface GroupStatus {
  quantity: number;
  satisfied: boolean;
  /** Razón visible cuando no está satisfecho. */
  reason: string | null;
}

export function getGroupStatus(
  group: CustomizationGroup,
  selections: Selection[],
): GroupStatus {
  const quantity = getGroupQuantity(group, selections);
  if (quantity < group.minSelect) {
    const missing = group.minSelect - quantity;
    return {
      quantity,
      satisfied: false,
      reason: `Faltan ${missing} en ${group.name}`,
    };
  }
  if (group.maxSelect != null && quantity > group.maxSelect) {
    return {
      quantity,
      satisfied: false,
      reason: `Máximo ${group.maxSelect} en ${group.name}`,
    };
  }
  if (group.pricingMode === "TIERED" && quantity > 0) {
    const { allowed } = resolveTier(group, quantity);
    if (!allowed) {
      return {
        quantity,
        satisfied: false,
        reason: describeAllowedQuantities(group),
      };
    }
  }
  return { quantity, satisfied: true, reason: null };
}

/** Texto de ayuda para grupos por niveles con cantidades no permitidas. */
export function describeAllowedQuantities(group: CustomizationGroup): string {
  const tiers = group.tiers
    .slice()
    .sort((a, b) => a.quantityFrom - b.quantityFrom);
  if (group.tierMatchMode === "RANGE") {
    const ranges = tiers.map((t) =>
      t.quantityTo == null
        ? `${t.quantityFrom}+`
        : t.quantityTo === t.quantityFrom
          ? `${t.quantityFrom}`
          : `${t.quantityFrom}–${t.quantityTo}`,
    );
    return `En ${group.name} elige ${ranges.join(", ")} piezas`;
  }
  if (group.tierMatchMode === "ROUND_UP") {
    const top = tiers[tiers.length - 1]?.quantityFrom;
    return `En ${group.name} elige máximo ${top ?? 0} piezas`;
  }
  return `En ${group.name} elige ${tiers.map((t) => t.quantityFrom).join(" o ")} piezas`;
}

/** Valida una selección completa contra la configuración (cliente y servidor). */
export function validateSelection(
  customization: MenuItemCustomization | null | undefined,
  rawSelections: Selection[] | null | undefined,
): SelectionValidationResult {
  const errors: SelectionError[] = [];
  const groups = getActiveGroups(customization);
  const selections = normalizeSelections(rawSelections);

  // Cantidades inválidas en la entrada original (antes de normalizar)
  for (const s of rawSelections || []) {
    const qty = Number(s?.quantity);
    if (!Number.isFinite(qty) || qty <= 0 || Math.floor(qty) !== qty) {
      errors.push({
        optionId: s?.optionId,
        code: "INVALID_QUANTITY",
        message: "Cantidad inválida en la personalización",
      });
    }
  }

  // Índice con TODAS las opciones (incluye inactivas) para dar mejor error
  const allIndex = buildOptionIndex(customization?.groups || []);
  const activeIndex = buildOptionIndex(groups);

  for (const s of selections) {
    const active = activeIndex.get(s.optionId);
    if (!active) {
      const any = allIndex.get(s.optionId);
      errors.push({
        optionId: s.optionId,
        groupId: any?.group.id,
        code: any ? "INACTIVE_OPTION" : "UNKNOWN_OPTION",
        message: any
          ? `La opción "${any.option.name}" ya no está disponible`
          : "Opción de personalización desconocida",
      });
      continue;
    }
    const { group, option } = active;
    if (option.isOutOfStock && option.outOfStockBehavior === "DISABLE") {
      errors.push({
        optionId: option.id,
        groupId: group.id,
        code: "OUT_OF_STOCK",
        message: `"${option.name}" está agotado`,
      });
    }
    if (!group.allowRepeat && s.quantity > 1) {
      errors.push({
        optionId: option.id,
        groupId: group.id,
        code: "REPEAT_NOT_ALLOWED",
        message: `"${option.name}" no se puede repetir en ${group.name}`,
      });
    } else if (
      group.allowRepeat &&
      group.maxPerOption != null &&
      group.maxPerOption > 0 &&
      s.quantity > group.maxPerOption
    ) {
      errors.push({
        optionId: option.id,
        groupId: group.id,
        code: "MAX_PER_OPTION",
        message: `Máximo ${group.maxPerOption} de "${option.name}"`,
      });
    }
  }

  for (const group of groups) {
    const quantity = getGroupQuantity(group, selections);
    if (quantity < group.minSelect) {
      errors.push({
        groupId: group.id,
        code: "BELOW_MIN",
        message: `Faltan ${group.minSelect - quantity} en ${group.name}`,
      });
      continue;
    }
    if (group.maxSelect != null && quantity > group.maxSelect) {
      errors.push({
        groupId: group.id,
        code: "ABOVE_MAX",
        message: `Máximo ${group.maxSelect} en ${group.name}`,
      });
      continue;
    }
    if (group.pricingMode === "TIERED" && quantity > 0) {
      const { allowed } = resolveTier(group, quantity);
      if (!allowed) {
        errors.push({
          groupId: group.id,
          code: "NO_TIER",
          message: describeAllowedQuantities(group),
        });
      }
    }
  }

  return { valid: errors.length === 0, errors };
}

/** Selección inicial: radios obligatorios con una sola opción quedan marcados. */
export function getDefaultSelections(
  customization: MenuItemCustomization | null | undefined,
): Selection[] {
  const result: Selection[] = [];
  for (const group of getActiveGroups(customization)) {
    const selectable = group.options.filter(isOptionSelectable);
    if (
      group.minSelect >= 1 &&
      selectable.length === 1 &&
      (isSingleChoice(group) || group.minSelect === 1)
    ) {
      result.push({ optionId: selectable[0].id, quantity: 1 });
    }
  }
  return normalizeSelections(result);
}
