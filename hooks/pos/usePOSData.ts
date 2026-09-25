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
import { MenuItem, Customer, Order, PaymentTerminal } from "@/types/pos";
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
  const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
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

  const fetchTerminals = useCallback(async () => {
    try {
      const response = await fetch("/api/terminals");
      if (!response.ok) return;
      const data = await response.json();
      setTerminals(data.terminals || []);
    } catch (err) {
      console.error("[POS] Error fetching terminals:", err);
    }
  }, []);

  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersPageSize, setOrdersPageSize] = useState(10);
  const [ordersStatusFilter, setOrdersStatusFilter] = useState<
    "ALL" | "PENDING" | "PAID"
  >("ALL");
  const [ordersSourceFilter, setOrdersSourceFilter] = useState<
    "ALL" | "POS" | "PICKUP_APP"
  >("ALL");

  const [orderCounts, setOrderCounts] = useState({
    total: 0,
    pending: 0,
    paid: 0,
    pos: 0,
    pickup: 0,
  });

  const [orderPagination, setOrderPagination] = useState({
    page: 1,
    pageSize: 10,
    total: 0,
    totalPages: 1,
  });

  const [orderStats, setOrderStats] = useState({
    count: 0,
    sales: 0,
    avgTicket: 0,
  });

  const fetchOrders = useCallback(
    async (
      p = ordersPage,
      size = ordersPageSize,
      status = ordersStatusFilter,
      source = ordersSourceFilter,
    ) => {
      try {
        const queryParams = new URLSearchParams({
          page: String(p),
          pageSize: String(size),
          status,
          source,
        });
        const response = await fetch(`/api/pos/orders?${queryParams.toString()}`);
        const data = await response.json();
        if (!response.ok)
          throw new Error(data?.error || "Error al cargar órdenes");

        const mappedOrders = (data.orders || []).map((dbOrder: DbOrderPayload) =>
          mapOrderData(dbOrder),
        ) as Order[];

        setOrders(mappedOrders);
        if (data.counts) setOrderCounts(data.counts);
        if (data.pagination) setOrderPagination(data.pagination);
        if (data.stats) setOrderStats(data.stats);

        return mappedOrders;
      } catch (err) {
        console.error("[POS] Error fetching orders:", err);
        return [];
      }
    },
    [ordersPage, ordersPageSize, ordersStatusFilter, ordersSourceFilter],
  );

  const refreshOrders = useCallback(() => {
    return fetchOrders(ordersPage, ordersPageSize, ordersStatusFilter, ordersSourceFilter);
  }, [fetchOrders, ordersPage, ordersPageSize, ordersStatusFilter, ordersSourceFilter]);

  // Refetch orders whenever server pagination or filter parameters change
  useEffect(() => {
    setOrdersLoading(true);
    fetchOrders(ordersPage, ordersPageSize, ordersStatusFilter, ordersSourceFilter).finally(() => {
      setOrdersLoading(false);
    });
  }, [fetchOrders, ordersPage, ordersPageSize, ordersStatusFilter, ordersSourceFilter]);

  useEffect(() => {
    async function load() {
      try {
        setMenuLoading(true);
        setCustomersLoading(true);
        setOrdersLoading(true);
        // Menu, categories, customers and terminals gate the main UI; orders are non-blocking
        await Promise.all([
          fetchMenu().finally(() => setMenuLoading(false)),
          fetchCategories(),
          fetchCustomers().finally(() => setCustomersLoading(false)),
          fetchTerminals(),
          fetchOrders(1, ordersPageSize, "ALL", "ALL").finally(() =>
            setOrdersLoading(false),
          ),
        ]);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Error al cargar datos",
        );
      }
    }
    load();
  }, [fetchOrders, fetchMenu, fetchCategories, fetchCustomers, fetchTerminals, ordersPageSize]);

  // Realtime subscription: any INSERT/UPDATE/DELETE on orders, ingredients,
  // menu_items or menu_categories for this tenant triggers a debounced refetch.
  useEffect(() => {
    if (!tenantId) return;

    const debouncedFetchOrders = (payload: unknown) => {
      console.log("[POS Realtime] Order event:", payload);
      if (fetchDebounceRef.current) clearTimeout(fetchDebounceRef.current);
      fetchDebounceRef.current = setTimeout(() => {
        fetchOrders(ordersPage, ordersPageSize, ordersStatusFilter, ordersSourceFilter);
      }, 300);
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
  }, [
    tenantId,
    supabase,
    fetchOrders,
    fetchMenu,
    fetchCategories,
    ordersPage,
    ordersPageSize,
    ordersStatusFilter,
    ordersSourceFilter,
  ]);

  // Today metrics summary from live API stats
  const todayStats = orderStats;

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
    terminals,
    // Server-side pagination & live counts
    orderCounts,
    orderPagination,
    ordersPage,
    setOrdersPage,
    ordersPageSize,
    setOrdersPageSize,
    ordersStatusFilter,
    setOrdersStatusFilter,
    ordersSourceFilter,
    setOrdersSourceFilter,
  };
}
