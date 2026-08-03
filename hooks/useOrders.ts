"use client";

// TesoritoOS — Order Hooks
// Real-time order subscriptions and timer utilities for the kitchen/POS.

import { createClient } from "@/lib/supabase/client";
import { mapOrderData, safeParseDate } from "@/lib/mappers/orders";
import type { OrderWithDetails } from "@/types";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

// Re-export shared mapper utilities so existing consumers don't break
export { mapOrderData, safeParseDate } from "@/lib/mappers/orders";
export type { DbOrderPayload } from "@/lib/mappers/orders";

/**
 * Hook to fetch and subscribe to real-time orders using Supabase
 */
export function useRealtimeOrders(
  initialData: OrderWithDetails[] = [],
  soundEnabled: boolean = false,
  tenantId?: string,
) {
  const [orders, setOrders] = useState<OrderWithDetails[]>(initialData);
  const [loading, setLoading] = useState(initialData.length === 0);
  const [error, setError] = useState<string | null>(null);

  // Stabilise the Supabase client — avoid re-creating on every render
  const supabase = useMemo(() => createClient(), []);

  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  const fetchOrders = useCallback(async () => {
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
  }, []);

  const debouncedFetchOrders = useCallback(() => {
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }
    fetchTimeoutRef.current = setTimeout(() => {
      fetchOrders();
    }, 300);
  }, [fetchOrders]);

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
    const ordersFilter = tenantId
      ? { event: "*" as const, schema: "public" as const, table: "orders" as const, filter: `tenant_id=eq.${tenantId}` }
      : { event: "*" as const, schema: "public" as const, table: "orders" as const };

    const itemsFilter = tenantId
      ? { event: "INSERT" as const, schema: "public" as const, table: "order_items" as const, filter: `tenant_id=eq.${tenantId}` }
      : { event: "INSERT" as const, schema: "public" as const, table: "order_items" as const };

    const channel = supabase
      .channel(`orders_realtime_${tenantId || "global"}`)
      .on(
        "postgres_changes",
        ordersFilter,
        (payload) => {
          if (payload.eventType === "INSERT") {
            playBell();
          }
          debouncedFetchOrders();
        },
      )
      .on(
        "postgres_changes",
        itemsFilter,
        () => {
          playBell();
          debouncedFetchOrders();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [soundEnabled, supabase, initialData.length, fetchOrders, debouncedFetchOrders, tenantId]);

  return { orders, loading, error, refetch: fetchOrders, setOrders };
}

/**
 * Hook to calculate elapsed time for orders
 */
export function useOrderTimer(createdAt: Date | string) {
  const timestamp = useMemo(() => {
    if (!createdAt) return 0;
    return safeParseDate(createdAt).getTime();
  }, [createdAt]);

  const [elapsedSeconds, setElapsedSeconds] = useState(() => {
    if (!timestamp) return 0;
    const now = new Date();
    return Math.max(0, Math.floor((now.getTime() - timestamp) / 1000));
  });

  const [prevTimestamp, setPrevTimestamp] = useState(timestamp);
  if (timestamp !== prevTimestamp) {
    setPrevTimestamp(timestamp);
    const now = new Date();
    setElapsedSeconds(Math.max(0, Math.floor((now.getTime() - timestamp) / 1000)));
  }

  useEffect(() => {
    if (!timestamp) return;

    const calculateElapsed = () => {
      const now = new Date();
      const diffMs = Math.max(0, now.getTime() - timestamp);
      setElapsedSeconds(Math.floor(diffMs / 1000));
    };

    const interval = setInterval(calculateElapsed, 1000);

    return () => clearInterval(interval);
  }, [timestamp]);

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
