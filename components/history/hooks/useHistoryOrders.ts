"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { PaymentMethod } from "@/types";
import { mapOrderData, type DbOrderPayload } from "@/lib/mappers/orders";
import { getOrderPaymentMethods } from "@/components/pos/paymentUtils";
import type { Order, OrderFilters, OrderSortField } from "../types";

export interface UseHistoryOrdersOptions {
  initialOrders?: Order[];
  autoFetch?: boolean;
}

export function useHistoryOrders(options: UseHistoryOrdersOptions = {}) {
  const { initialOrders = [], autoFetch = true } = options;

  const [orders, setOrders] = useState<Order[]>(initialOrders);
  const [isLoading, setIsLoading] = useState(autoFetch && initialOrders.length === 0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Filters
  const [filters, setFilters] = useState<OrderFilters>({
    searchQuery: "",
    dateFilter: "",
    tableFilter: "",
    paymentMethodFilter: "",
    sourceFilter: "",
  });

  // Table Controls
  const [sortField, setSortField] = useState<OrderSortField>("createdAt");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [expandedRow, setExpandedRow] = useState<string | null>(null);

  const setFilter = useCallback(
    <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => {
      setFilters((prev) => ({ ...prev, [key]: value }));
    },
    [],
  );

  const resetFilters = useCallback(() => {
    setFilters({
      searchQuery: "",
      dateFilter: "",
      tableFilter: "",
      paymentMethodFilter: "",
      sourceFilter: "",
    });
  }, []);

  const toggleRow = useCallback((orderId: string) => {
    setExpandedRow((prev) => (prev === orderId ? null : orderId));
  }, []);

  const fetchOrders = useCallback(async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/orders");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Error al cargar órdenes");
      }

      const mappedOrders = (data.orders || []).map((dbOrder: DbOrderPayload) =>
        mapOrderData(dbOrder),
      );
      setOrders(mappedOrders);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      void fetchOrders();
    }
  }, [autoFetch, fetchOrders]);

  const availableTables = useMemo(() => {
    const tables = new Set(
      orders.map((o) => o.table).filter(Boolean) as string[],
    );
    return Array.from(tables).sort();
  }, [orders]);

  const filteredOrders = useMemo(() => {
    const { searchQuery, dateFilter, tableFilter, paymentMethodFilter, sourceFilter } =
      filters;
    const query = searchQuery.trim().toLowerCase();

    return orders.filter((order) => {
      if (query && !order.orderNumber.toLowerCase().includes(query)) {
        return false;
      }
      if (dateFilter) {
        const orderDate = new Intl.DateTimeFormat("en-CA", {
          timeZone: "America/Mexico_City",
          year: "numeric",
          month: "2-digit",
          day: "2-digit",
        }).format(new Date(order.createdAt));
        if (orderDate !== dateFilter) return false;
      }
      if (tableFilter && order.table !== tableFilter) {
        return false;
      }
      if (paymentMethodFilter) {
        const paymentMethods = getOrderPaymentMethods(order);
        if (!paymentMethods.includes(paymentMethodFilter as PaymentMethod)) {
          return false;
        }
      }
      if (sourceFilter) {
        if (sourceFilter === "PICKUP_APP" && order.source !== "PICKUP_APP") {
          return false;
        }
        if (sourceFilter === "POS" && order.source === "PICKUP_APP") {
          return false;
        }
      }
      return true;
    });
  }, [orders, filters]);

  const sortedOrders = useMemo(() => {
    return [...filteredOrders].sort((a, b) => {
      let comp = 0;
      if (sortField === "orderNumber") {
        comp = a.orderNumber.localeCompare(b.orderNumber);
      } else if (sortField === "createdAt") {
        comp =
          new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      } else if (sortField === "table") {
        comp = (a.table || "").localeCompare(b.table || "");
      } else if (sortField === "total") {
        comp = a.total - b.total;
      }
      return sortDir === "asc" ? comp : -comp;
    });
  }, [filteredOrders, sortField, sortDir]);

  // Reset page to 1 when filters or sort change
  useEffect(() => {
    setPage(1);
  }, [filters, sortField, sortDir, pageSize]);

  const totalPages = Math.ceil(sortedOrders.length / pageSize) || 1;

  const paginatedOrders = useMemo(() => {
    const start = (page - 1) * pageSize;
    return sortedOrders.slice(start, start + pageSize);
  }, [sortedOrders, page, pageSize]);

  return {
    orders,
    setOrders,
    filteredOrders,
    sortedOrders,
    paginatedOrders,
    totalPages,
    totalItems: sortedOrders.length,
    availableTables,
    filters,
    setFilter,
    resetFilters,
    sortField,
    setSortField,
    sortDir,
    setSortDir,
    page,
    setPage,
    pageSize,
    setPageSize,
    expandedRow,
    toggleRow,
    isLoading,
    errorMessage,
    refetch: fetchOrders,
  };
}
