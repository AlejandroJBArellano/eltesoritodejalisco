import type {
  CustomizationGroup,
  CustomizationTier,
  MenuItemCustomization,
} from "./types";
import { getEffectiveOptionPrice, roundMoney } from "./pricing";
import { resolveTier } from "./tiers";

export interface ConfigIssue {
  level: "error" | "warning";
  groupIndex?: number;
  optionIndex?: number;
  message: string;
}

const isInt = (n: unknown): n is number =>
  typeof n === "number" && Number.isInteger(n);

function groupLabel(group: CustomizationGroup, index: number) {
  return group.name.trim() ? `"${group.name.trim()}"` : `#${index + 1}`;
}

function validateTiers(
  group: CustomizationGroup,
  gi: number,
  issues: ConfigIssue[],
) {
  const label = groupLabel(group, gi);
  if (!group.tierMatchMode) {
    issues.push({
      level: "error",
      groupIndex: gi,
      message: `El grupo ${label} cobra por cantidad pero no tiene modo de niveles`,
    });
  }
  if (group.tiers.length === 0) {
    issues.push({
      level: "error",
      groupIndex: gi,
      message: `El grupo ${label} cobra por cantidad pero no tiene niveles`,
    });
    return;
  }

  const tiers = group.tiers
    .slice()
    .sort((a, b) => a.quantityFrom - b.quantityFrom);
  const minQ = Math.max(1, group.minSelect);
  const maxQ = group.maxSelect;

  for (const t of tiers) {
    if (!isInt(t.quantityFrom) || t.quantityFrom < 1) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: `Los niveles de ${label} deben iniciar en 1 pieza o más`,
      });
    }
    if (!(Number(t.price) >= 0)) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: `Los niveles de ${label} no pueden tener precio negativo`,
      });
    }
    if (group.tierMatchMode === "RANGE" && t.quantityTo != null) {
      if (!isInt(t.quantityTo) || t.quantityTo < t.quantityFrom) {
        issues.push({
          level: "error",
          groupIndex: gi,
          message: `En ${label} el rango ${t.quantityFrom}–${t.quantityTo} es inválido`,
        });
      }
    }
    if (t.quantityFrom < minQ) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: `En ${label} el nivel de ${t.quantityFrom} pzas queda debajo del mínimo (${group.minSelect})`,
      });
    }
    const upper =
      group.tierMatchMode === "RANGE" ? t.quantityTo : t.quantityFrom;
    if (maxQ != null && (upper == null || upper > maxQ)) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: `En ${label} el nivel de ${t.quantityFrom}${upper == null ? "+" : upper !== t.quantityFrom ? `–${upper}` : ""} pzas supera el máximo (${maxQ})`,
      });
    }
  }

  // Duplicados / traslapes
  if (group.tierMatchMode === "RANGE") {
    for (let i = 1; i < tiers.length; i++) {
      const prev = tiers[i - 1];
      const cur = tiers[i];
      const prevTo = prev.quantityTo ?? Number.POSITIVE_INFINITY;
      if (cur.quantityFrom <= prevTo) {
        issues.push({
          level: "error",
          groupIndex: gi,
          message: `En ${label} los rangos se traslapan (${prev.quantityFrom}${prev.quantityTo == null ? "+" : `–${prev.quantityTo}`} y ${cur.quantityFrom}${cur.quantityTo == null ? "+" : `–${cur.quantityTo}`})`,
        });
      }
    }
  } else {
    const seen = new Set<number>();
    for (const t of tiers) {
      if (seen.has(t.quantityFrom)) {
        issues.push({
          level: "error",
          groupIndex: gi,
          message: `En ${label} hay dos niveles de ${t.quantityFrom} pzas`,
        });
      }
      seen.add(t.quantityFrom);
    }
  }

  // ¿Hay al menos una cantidad válida dentro de [mín, máx]?
  const upperBound = Math.min(
    maxQ ?? Number.POSITIVE_INFINITY,
    capacityOf(group),
    200,
  );
  let reachable = false;
  for (let q = minQ; q <= upperBound; q++) {
    if (resolveTier(group, q).allowed) {
      reachable = true;
      break;
    }
  }
  if (!reachable) {
    issues.push({
      level: "error",
      groupIndex: gi,
      message: `En ${label} ningún nivel se puede alcanzar con las reglas de mínimo/máximo`,
    });
  }

  if (group.tierMatchMode === "ROUND_UP" && maxQ != null) {
    const top = tiers[tiers.length - 1].quantityFrom;
    if (top < maxQ) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: `En ${label} el nivel mayor (${top}) debe cubrir el máximo (${maxQ}) al redondear hacia arriba`,
      });
    }
  }
}

function activeOptionsOf(group: CustomizationGroup) {
  return group.options.filter((o) => o.isActive);
}

function capacityOf(group: CustomizationGroup): number {
  const count = activeOptionsOf(group).length;
  if (!group.allowRepeat) return count;
  if (group.maxPerOption != null && group.maxPerOption > 0) {
    return count * group.maxPerOption;
  }
  return count > 0 ? Number.POSITIVE_INFINITY : 0;
}

/**
 * Reglas que bloquean el guardado (errores) y avisos no bloqueantes.
 * `menuItemId` permite detectar opciones enlazadas al mismo producto.
 */
export function validateCustomizationConfig(
  config: MenuItemCustomization,
  menuItemId?: string,
): ConfigIssue[] {
  const issues: ConfigIssue[] = [];

  config.groups.forEach((group, gi) => {
    const label = groupLabel(group, gi);
    if (!group.name.trim()) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: `El grupo #${gi + 1} necesita nombre`,
      });
    }
    if (!isInt(group.minSelect) || group.minSelect < 0) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: `El mínimo de ${label} debe ser un entero ≥ 0`,
      });
    }
    if (
      group.maxSelect != null &&
      (!isInt(group.maxSelect) || group.maxSelect < 1)
    ) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: `El máximo de ${label} debe ser un entero ≥ 1 o quedar vacío`,
      });
    }
    if (group.maxSelect != null && group.minSelect > group.maxSelect) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: `El grupo ${label} tiene un mínimo (${group.minSelect}) mayor al máximo (${group.maxSelect})`,
      });
    }
    if (group.allowRepeat && group.maxPerOption != null) {
      if (!isInt(group.maxPerOption) || group.maxPerOption < 1) {
        issues.push({
          level: "error",
          groupIndex: gi,
          message: `El máximo por opción de ${label} debe ser un entero ≥ 1`,
        });
      }
    }

    const activeOptions = activeOptionsOf(group);
    if (group.isActive && activeOptions.length === 0) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: `El grupo ${label} no tiene opciones activas`,
      });
    }

    const capacity = capacityOf(group);
    if (group.isActive && activeOptions.length > 0 && group.minSelect > capacity) {
      issues.push({
        level: "error",
        groupIndex: gi,
        message: group.allowRepeat
          ? `El grupo ${label} requiere ${group.minSelect} piezas pero el tope por opción solo permite ${capacity}`
          : `El grupo ${label} requiere al menos ${group.minSelect} opciones distintas, pero solo tiene ${activeOptions.length} activas`,
      });
    }
    if (
      group.isActive &&
      !group.allowRepeat &&
      group.maxSelect != null &&
      group.maxSelect > activeOptions.length &&
      activeOptions.length > 0
    ) {
      issues.push({
        level: "warning",
        groupIndex: gi,
        message: `El máximo de ${label} (${group.maxSelect}) es mayor que sus opciones activas (${activeOptions.length})`,
      });
    }

    if (group.pricingMode === "TIERED") {
      validateTiers(group, gi, issues);
    }

    const names = new Set<string>();
    group.options.forEach((option, oi) => {
      const optLabel = option.name.trim() || `#${oi + 1}`;
      if (!option.name.trim()) {
        issues.push({
          level: "error",
          groupIndex: gi,
          optionIndex: oi,
          message: `La opción #${oi + 1} de ${label} necesita nombre`,
        });
      }
      const lower = option.name.trim().toLowerCase();
      if (lower && names.has(lower)) {
        issues.push({
          level: "warning",
          groupIndex: gi,
          optionIndex: oi,
          message: `La opción "${optLabel}" está repetida en ${label}`,
        });
      }
      names.add(lower);
      if (!(Number(option.priceDelta) >= 0)) {
        issues.push({
          level: "error",
          groupIndex: gi,
          optionIndex: oi,
          message: `"${optLabel}" no puede tener precio negativo`,
        });
      }
      if (option.priceSource === "LINKED_PRODUCT" && !option.linkedMenuItemId) {
        issues.push({
          level: "error",
          groupIndex: gi,
          optionIndex: oi,
          message: `"${optLabel}" usa el precio del producto enlazado pero no tiene producto`,
        });
      }
      if (menuItemId && option.linkedMenuItemId === menuItemId) {
        issues.push({
          level: "error",
          groupIndex: gi,
          optionIndex: oi,
          message: `"${optLabel}" no puede enlazarse al mismo producto`,
        });
      }
      if (option.linkedMenuItemId && option.recipe.length > 0) {
        issues.push({
          level: "error",
          groupIndex: gi,
          optionIndex: oi,
          message: `"${optLabel}" debe usar producto enlazado o receta propia, no ambos`,
        });
      }
      option.recipe.forEach((r) => {
        if (!r.ingredientId) {
          issues.push({
            level: "error",
            groupIndex: gi,
            optionIndex: oi,
            message: `La receta de "${optLabel}" tiene un ingrediente sin elegir`,
          });
        }
        if (!(Number(r.quantityRequired) > 0)) {
          issues.push({
            level: "error",
            groupIndex: gi,
            optionIndex: oi,
            message: `La receta de "${optLabel}" necesita cantidades mayores a 0`,
          });
        }
      });
      const ingredientIds = option.recipe.map((r) => r.ingredientId).filter(Boolean);
      if (new Set(ingredientIds).size !== ingredientIds.length) {
        issues.push({
          level: "error",
          groupIndex: gi,
          optionIndex: oi,
          message: `La receta de "${optLabel}" repite un ingrediente`,
        });
      }
    });
  });

  return issues;
}

export function hasBlockingIssues(issues: ConfigIssue[]): boolean {
  return issues.some((i) => i.level === "error");
}

/** Costo mínimo/máximo de llenar `q` unidades con el tope por opción. */
function fillCost(prices: number[], q: number, cap: number, cheapest: boolean) {
  const sorted = prices.slice().sort((a, b) => (cheapest ? a - b : b - a));
  let remaining = q;
  let cost = 0;
  for (const p of sorted) {
    if (remaining <= 0) break;
    const take = Math.min(remaining, cap);
    cost += p * take;
    remaining -= take;
  }
  return remaining > 0 ? null : cost;
}

export interface PriceRange {
  min: number | null;
  /** null = sin límite superior (repetición sin máximo). */
  max: number | null;
}

/** Rango estimado de precio del platillo para la vista previa del admin. */
export function computePriceRange(
  basePrice: number,
  config: MenuItemCustomization,
): PriceRange {
  let min = Math.max(0, Number(basePrice) || 0);
  let max: number | null = min;

  for (const group of config.groups) {
    if (!group.isActive) continue;
    const options = activeOptionsOf(group);
    if (options.length === 0) continue;
    const prices = options.map(getEffectiveOptionPrice);
    const cap = group.allowRepeat
      ? group.maxPerOption != null && group.maxPerOption > 0
        ? group.maxPerOption
        : Number.POSITIVE_INFINITY
      : 1;
    const capacity = capacityOf(group);
    const hardMax = Math.min(group.maxSelect ?? Number.POSITIVE_INFINITY, capacity);
    const unbounded = !Number.isFinite(hardMax);

    let tierBound = Number.POSITIVE_INFINITY;
    if (group.pricingMode === "TIERED") {
      const ts: CustomizationTier[] = group.tiers;
      if (group.tierMatchMode === "RANGE") {
        tierBound = ts.some((t) => t.quantityTo == null)
          ? Number.POSITIVE_INFINITY
          : Math.max(0, ...ts.map((t) => t.quantityTo ?? 0));
      } else {
        tierBound = Math.max(0, ...ts.map((t) => t.quantityFrom));
      }
    }
    const upper = Math.min(hardMax, tierBound);
    const enumerateTo = Number.isFinite(upper) ? upper : group.minSelect + 50;

    let gMin: number | null = null;
    let gMax: number | null = null;
    for (let q = group.minSelect; q <= enumerateTo; q++) {
      const tier = resolveTier(group, q);
      if (!tier.allowed) continue;
      const low = fillCost(prices, q, cap, true);
      const high = fillCost(prices, q, cap, false);
      if (low == null || high == null) continue;
      const lo = tier.price + low;
      const hi = tier.price + high;
      gMin = gMin == null ? lo : Math.min(gMin, lo);
      gMax = gMax == null ? hi : Math.max(gMax, hi);
    }
    if (gMin == null) return { min: null, max: null };
    min += gMin;
    const isOpen =
      (unbounded || !Number.isFinite(upper)) && prices.some((p) => p > 0);
    if (max != null) max = isOpen ? null : max + (gMax ?? 0);
  }

  return { min: roundMoney(min), max: max == null ? null : roundMoney(max) };
}

/** Configuración vacía por defecto para un producto sin personalización. */
export function emptyCustomization(): MenuItemCustomization {
  return { layout: "SCROLL", deductBase: true, groups: [] };
}
