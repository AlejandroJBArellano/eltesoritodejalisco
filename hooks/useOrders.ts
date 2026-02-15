// TesoritoOS - Custom Hooks
// Reusable React hooks for common operations

import type { OrderWithDetails } from "@/types";
import { useEffect, useState } from "react";

/**
 * Hook to fetch and subscribe to real-time orders
 * In production, this would use WebSockets or Supabase Realtime
 */
export function useRealtimeOrders(initialData: OrderWithDetails[] = []) {
  const [orders, setOrders] = useState<OrderWithDetails[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Initial fetch if no data provided
    if (initialData.length === 0) {
      fetchOrders();
    }

    // Setup real-time subscription
    // const subscription = subscribeToOrders((newOrder) => {
    //   setOrders((prev) => [...prev, newOrder]);
    // });

    // Polling fallback (remove when WebSockets are implemented)
    const interval = setInterval(fetchOrders, 5000); // Refresh every 5s

    return () => {
      clearInterval(interval);
      // subscription?.unsubscribe();
    };
  }, []);

  async function fetchOrders() {
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
  }

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
