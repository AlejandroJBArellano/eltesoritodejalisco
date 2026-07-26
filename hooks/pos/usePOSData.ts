"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { MenuItem, Customer, Order } from "@/types/pos";
import { mapOrderData } from "@/lib/mappers/orders";
import type { DbOrderPayload } from "@/lib/mappers/orders";

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

export function usePOSData() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableMenuItems = useMemo(
    () => menuItems.filter((item) => item.isAvailable),
    [menuItems]
  );

  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const filteredMenuItems = useMemo(() => {
    return availableMenuItems.filter((m) => {
      if (searchQuery) {
        return m.name.toLowerCase().includes(searchQuery.toLowerCase());
      }
      if (activeCategory && activeCategory !== "OTROS") {
        return m.category === activeCategory;
      }
      if (activeCategory === "OTROS") {
        return !m.category || !CATEGORY_ORDER.includes(m.category);
      }
      return true;
    });
  }, [availableMenuItems, searchQuery, activeCategory]);

  const categories = useMemo(() => CATEGORY_ORDER, []);

  const fetchMenu = async () => {
    const response = await fetch("/api/menu");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar menú");
    setMenuItems(
      (data.items || []).map((item: DbMenuItem) => ({
        ...item,
        category: item.category,
        isAvailable: item.is_available,
      }))
    );
  };

  const fetchCustomers = async () => {
    const response = await fetch("/api/customers");
    const data = await response.json();
    if (!response.ok)
      throw new Error(data?.error || "Error al cargar clientes");
    setCustomers(data.customers || []);
  };

  const fetchOrders = useCallback(async () => {
    const response = await fetch("/api/orders");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar órdenes");
    const mappedOrders = (data.orders || []).map((dbOrder: DbOrderPayload) =>
      mapOrderData(dbOrder)
    ) as Order[];
    setOrders(mappedOrders);
    return mappedOrders;
  }, []);

  const refreshOrders = useCallback(() => {
    return fetchOrders();
  }, [fetchOrders]);

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        await Promise.all([fetchMenu(), fetchCustomers(), fetchOrders()]);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Error al cargar"
        );
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, [fetchOrders]);

  // Calculate next folio for display
  const nextFolioDisplay = useMemo(() => {
    const todayDateStr = getTodayDateStr();

    const todayOrders = orders.filter(
      (o) => getOrderDateStr(o.createdAt) === todayDateStr
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
      (o) => getOrderDateStr(o.createdAt) === todayDateStr
    );

    const paidOrders = todayOrders.filter((o) => o.status === "PAID" || o.status === "DELIVERED");
    const salesTotal = paidOrders.reduce((acc, o) => acc + o.total, 0);
    const avgTicket = paidOrders.length > 0 ? salesTotal / paidOrders.length : 0;

    return {
      count: todayOrders.length,
      sales: salesTotal,
      avgTicket,
    };
  }, [orders]);

  return {
    menuItems,
    availableMenuItems,
    customers,
    orders,
    categories,
    isLoading,
    errorMessage,
    refreshOrders,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    filteredMenuItems,
    nextFolioDisplay,
    todayStats,
  };
}
