// TesoritoOS - Custom Hooks
// Reusable React hooks for common operations

import { createClient } from "@/lib/supabase/client";
import type { OrderWithDetails } from "@/types";
import { useEffect, useState } from "react";

/**
 * Safely parses any date string, timestamp, or Date object into a valid JS Date object.
 * Handles ISO strings with or without timezone offsets (e.g. +00:00, -06:00, Z).
 */
export function safeParseDate(input: string | Date | number | null | undefined): Date {
  if (!input) return new Date();
  if (input instanceof Date) return isNaN(input.getTime()) ? new Date() : input;
  if (typeof input === 'number') return new Date(input);

  if (typeof input === 'string') {
    let parsed = new Date(input);
    if (!isNaN(parsed.getTime())) return parsed;

    const formattedStr = input.trim().replace(' ', 'T');
    parsed = new Date(formattedStr);
    if (!isNaN(parsed.getTime())) return parsed;

    if (!formattedStr.endsWith('Z') && !/[+-]\d{2}:\d{2}$/.test(formattedStr)) {
      parsed = new Date(`${formattedStr}Z`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
  }

  return new Date();
}

export interface DbOrderPayload {
  id: string;
  order_number: string;
  customer_id?: string;
  source: string;
  status: any;
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
    status?: any;
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
  customers?: any;
  customer?: any;
}

export const mapOrderData = (dbOrder: DbOrderPayload): OrderWithDetails => {
  const createdAt = safeParseDate(dbOrder.created_at);
  const updatedAt = safeParseDate(dbOrder.updated_at);

  return {
    ...dbOrder,
    orderNumber: dbOrder.order_number,
    customerId: dbOrder.customer_id,
    createdAt,
    updatedAt,
    orderItems: Array.isArray(dbOrder.order_items)
      ? dbOrder.order_items.map((item) => ({
          ...item,
          orderId: item.order_id,
          menuItemId: item.menu_item_id,
          unitPrice: item.unit_price,
          status: item.status,
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
            : { id: item.menu_item_id, name: "Producto", price: item.unit_price || 0, isAvailable: true, createdAt: new Date(), updatedAt: new Date() },
        }))
      : [],
    customer: dbOrder.customers || dbOrder.customer || undefined,
  } as OrderWithDetails;
};

/**
 * Hook to fetch and subscribe to real-time orders using Supabase
 */
export function useRealtimeOrders(initialData: OrderWithDetails[] = [], soundEnabled: boolean = false) {
  const [orders, setOrders] = useState<OrderWithDetails[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);
  const [error, setError] = useState<string | null>(null);
  const supabase = createClient();

  const fetchOrders = async () => {
    try {
      const response = await fetch(
        "/api/orders?status=PENDING,PREPARING,READY",
      );
      if (!response.ok) throw new Error("Failed to fetch orders");

      const data = await response.json();
      setOrders((data.orders || []).map(mapOrderData));
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (initialData.length === 0) {
      fetchOrders();
    }

    let lastAudioTime = 0;

    const playBell = () => {
      if (!soundEnabled) return;
      const now = Date.now();
      if (now - lastAudioTime > 2000) { // 2 seconds debounce
        lastAudioTime = now;
        try {
          const audio = new Audio('/new_order.mp3');
          audio.play().catch((e) => console.log('Audio playback prevented:', e));
        } catch (error) {
          console.error('Error playing sound', error);
        }
      }
    };

    // Subscribe to changes in the tables
    const channel = supabase
      .channel("orders_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          if (payload.eventType === 'INSERT') {
            playBell();
          }
          fetchOrders();
        },
      )
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "order_items" },
        () => {
          playBell();
          fetchOrders();
        },
      )
      .subscribe((status) => {
        if (status === "SUBSCRIBED") {
          console.log("Subscribed to orders channel");
        }
      });

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled]);

  return { orders, loading, error, refetch: fetchOrders, setOrders };
}

/**
 * Hook to calculate elapsed time for orders
 */
export function useOrderTimer(createdAt: Date | string) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const now = new Date();
      const created = safeParseDate(createdAt);
      const diffMs = Math.max(0, now.getTime() - created.getTime());
      setElapsedSeconds(Math.floor(diffMs / 1000));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return elapsedSeconds;
}

/**
 * Utility to format seconds into MM:SS format
 */
export function formatTime(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

/**
 * Utility to get elapsed seconds since a given date
 */
export function getElapsedSeconds(dateInput: Date | string | null | undefined): number {
  if (!dateInput) return 0;
  const now = new Date();
  const created = safeParseDate(dateInput);
  const diffMs = Math.max(0, now.getTime() - created.getTime());
  return Math.floor(diffMs / 1000);
}

