// TesoritoOS - Custom Hooks
// Reusable React hooks for common operations

import { createClient } from "@/lib/supabase/client";
import type { OrderWithDetails } from "@/types";
import { useEffect, useState } from "react";

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
      setOrders(data.orders);
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
