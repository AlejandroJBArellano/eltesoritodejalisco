"use client";

// TesoritoOS — Order Hooks
// Real-time order subscriptions and timer utilities for the kitchen/POS.

import { createClient } from "@/lib/supabase/client";
import { mapOrderData, safeParseDate } from "@/lib/mappers/orders";
import type { OrderWithDetails } from "@/types";
import { useEffect, useMemo, useState } from "react";

// Re-export shared mapper utilities so existing consumers don't break
export { mapOrderData, safeParseDate } from "@/lib/mappers/orders";
export type { DbOrderPayload } from "@/lib/mappers/orders";

/**
 * Hook to fetch and subscribe to real-time orders using Supabase
 */
export function useRealtimeOrders(
  initialData: OrderWithDetails[] = [],
  soundEnabled: boolean = false,
) {
  const [orders, setOrders] = useState<OrderWithDetails[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Stabilise the Supabase client — avoid re-creating on every render
  const supabase = useMemo(() => createClient(), []);

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
      if (now - lastAudioTime > 2000) {
        // 2 seconds debounce
        lastAudioTime = now;
        try {
          const audio = new Audio("/new_order.mp3");
          audio.play().catch(() => {});
        } catch {
          // Audio playback fail fallback
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
          if (payload.eventType === "INSERT") {
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
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [soundEnabled, supabase, initialData.length]);

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
 * Utility to get elapsed seconds since a given date
 */
export function getElapsedSeconds(
  dateInput: Date | string | null | undefined,
): number {
  if (!dateInput) return 0;
  const now = new Date();
  const created = safeParseDate(dateInput);
  const diffMs = Math.max(0, now.getTime() - created.getTime());
  return Math.floor(diffMs / 1000);
}
