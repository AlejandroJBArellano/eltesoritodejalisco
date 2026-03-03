// TesoritoOS - Custom Hooks
// Reusable React hooks for common operations

import { createClient } from "@/lib/supabase/client";
import type { OrderWithDetails } from "@/types";
import { useEffect, useState } from "react";

export const mapOrderData = (dbOrder: any): OrderWithDetails => {
  return {
    ...dbOrder,
    orderNumber: dbOrder.order_number,
    customerId: dbOrder.customer_id,
    createdAt: dbOrder.created_at,
    updatedAt: dbOrder.updated_at,
    orderItems: Array.isArray(dbOrder.order_items)
      ? dbOrder.order_items.map((item: any) => ({
          ...item,
          orderId: item.order_id,
          menuItemId: item.menu_item_id,
          unitPrice: item.unit_price,
          status: item.status,
          menuItem: item.menu_items
            ? {
                ...item.menu_items,
                imageUrl: item.menu_items?.image_url,
                isAvailable: item.menu_items?.is_available,
              }
            : { name: "Producto", price: item.unit_price || 0 },
        }))
      : [],
    customer: dbOrder.customers || dbOrder.customer || undefined,
  } as OrderWithDetails;
};

/**
 * Hook to fetch and subscribe to real-time orders using Supabase
 */
export function useRealtimeOrders(initialData: OrderWithDetails[] = []) {
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
      const now = Date.now();
      if (now - lastAudioTime > 2000) { // debounce de 2 segundos
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
        (payload) => {
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
  }, []);

  return { orders, loading, error, refetch: fetchOrders, setOrders };
}

/**
 * Hook to calculate elapsed time for orders
 */
export function useOrderTimer(createdAt: Date) {
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      const now = new Date();
      const rawDate = createdAt as unknown as string;
      const createdAtStr = typeof rawDate === 'string' && !rawDate.endsWith('Z') 
        ? `${rawDate}Z` 
        : rawDate;
      
      const created = new Date(createdAtStr);
      const diffMs = Math.max(0, now.getTime() - created.getTime());
      setElapsedSeconds(Math.floor(diffMs / 1000));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return elapsedSeconds;
}
