export type DiscountType = "PERCENT" | "FIXED";
export type DiscountScope = "ROW" | "UNIT";

export interface DbDiscountFields {
  discount_type?: DiscountType | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  discount_reason?: string | null;
  discount_scope?: DiscountScope | null;
}

export interface ItemDiscountInput {
  unitPrice: number;
  quantity: number;
  discountType?: DiscountType | null;
  discountValue?: number | null;
  discountScope?: DiscountScope | null;
}

export interface ItemDiscountResult {
  discountAmount: number;
  finalPrice: number;
}

export interface OrderDiscountTotalsInput {
  items: ItemDiscountInput[];
  orderDiscountType?: DiscountType | null;
  orderDiscountValue?: number | null;
}

export interface OrderDiscountTotalsResult {
  subtotalGross: number;
  itemsDiscount: number;
  subtotalNet: number;
  orderDiscount: number;
  totalDiscount: number;
  total: number;
}

export const DISCOUNT_PERCENT_PRESETS = [10, 15, 20, 50, 100] as const;
export const DISCOUNT_REASONS = [
  "Cortesía",
  "Empleado",
  "Promoción",
  "Corrección",
] as const;

/**
 * Calcula el monto de descuento y precio final para un ítem individual.
 */
export function calculateItemDiscount({
  unitPrice,
  quantity,
  discountType,
  discountValue,
  discountScope = "ROW",
}: ItemDiscountInput): ItemDiscountResult {
  const safeQty = Math.max(0, Number(quantity) || 0);
  const safePrice = Math.max(0, Number(unitPrice) || 0);
  const gross = Math.round(safeQty * safePrice * 100) / 100;

  const numValue = Number(discountValue) || 0;
  if (!discountType || numValue <= 0 || gross <= 0) {
    return { discountAmount: 0, finalPrice: gross };
  }

  let discount = 0;
  if (discountType === "PERCENT") {
    const raw = (gross * numValue) / 100;
    discount = Math.min(gross, Math.round(raw * 100) / 100);
  } else if (discountType === "FIXED") {
    const raw = discountScope === "UNIT" ? numValue * safeQty : numValue;
    discount = Math.min(gross, Math.round(raw * 100) / 100);
  }

  const finalPrice = Math.max(0, Math.round((gross - discount) * 100) / 100);
  return { discountAmount: discount, finalPrice };
}

/**
 * Calcula los totales completos de la orden aplicando primero los descuentos por ítem
 * y luego el descuento global de la orden en cascada sobre el subtotal neto.
 */
export function calculateOrderDiscountTotals({
  items,
  orderDiscountType,
  orderDiscountValue,
}: OrderDiscountTotalsInput): OrderDiscountTotalsResult {
  let subtotalGross = 0;
  let itemsDiscount = 0;

  for (const item of items) {
    const safeQty = Math.max(0, Number(item.quantity) || 0);
    const safePrice = Math.max(0, Number(item.unitPrice) || 0);
    const lineGross = Math.round(safeQty * safePrice * 100) / 100;
    subtotalGross += lineGross;

    const { discountAmount } = calculateItemDiscount(item);
    itemsDiscount += discountAmount;
  }

  subtotalGross = Math.round(subtotalGross * 100) / 100;
  itemsDiscount = Math.round(itemsDiscount * 100) / 100;
  const subtotalNet = Math.max(0, Math.round((subtotalGross - itemsDiscount) * 100) / 100);

  let orderDiscount = 0;
  const numOrderVal = Number(orderDiscountValue) || 0;
  if (orderDiscountType && numOrderVal > 0 && subtotalNet > 0) {
    if (orderDiscountType === "PERCENT") {
      const raw = (subtotalNet * numOrderVal) / 100;
      orderDiscount = Math.min(subtotalNet, Math.round(raw * 100) / 100);
    } else if (orderDiscountType === "FIXED") {
      orderDiscount = Math.min(subtotalNet, Math.round(numOrderVal * 100) / 100);
    }
  }

  const totalDiscount = Math.round((itemsDiscount + orderDiscount) * 100) / 100;
  const total = Math.max(0, Math.round((subtotalNet - orderDiscount) * 100) / 100);

  return {
    subtotalGross,
    itemsDiscount,
    subtotalNet,
    orderDiscount,
    totalDiscount,
    total,
  };
}

/**
 * Genera una etiqueta clara y concisa para mostrar el descuento aplicado.
 */
export function formatDiscountBadge(
  type?: DiscountType | null,
  value?: number | null,
  reason?: string | null,
): string {
  if (!type || !value || value <= 0) return "";
  const prefix = type === "PERCENT" ? `-${value}%` : `-$${Number(value).toFixed(2)}`;
  return reason ? `${prefix} (${reason})` : prefix;
}
