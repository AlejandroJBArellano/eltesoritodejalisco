import { useState, useEffect, useMemo, useCallback } from "react";
import { MenuItem, Customer, Order } from "@/types/pos";

const CATEGORY_ORDER = [
  "ANTOJITOS",
  "TACOS",
  "PLATILLOS FUERTES",
  "BEBIDAS",
  "EXTRAS",
  "POSTRES",
  "OTROS",
];

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

  const mapOrderData = (dbOrder: any): Order => {
    return {
      ...dbOrder,
      orderNumber: dbOrder.order_number,
      customerId: dbOrder.customer_id,
      createdAt: dbOrder.created_at
        ? dbOrder.created_at.includes("Z") || dbOrder.created_at.includes("+")
          ? dbOrder.created_at
          : `${dbOrder.created_at.replace(" ", "T")}Z`
        : dbOrder.created_at,
      updatedAt: dbOrder.updated_at
        ? dbOrder.updated_at.includes("Z") || dbOrder.updated_at.includes("+")
          ? dbOrder.updated_at
          : `${dbOrder.updated_at.replace(" ", "T")}Z`
        : dbOrder.updated_at,
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
      payments: Array.isArray(dbOrder.payments)
        ? dbOrder.payments.map((p: any) => ({
            ...p,
            orderId: p.order_id,
            tipAmount: p.tip_amount,
          }))
        : [],
      customer: dbOrder.customers || dbOrder.customer || undefined,
    } as Order;
  };

  const fetchMenu = async () => {
    const response = await fetch("/api/menu");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar menú");
    setMenuItems(
      (data.items || []).map((item: any) => ({
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
    const mappedOrders = (data.orders || []).map(mapOrderData);
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
    const todayDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const sortedOrders = [...orders].filter((o) => {
      const orderDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(o.createdAt));
      return orderDate === todayDateStr;
    });

    if (sortedOrders.length === 0) return "001";
    const lastNum = Math.max(
      ...sortedOrders.map((o) => {
        const parts = (o.orderNumber || "0").split("-");
        return parseInt(parts[parts.length - 1], 10) || 0;
      }),
    );
    return (lastNum + 1).toString().padStart(3, "0");
  }, [orders]);

  // Today metrics summary
  const todayStats = useMemo(() => {
    const todayDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const todayOrders = orders.filter((o) => {
      const orderDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(o.createdAt));
      return orderDate === todayDateStr;
    });

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
