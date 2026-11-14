import type { CustomizationGroup, CustomizationTier } from "./types";

export interface TierResolution {
  /** ¿La cantidad está permitida por los niveles del grupo? */
  allowed: boolean;
  tier: CustomizationTier | null;
  /** Precio del nivel cobrado (0 si no aplica). */
  price: number;
}

function sortedTiers(group: CustomizationGroup): CustomizationTier[] {
  return group.tiers
    .slice()
    .sort((a, b) => a.quantityFrom - b.quantityFrom);
}

/**
 * Resuelve el nivel que se cobra para una cantidad total de unidades.
 *
 * - EXACT: solo se permiten cantidades que coinciden con `quantityFrom`.
 * - ROUND_UP: se cobra el primer nivel con `quantityFrom` ≥ cantidad.
 * - RANGE: se cobra el nivel cuyo rango [from, to] contiene la cantidad.
 *
 * Con cantidad 0 no se cobra nivel (el mínimo del grupo lo valida aparte).
 * Para grupos ADDITIVE siempre devuelve allowed=true y precio 0.
 */
export function resolveTier(
  group: CustomizationGroup,
  quantity: number,
): TierResolution {
  if (group.pricingMode !== "TIERED") {
    return { allowed: true, tier: null, price: 0 };
  }
  if (quantity <= 0) {
    return { allowed: true, tier: null, price: 0 };
  }
  const tiers = sortedTiers(group);
  if (tiers.length === 0) {
    return { allowed: false, tier: null, price: 0 };
  }

  const mode = group.tierMatchMode || "EXACT";
  let tier: CustomizationTier | undefined;

  if (mode === "EXACT") {
    tier = tiers.find((t) => t.quantityFrom === quantity);
  } else if (mode === "ROUND_UP") {
    tier = tiers.find((t) => t.quantityFrom >= quantity);
  } else {
    tier = tiers.find(
      (t) =>
        t.quantityFrom <= quantity &&
        (t.quantityTo == null || quantity <= t.quantityTo),
    );
  }

  if (!tier) return { allowed: false, tier: null, price: 0 };
  return { allowed: true, tier, price: Number(tier.price) || 0 };
}
