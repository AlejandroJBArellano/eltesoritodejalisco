"use client";

import React, { useState, useEffect, useMemo, useCallback, useRef, createContext, useContext } from "react";
import { MenuItem, Customer, Order } from "@/types/pos";
import { mapOrderData } from "@/lib/mappers/orders";
import type { DbOrderPayload } from "@/lib/mappers/orders";
import { createClient } from "@/lib/supabase/client";

const CATEGORY_ORDER = [
  "ANTOJITOS",
  "TACOS",
  "PLATILLOS FUERTES",
  "BEBIDAS",
  "EXTRAS",
  "POSTRES",
  "OTROS",
];

/** Raw menu item shape from the API (snake_case). */
interface DbMenuItem {
  id: string;
  name: string;
  price: number;
  category?: string;
  image_url?: string;
  is_available: boolean;
  ingredient_id?: string | null;
  current_stock?: number | null;
  minimum_stock?: number | null;
}

/** Get today's date string in CDMX timezone (YYYY-MM-DD). */
const getTodayDateStr = (): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());

/** Get the order's date string in CDMX timezone (YYYY-MM-DD). */
const getOrderDateStr = (createdAt: Date | string): string =>
  new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Mexico_City",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(createdAt));

type POSDataValue = ReturnType<typeof usePOSDataInternal>;
const POSDataContext = createContext<POSDataValue | null>(null);

export function POSDataProvider({
  children,
  tenantId,
}: {
  children: React.ReactNode;
  tenantId?: string;
}) {
  const value = usePOSDataInternal(tenantId);
  return React.createElement(POSDataContext.Provider, { value }, children);
}

export function usePOSData(tenantId?: string) {
  const context = useContext(POSDataContext);
  if (context) return context;
  return usePOSDataInternal(tenantId);
}

function usePOSDataInternal(tenantId?: string) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);      // gates the POS UI (menu + customers)
  const [ordersLoading, setOrdersLoading] = useState(true); // non-blocking: orders section only
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Stabilise Supabase client across renders
  const supabase = useMemo(() => createClient(), []);
  // Debounce refs to batch rapid realtime events
  const fetchDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const menuDebounceRef  = useRef<NodeJS.Timeout | null>(null);

  const availableMenuItems = useMemo(
    () => menuItems.filter((item) => item.isAvailable),
    [menuItems],
  );

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredMenuItems = useMemo(() => {
    return availableMenuItems.filter((m) => {
      // 1. Category Filter (Case-insensitive matching)
      if (activeCategory && activeCategory !== "OTROS") {
        if (
          !m.category ||
          m.category.toUpperCase().trim() !==
            activeCategory.toUpperCase().trim()
        ) {
          return false;
        }
      } else if (activeCategory === "OTROS") {
        if (
          m.category &&
          CATEGORY_ORDER.includes(m.category.toUpperCase().trim())
        ) {
          return false;
        }
      }

      // 2. Search Query Filter
      if (searchQuery) {
        return m.name.toLowerCase().includes(searchQuery.toLowerCase().trim());
      }

      return true;
    });
  }, [availableMenuItems, searchQuery, activeCategory]);

  const categories = useMemo(() => CATEGORY_ORDER, []);

  const fetchMenu = useCallback(async () => {
    const response = await fetch("/api/menu");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar menú");
    setMenuItems(
      (data.items || []).map((item: DbMenuItem) => ({
        ...item,
        category: item.category,
        isAvailable: item.is_available,
        ingredientId: item.ingredient_id ?? null,
        currentStock: item.current_stock ?? null,
        minimumStock: item.minimum_stock ?? null,
      })),
    );
  }, []);

  const fetchCustomers = async () => {
    const response = await fetch("/api/customers");
    const data = await response.json();
    if (!response.ok)
      throw new Error(data?.error || "Error al cargar clientes");
    setCustomers(data.customers || []);
  };

  const fetchOrders = useCallback(async () => {
    const response = await fetch("/api/orders?pos=true");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar órdenes");
    const mappedOrders = (data.orders || []).map((dbOrder: DbOrderPayload) =>
      mapOrderData(dbOrder),
    ) as Order[];

    // Only display today's orders or active (not archived) orders from previous days
    const todayDateStr = getTodayDateStr();
    const activeAndTodayOrders = mappedOrders.filter(
      (order) =>
        (!order.corteId && order.closeStatus !== "ARCHIVED") ||
        getOrderDateStr(order.createdAt) === todayDateStr,
    );

    setOrders(activeAndTodayOrders);
    return activeAndTodayOrders;
  }, []);

  const refreshOrders = useCallback(() => {
    return fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    async function load() {
      try {
        setIsLoading(true);
        setOrdersLoading(true);
        await Promise.all([fetchMenu(), fetchCustomers(), fetchOrders()]);
      } catch (err) {
        setErrorMessage(err instanceof Error ? err.message : "Error al cargar datos");
      } finally {
        setIsLoading(false);
        setOrdersLoading(false);
      }
    }
    load();
  }, [fetchOrders, fetchMenu]);

  // Realtime subscription: any INSERT/UPDATE/DELETE on orders for this tenant
  // triggers a debounced refetch, so the POS stays in sync without manual refresh.
  useEffect(() => {
    if (!tenantId) return;

    const debouncedFetchOrders = (payload: any) => {
      console.log("[POS Realtime] Order event:", payload);
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      fetchDebounceRef.current = setTimeout(() => fetchOrders(), 300);
    };

    const debouncedFetchMenu = (payload: any) => {
      console.log("[POS Realtime] Ingredient update event:", payload);
      if (menuDebounceRef.current) clearTimeout(menuDebounceRef.current);
      menuDebounceRef.current = setTimeout(() => fetchMenu(), 500);
    };

    const channel = supabase
      .channel(`pos_orders_${tenantId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "orders",
          filter: `tenant_id=eq.${tenantId}`,
        },
        debouncedFetchOrders,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "ingredients",
        },
        debouncedFetchMenu,
      )
      .subscribe((status, err) => {
        console.log(`[POS Realtime] Subscription status for tenant ${tenantId}:`, status, err);
      });

    return () => {
      supabase.removeChannel(channel);
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      if (menuDebounceRef.current)  clearTimeout(menuDebounceRef.current);
    };
  }, [tenantId, supabase, fetchOrders, fetchMenu]);

  // Calculate next folio for display
  const nextFolioDisplay = useMemo(() => {
    const todayDateStr = getTodayDateStr();

    const todayOrders = orders.filter(
      (o) => getOrderDateStr(o.createdAt) === todayDateStr,
    );

    if (todayOrders.length === 0) return "001";
    const lastNum = Math.max(
      ...todayOrders.map((o) => {
        const parts = (o.orderNumber || "0").split("-");
        return parseInt(parts[parts.length - 1], 10) || 0;
      }),
    );
    return (lastNum + 1).toString().padStart(3, "0");
  }, [orders]);

  // Today metrics summary
  const todayStats = useMemo(() => {
    const todayDateStr = getTodayDateStr();

    const todayOrders = orders.filter(
      (o) => getOrderDateStr(o.createdAt) === todayDateStr,
    );

    const paidOrders = todayOrders.filter(
      (o) => o.status === "PAID" || o.status === "DELIVERED",
    );
    const salesTotal = paidOrders.reduce((acc, o) => acc + o.total, 0);
    const avgTicket =
      paidOrders.length > 0 ? salesTotal / paidOrders.length : 0;

    return {
      count: todayOrders.length,
      sales: salesTotal,
      avgTicket,
    };
  }, [orders]);

  /** Items con tracking de ingrediente y stock en nivel bajo o agotado */
  const lowStockItems = useMemo(
    () =>
      availableMenuItems.filter(
        (m) =>
          m.ingredientId != null &&
          m.currentStock != null &&
          m.minimumStock != null &&
          m.currentStock <= m.minimumStock,
      ),
    [availableMenuItems],
  );

  return {
    menuItems,
    availableMenuItems,
    customers,
    orders,
    categories,
    isLoading,
    ordersLoading,
    errorMessage,
    refreshOrders,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    filteredMenuItems,
    nextFolioDisplay,
    todayStats,
    lowStockItems,
  };
}
