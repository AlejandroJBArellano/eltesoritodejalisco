// TesoritoOS — Shared Order Mapper
// Canonical snake_case → camelCase mapping for Supabase order payloads.
// Importable from both server and client modules.

import type { Customer, OrderStatus, OrderWithDetails, Payment } from "@/types";
import type {
  Selection,
  SelectionSnapshotLine,
} from "@/lib/customization/types";

/** Fila de order_item_options (snapshot de la venta). */
export interface DbOrderItemOption {
  option_id?: string | null;
  group_id?: string | null;
  group_name: string;
  option_name: string;
  quantity: number;
  unit_price?: number | null;
  group_sort?: number | null;
  option_sort?: number | null;
}

/** Convierte el snapshot de BD en líneas ordenadas para tickets/KDS/carrito. */
export function mapSelectionLines(
  rows: DbOrderItemOption[] | null | undefined,
): SelectionSnapshotLine[] {
  if (!Array.isArray(rows) || rows.length === 0) return [];
  return rows
    .map((r) => ({
      optionId: r.option_id ?? null,
      groupId: r.group_id ?? null,
      groupName: r.group_name,
      optionName: r.option_name,
      quantity: Number(r.quantity) || 0,
      unitPrice: Number(r.unit_price) || 0,
      groupSort: r.group_sort ?? 0,
      optionSort: r.option_sort ?? 0,
    }))
    .sort((a, b) => a.groupSort - b.groupSort || a.optionSort - b.optionSort);
}

/** Selección para reabrir el modal (solo opciones que aún existen). */
export function selectionsFromLines(
  lines: SelectionSnapshotLine[],
): Selection[] {
  return lines
    .filter((l): l is SelectionSnapshotLine & { optionId: string } => !!l.optionId)
    .map((l) => ({ optionId: l.optionId, quantity: l.quantity }));
}

/**
 * Safely parses any date string, timestamp, or Date object into a valid JS Date.
 * Handles ISO strings with or without timezone offsets (e.g. +00:00, -06:00, Z).
 */
export function safeParseDate(
  input: string | Date | number | null | undefined,
): Date {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  if (typeof input === "number") return new Date(input);

  if (typeof input === "string") {
    const trimmed = input.trim();
    // Check if the string has a standard ISO date-time format but no timezone designator
    const isIsoFormat = /^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(trimmed);
    const hasTimezone =
      trimmed.endsWith("Z") ||
      /[+-]\d{2}:\d{2}$/.test(trimmed) ||
      /GMT|UTC/i.test(trimmed);

    if (isIsoFormat && !hasTimezone) {
      const formattedStr = trimmed.replace(" ", "T") + "Z";
      const parsed = new Date(formattedStr);
      if (!isNaN(parsed.getTime())) return parsed;
    }

    let parsed = new Date(input);
    if (!isNaN(parsed.getTime())) return parsed;

    const formattedStr = trimmed.replace(" ", "T");
    parsed = new Date(formattedStr);
    if (!isNaN(parsed.getTime())) return parsed;
  }

  return new Date();
}

/** Shape of order rows coming directly from Supabase (snake_case). */
export interface DbOrderPayload {
  id: string;
  order_number: string;
  customer_id?: string;
  source: string;
  status: OrderStatus | string;
  table?: string;
  notes?: string;
  subtotal?: number;
  tax?: number;
  total?: number;
  created_at: string;
  updated_at: string;
  completed_at?: string;
  corte_id?: string | null;
  estado_cierre?: string | null;
  operational_date?: string;
  pickup_time?: string | null;
  discount_type?: string | null;
  discount_value?: number | null;
  discount_amount?: number | null;
  discount_reason?: string | null;
  order_items?: Array<{
    id: string;
    order_id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    base_unit_price?: number | null;
    discount_base_price?: number | null;
    customization_modified_at?: string | null;
    order_item_options?: DbOrderItemOption[] | null;
    notes?: string;
    discount_type?: string | null;
    discount_value?: number | null;
    discount_amount?: number | null;
    discount_scope?: string | null;
    discount_reason?: string | null;
    status?: OrderStatus | string;
    tiempo_preparacion_segundos?: number | null;
    created_at?: string;
    menu_items?: {
      id?: string;
      name: string;
      price: number;
      image_url?: string;
      is_available?: boolean;
    };
  }>;
  payments?: Array<{
    id: string;
    order_id: string;
    method: string;
    amount: number;
    received_amount?: number;
    change?: number;
    tip_amount?: number;
    tip_payment_method?: string | null;
    tip_terminal_id?: string | null;
    terminal_id?: string | null;
    terminal_name?: string | null;
    terminal_commission_rate?: number | null;
    terminal_commission_amount?: number | null;
    created_at?: string;
  }>;
  customers?: Customer | null;
  customer?: Customer | null;
}

/**
 * Maps a raw Supabase order row (snake_case) into the app's `OrderWithDetails` shape (camelCase).
 * Handles optional order_items, payments, and customer relations.
 */
export const mapOrderData = (dbOrder: DbOrderPayload): OrderWithDetails => {
  const createdAt = safeParseDate(dbOrder.created_at);
  const updatedAt = safeParseDate(dbOrder.updated_at);
  const completedAt = dbOrder.completed_at
    ? safeParseDate(dbOrder.completed_at)
    : undefined;

  return {
    id: dbOrder.id,
    orderNumber: dbOrder.order_number,
    customerId: dbOrder.customer_id,
    source: dbOrder.source,
    status: dbOrder.status as OrderStatus,
    table: dbOrder.table,
    notes: dbOrder.notes,
    subtotal: dbOrder.subtotal ?? 0,
    tax: dbOrder.tax ?? 0,
    total: dbOrder.total ?? 0,
    discountType: (dbOrder.discount_type as "PERCENT" | "FIXED") || null,
    discountValue: dbOrder.discount_value ?? null,
    discountAmount: dbOrder.discount_amount ?? 0,
    discountReason: dbOrder.discount_reason ?? null,
    createdAt,
    updatedAt,
    completedAt,
    corteId: dbOrder.corte_id,
    closeStatus:
      dbOrder.estado_cierre === "ABIERTA"
        ? "OPEN"
        : dbOrder.estado_cierre === "CERRADA"
          ? "CLOSED"
          : dbOrder.estado_cierre === "ARCHIVADA"
            ? "ARCHIVED"
            : undefined,
    operationalDate: dbOrder.operational_date,
    pickupTime: dbOrder.pickup_time ? safeParseDate(dbOrder.pickup_time) : null,
    orderItems: Array.isArray(dbOrder.order_items)
      ? dbOrder.order_items.map((item) => {
          const selectionLines = mapSelectionLines(item.order_item_options);
          return {
          id: item.id,
          orderId: item.order_id,
          menuItemId: item.menu_item_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          baseUnitPrice: item.base_unit_price ?? null,
          discountBasePrice: item.discount_base_price ?? null,
          selectionLines,
          selections: selectionsFromLines(selectionLines),
          customizationModifiedAt: item.customization_modified_at
            ? safeParseDate(item.customization_modified_at)
            : null,
          notes: item.notes,
          discountType: (item.discount_type as "PERCENT" | "FIXED") || null,
          discountValue: item.discount_value ?? null,
          discountAmount: item.discount_amount ?? 0,
          discountScope: (item.discount_scope as "ROW" | "UNIT") || null,
          discountReason: item.discount_reason ?? null,
          status: item.status as OrderStatus | undefined,
          preparationTimeSeconds: item.tiempo_preparacion_segundos ?? null,
          createdAt: safeParseDate(item.created_at),
          menuItem: item.menu_items
            ? {
                id: item.menu_items.id || item.menu_item_id,
                name: item.menu_items.name,
                price: item.menu_items.price,
                imageUrl: item.menu_items?.image_url,
                isAvailable: item.menu_items?.is_available ?? true,
                createdAt: new Date(),
                updatedAt: new Date(),
              }
            : {
                id: item.menu_item_id,
                name: "Producto",
                price: item.unit_price || 0,
                isAvailable: true,
                createdAt: new Date(),
                updatedAt: new Date(),
              },
          };
        })
      : [],
    payments: Array.isArray(dbOrder.payments)
      ? (dbOrder.payments.map((p) => ({
          id: p.id,
          orderId: p.order_id,
          method: p.method,
          amount: p.amount,
          receivedAmount: p.received_amount,
          change: p.change,
          tipAmount: p.tip_amount || 0,
          tipPaymentMethod: p.tip_payment_method || null,
          tipTerminalId: p.tip_terminal_id || null,
          terminalId: p.terminal_id || null,
          terminalName: p.terminal_name || null,
          terminalCommissionRate: p.terminal_commission_rate != null ? Number(p.terminal_commission_rate) : null,
          terminalCommissionAmount: p.terminal_commission_amount != null ? Number(p.terminal_commission_amount) : null,
          createdAt: safeParseDate(p.created_at),
        })) as Payment[])
      : [],
    customer: (dbOrder.customers || dbOrder.customer || undefined) as
      Customer | undefined,
  };
};
