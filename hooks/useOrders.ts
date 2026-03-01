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

    // Subscribe to changes in the 'orders' table
    const channel = supabase
      .channel("orders_realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "orders" },
        (payload) => {
          console.log("Change received!", payload);
          // Re-fetch all active orders when any change occurs
          // This ensures we have the full OrderWithDetails structure
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
      const created = new Date(createdAt);
      const diffMs = now.getTime() - created.getTime();
      setElapsedSeconds(Math.floor(diffMs / 1000));
    };

    calculateElapsed();
    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [createdAt]);

  return elapsedSeconds;
}
