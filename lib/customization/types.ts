/**
 * Personalización de platillos — tipos de dominio.
 *
 * Este módulo es PURO (sin React, sin Supabase, sin alias "@/") para poder
 * copiarse tal cual a kittn-pickup. Ver docs/PERSONALIZACION_PLATILLOS.md.
 */

export type PricingMode = "ADDITIVE" | "TIERED";
export type TierMatchMode = "EXACT" | "ROUND_UP" | "RANGE";
export type PriceSource = "CUSTOM" | "LINKED_PRODUCT";
export type OutOfStockBehavior = "DISABLE" | "ALLOW";
export type CustomizationLayout = "SCROLL" | "WIZARD";

export const PRICING_MODES: PricingMode[] = ["ADDITIVE", "TIERED"];
export const TIER_MATCH_MODES: TierMatchMode[] = ["EXACT", "ROUND_UP", "RANGE"];
export const PRICE_SOURCES: PriceSource[] = ["CUSTOM", "LINKED_PRODUCT"];
export const OUT_OF_STOCK_BEHAVIORS: OutOfStockBehavior[] = ["DISABLE", "ALLOW"];
export const CUSTOMIZATION_LAYOUTS: CustomizationLayout[] = ["SCROLL", "WIZARD"];

export interface CustomizationTier {
  quantityFrom: number;
  /** null = rango abierto (solo aplica a RANGE). */
  quantityTo: number | null;
  price: number;
}

export interface OptionRecipeItem {
  ingredientId: string;
  quantityRequired: number;
}

export interface CustomizationOption {
  id: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  priceSource: PriceSource;
  priceDelta: number;
  linkedMenuItemId: string | null;
  /** Precio actual del producto enlazado (resuelto al leer). */
  linkedMenuItemPrice?: number | null;
  linkedMenuItemName?: string | null;
  deductLinkedInventory: boolean;
  outOfStockBehavior: OutOfStockBehavior;
  recipe: OptionRecipeItem[];
  /** Calculado en el servidor al leer el menú. */
  isOutOfStock?: boolean;
}

export interface CustomizationGroup {
  id: string;
  name: string;
  sortOrder: number;
  minSelect: number;
  /** null = sin límite. */
  maxSelect: number | null;
  allowRepeat: boolean;
  /** Solo con allowRepeat. null = sin tope por opción. */
  maxPerOption: number | null;
  pricingMode: PricingMode;
  tierMatchMode: TierMatchMode | null;
  isActive: boolean;
  tiers: CustomizationTier[];
  options: CustomizationOption[];
}

export interface MenuItemCustomization {
  layout: CustomizationLayout;
  deductBase: boolean;
  groups: CustomizationGroup[];
}

/** Lo que elige el cliente: unidades por opción (por unidad del renglón). */
export interface Selection {
  optionId: string;
  quantity: number;
}

export interface SelectionError {
  groupId?: string;
  optionId?: string;
  code:
    | "UNKNOWN_OPTION"
    | "INACTIVE_OPTION"
    | "OUT_OF_STOCK"
    | "INVALID_QUANTITY"
    | "REPEAT_NOT_ALLOWED"
    | "MAX_PER_OPTION"
    | "BELOW_MIN"
    | "ABOVE_MAX"
    | "NO_TIER";
  message: string;
}

export interface SelectionValidationResult {
  valid: boolean;
  errors: SelectionError[];
}

export interface PricedOption {
  optionId: string;
  groupId: string;
  quantity: number;
  /** Precio efectivo por unidad de la opción. */
  unitPrice: number;
}

export interface PricedGroupTier {
  groupId: string;
  groupName: string;
  quantity: number;
  price: number;
}

export interface SelectionPrice {
  basePrice: number;
  tiersTotal: number;
  optionsTotal: number;
  /** base + niveles + opciones, por unidad del renglón. */
  unitPrice: number;
  options: PricedOption[];
  tiers: PricedGroupTier[];
}

/** Copia congelada de lo vendido, para tickets, KDS y reportes. */
export interface SelectionSnapshotLine {
  optionId: string | null;
  groupId: string | null;
  groupName: string;
  optionName: string;
  quantity: number;
  unitPrice: number;
  groupSort: number;
  optionSort: number;
}
