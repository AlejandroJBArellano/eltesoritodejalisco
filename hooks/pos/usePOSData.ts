"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  useCallback,
  useRef,
  createContext,
  useContext,
} from "react";
import { MenuItem, Customer, Order } from "@/types/pos";
import { mapOrderData } from "@/lib/mappers/orders";
import type { DbOrderPayload } from "@/lib/mappers/orders";
import { createClient } from "@/lib/supabase/client";

/** Raw menu category shape from API. */
interface DbMenuCategory {
  id: string;
  name: string;
  sort_order?: number | null;
  is_active?: boolean | null;
}

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
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return usePOSDataInternal(tenantId);
}

function usePOSDataInternal(tenantId?: string) {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [menuLoading, setMenuLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(true);
  const [ordersLoading, setOrdersLoading] = useState(true); // non-blocking: orders section only
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Derived: gate the POS UI only on menu + customers being ready
  const isLoading = menuLoading || customersLoading;

  // Stabilise Supabase client across renders
  const supabase = useMemo(() => createClient(), []);
  // Debounce refs to batch rapid realtime events
  const fetchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const menuDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const categoriesDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  const [categories, setCategories] = useState<string[]>([]);

  const availableMenuItems = useMemo(
    () => menuItems.filter((item) => item.isAvailable),
    [menuItems],
  );

  const menuItemMap = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (let i = 0; i < menuItems.length; i++) {
      map.set(menuItems[i].id, menuItems[i]);
    }
    return map;
  }, [menuItems]);

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const registeredCategoriesSet = useMemo(() => {
    const set = new Set<string>();
    for (let i = 0; i < categories.length; i++) {
      const cat = categories[i].toUpperCase().trim();
      if (cat !== "OTROS") {
        set.add(cat);
      }
    }
    return set;
  }, [categories]);

  const filteredMenuItems = useMemo(() => {
    const normActiveCategory = activeCategory.toUpperCase().trim();
    const isOtros = normActiveCategory === "OTROS";
    const normSearch = searchQuery.toLowerCase().trim();

    return availableMenuItems.filter((m) => {
      // 1. Category Filter (Case-insensitive matching)
      if (normActiveCategory && !isOtros) {
        if (
          !m.category ||
          m.category.toUpperCase().trim() !== normActiveCategory
        ) {
          return false;
        }
      } else if (isOtros) {
        const normalizedItemCategory = m.category?.toUpperCase().trim();
        if (
          normalizedItemCategory &&
          registeredCategoriesSet.has(normalizedItemCategory)
        ) {
          return false;
        }
      }

      // 2. Search Query Filter
      if (normSearch) {
        return m.name.toLowerCase().includes(normSearch);
      }

      return true;
    });
  }, [
    availableMenuItems,
    searchQuery,
    activeCategory,
    registeredCategoriesSet,
  ]);

  const fetchCategories = useCallback(async () => {
    try {
      const response = await fetch("/api/menu-categories");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Error al cargar categorías");
      const activeCats: string[] = (data.categories || [])
        .filter((c: DbMenuCategory) => c.is_active !== false)
        .sort(
          (a: DbMenuCategory, b: DbMenuCategory) =>
            (a.sort_order ?? 0) - (b.sort_order ?? 0),
        )
        .map((c: DbMenuCategory) => c.name);

      const hasOtros = activeCats.some(
        (c) => c.toUpperCase().trim() === "OTROS",
      );
      setCategories(hasOtros ? activeCats : [...activeCats, "OTROS"]);
    } catch (err) {
      console.error("[POS] Error fetching categories:", err);
    }
  }, []);

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

  const fetchCustomers = useCallback(async () => {
    const response = await fetch("/api/customers");
    const data = await response.json();
    if (!response.ok)
      throw new Error(data?.error || "Error al cargar clientes");
    setCustomers(data.customers || []);
  }, []);

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
        setMenuLoading(true);
        setCustomersLoading(true);
        setOrdersLoading(true);
        // Menu, categories and customers gate the main UI; orders are non-blocking
        await Promise.all([
          fetchMenu().finally(() => setMenuLoading(false)),
          fetchCategories(),
          fetchCustomers().finally(() => setCustomersLoading(false)),
          fetchOrders().finally(() => setOrdersLoading(false)),
        ]);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Error al cargar datos",
        );
      }
    }
    load();
  }, [fetchOrders, fetchMenu, fetchCategories, fetchCustomers]);

  // Realtime subscription: any INSERT/UPDATE/DELETE on orders, ingredients,
  // menu_items or menu_categories for this tenant triggers a debounced refetch.
  useEffect(() => {
    if (!tenantId) return;

    const debouncedFetchOrders = (payload: unknown) => {
      console.log("[POS Realtime] Order event:", payload);
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      fetchDebounceRef.current = setTimeout(() => fetchOrders(), 300);
    };

    const debouncedFetchMenu = (payload: unknown) => {
      console.log("[POS Realtime] Menu/Ingredient update event:", payload);
      if (menuDebounceRef.current) clearTimeout(menuDebounceRef.current);
      menuDebounceRef.current = setTimeout(() => fetchMenu(), 500);
    };

    const debouncedFetchCategories = (payload: unknown) => {
      console.log("[POS Realtime] Category update event:", payload);
      if (categoriesDebounceRef.current)
        clearTimeout(categoriesDebounceRef.current);
      categoriesDebounceRef.current = setTimeout(() => fetchCategories(), 300);
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
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu_categories",
          filter: `tenant_id=eq.${tenantId}`,
        },
        debouncedFetchCategories,
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "menu_items",
          filter: `tenant_id=eq.${tenantId}`,
        },
        debouncedFetchMenu,
      )
      .subscribe((status, err) => {
        console.log(
          `[POS Realtime] Subscription status for tenant ${tenantId}:`,
          status,
          err,
        );
      });

    return () => {
      supabase.removeChannel(channel);
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      if (menuDebounceRef.current) clearTimeout(menuDebounceRef.current);
      if (categoriesDebounceRef.current)
        clearTimeout(categoriesDebounceRef.current);
    };
  }, [tenantId, supabase, fetchOrders, fetchMenu, fetchCategories]);

  // Today metrics summary — single pass O(N) loop
  const todayStats = useMemo(() => {
    const todayDateStr = getTodayDateStr();
    let count = 0;
    let salesTotal = 0;
    let paidCount = 0;

    for (let i = 0; i < orders.length; i++) {
      const o = orders[i];
      if (getOrderDateStr(o.createdAt) === todayDateStr) {
        count++;
        if (o.status === "PAID" || o.status === "DELIVERED") {
          salesTotal += o.total;
          paidCount++;
        }
      }
    }

    const avgTicket = paidCount > 0 ? salesTotal / paidCount : 0;

    return {
      count,
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
    menuItemMap,
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
    todayStats,
    lowStockItems,
  };
}
