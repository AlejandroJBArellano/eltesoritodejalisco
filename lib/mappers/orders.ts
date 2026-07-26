// TesoritoOS — Shared Order Mapper
// Canonical snake_case → camelCase mapping for Supabase order payloads.
// Importable from both server and client modules.

import type { Customer, OrderStatus, OrderWithDetails, Payment } from "@/types";

/**
 * Safely parses any date string, timestamp, or Date object into a valid JS Date.
 * Handles ISO strings with or without timezone offsets (e.g. +00:00, -06:00, Z).
 */
export function safeParseDate(input: string | Date | number | null | undefined): Date {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  if (typeof input === "number") return new Date(input);

  if (typeof input === "string") {
    let parsed = new Date(input);
    if (!isNaN(parsed.getTime())) return parsed;

    const formattedStr = input.trim().replace(" ", "T");
    parsed = new Date(formattedStr);
    if (!isNaN(parsed.getTime())) return parsed;

    if (!formattedStr.endsWith("Z") && !/[+-]\d{2}:\d{2}$/.test(formattedStr)) {
      parsed = new Date(`${formattedStr}Z`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
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
  order_items?: Array<{
    id: string;
    order_id: string;
    menu_item_id: string;
    quantity: number;
    unit_price: number;
    notes?: string;
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
  const completedAt = dbOrder.completed_at ? safeParseDate(dbOrder.completed_at) : undefined;

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
    createdAt,
    updatedAt,
    completedAt,
    orderItems: Array.isArray(dbOrder.order_items)
      ? dbOrder.order_items.map((item) => ({
          id: item.id,
          orderId: item.order_id,
          menuItemId: item.menu_item_id,
          quantity: item.quantity,
          unitPrice: item.unit_price,
          notes: item.notes,
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
        }))
      : [],
    payments: Array.isArray(dbOrder.payments)
      ? dbOrder.payments.map((p) => ({
          id: p.id,
          orderId: p.order_id,
          method: p.method,
          amount: p.amount,
          receivedAmount: p.received_amount,
          change: p.change,
          tipAmount: p.tip_amount || 0,
          createdAt: safeParseDate(p.created_at),
        })) as Payment[]
      : [],
    customer: (dbOrder.customers || dbOrder.customer || undefined) as Customer | undefined,
  };
};
