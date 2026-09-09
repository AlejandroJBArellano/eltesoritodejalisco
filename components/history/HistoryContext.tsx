"use client";

import React, { createContext, useContext, useMemo, useState, useCallback } from "react";
import { useHistoryOrders } from "./hooks/useHistoryOrders";
import { useDailyCutManager } from "./hooks/useDailyCutManager";
import type { DailyCut, DailyCutSummaryTotals, Order, OrderFilters, OrderSortField, TipBreakdownItem } from "./types";

export interface HistoryContextValue {
  // Orders State
  orders: Order[];
  sortedOrders: Order[];
  paginatedOrders: Order[];
  ordersTotalPages: number;
  ordersTotalItems: number;
  availableTables: string[];
  filters: OrderFilters;
  setFilter: <K extends keyof OrderFilters>(key: K, value: OrderFilters[K]) => void;
  resetFilters: () => void;
  ordersSortField: OrderSortField;
  setOrdersSortField: (field: OrderSortField) => void;
  ordersSortDir: "asc" | "desc";
  setOrdersSortDir: (dir: "asc" | "desc") => void;
  ordersPage: number;
  setOrdersPage: (page: number) => void;
  ordersPageSize: number;
  setOrdersPageSize: (size: number) => void;
  expandedRow: string | null;
  toggleRow: (orderId: string) => void;
  isLoadingOrders: boolean;
  refetchOrders: () => Promise<void>;

  // Daily Cut Manager State
  todayTotals: DailyCutSummaryTotals;
  todayOrders: Order[];
  todayExpenses: number;
  showFinalizeModal: boolean;
  setShowFinalizeModal: (show: boolean) => void;
  finalizeSuccess: boolean;
  isFinalizing: boolean;
  manualCash: string;
  setManualCash: (val: string) => void;
  manualCard: string;
  setManualCard: (val: string) => void;
  manualTipsEfectivo: string;
  setManualTipsEfectivo: (val: string) => void;
  manualTipsTarjeta: string;
  setManualTipsTarjeta: (val: string) => void;
  tipBreakdown: TipBreakdownItem[];
  isCalculatingTips: boolean;
  historyError: string | null;
  setHistoryError: (err: string | null) => void;
  historySuccess: string | null;
  pendingCutArmed: boolean;
  isGeneratingPendingCut: boolean;
  hasPendingCut: boolean;
  pendingDate: string | null;
  pendingOrders: number;
  openFinalizeModal: () => void;
  handleFinalizarDia: () => Promise<void>;
  handleGeneratePendingCut: () => Promise<void>;
  terminalCommissionRate: number;

  // Archive & Billing State
  showCutsArchive: boolean;
  setShowCutsArchive: (show: boolean) => void;
  toggleCutsArchive: () => void;
  billingOrder: Order | null;
  setBillingOrder: (order: Order | null) => void;

  // Summary Ticket State
  showDailySummaryTicket: boolean;
  setShowDailySummaryTicket: (show: boolean) => void;
  dailySummaryTicketCut: DailyCut | null;
  setDailySummaryTicketCut: (cut: DailyCut | null) => void;
  openDailySummaryTicket: (cut?: DailyCut | null) => void;
  closeDailySummaryTicket: () => void;
}

const HistoryContext = createContext<HistoryContextValue | null>(null);

export function useHistoryContext() {
  const context = useContext(HistoryContext);
  if (!context) {
    throw new Error("useHistoryContext must be used within a HistoryProvider");
  }
  return context;
}

export function useHistoryContextNullable() {
  return useContext(HistoryContext);
}

export interface HistoryProviderProps {
  children: React.ReactNode;
  initialOrders?: Order[];
  autoFetch?: boolean;
}

export function HistoryProvider({
  children,
  initialOrders,
  autoFetch = true,
}: HistoryProviderProps) {
  const [showCutsArchive, setShowCutsArchive] = useState(false);
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);
  const [showDailySummaryTicket, setShowDailySummaryTicket] = useState(false);
  const [dailySummaryTicketCut, setDailySummaryTicketCut] = useState<DailyCut | null>(null);

  const openDailySummaryTicket = useCallback((cut?: DailyCut | null) => {
    setDailySummaryTicketCut(cut ?? null);
    setShowDailySummaryTicket(true);
  }, []);

  const closeDailySummaryTicket = useCallback(() => {
    setShowDailySummaryTicket(false);
    setDailySummaryTicketCut(null);
  }, []);

  const ordersHook = useHistoryOrders({
    initialOrders,
    autoFetch,
  });

  const toggleCutsArchive = useCallback(() => {
    setShowCutsArchive((prev) => !prev);
  }, []);

  const handleCutFinalized = useCallback(async () => {
    await ordersHook.refetch();
  }, [ordersHook]);

  const cutManagerHook = useDailyCutManager({
    orders: ordersHook.orders,
    onCutFinalized: handleCutFinalized,
  });

  const value = useMemo<HistoryContextValue>(() => ({
    orders: ordersHook.orders,
    sortedOrders: ordersHook.sortedOrders,
    paginatedOrders: ordersHook.paginatedOrders,
    ordersTotalPages: ordersHook.totalPages,
    ordersTotalItems: ordersHook.totalItems,
    availableTables: ordersHook.availableTables,
    filters: ordersHook.filters,
    setFilter: ordersHook.setFilter,
    resetFilters: ordersHook.resetFilters,
    ordersSortField: ordersHook.sortField,
    setOrdersSortField: ordersHook.setSortField,
    ordersSortDir: ordersHook.sortDir,
    setOrdersSortDir: ordersHook.setSortDir,
    ordersPage: ordersHook.page,
    setOrdersPage: ordersHook.setPage,
    ordersPageSize: ordersHook.pageSize,
    setOrdersPageSize: ordersHook.setPageSize,
    expandedRow: ordersHook.expandedRow,
    toggleRow: ordersHook.toggleRow,
    isLoadingOrders: ordersHook.isLoading,
    refetchOrders: ordersHook.refetch,

    todayTotals: cutManagerHook.todayTotals,
    todayOrders: cutManagerHook.todayOrders,
    todayExpenses: cutManagerHook.todayExpenses,
    showFinalizeModal: cutManagerHook.showFinalizeModal,
    setShowFinalizeModal: cutManagerHook.setShowFinalizeModal,
    finalizeSuccess: cutManagerHook.finalizeSuccess,
    isFinalizing: cutManagerHook.isFinalizing,
    manualCash: cutManagerHook.manualCash,
    setManualCash: cutManagerHook.setManualCash,
    manualCard: cutManagerHook.manualCard,
    setManualCard: cutManagerHook.setManualCard,
    manualTipsEfectivo: cutManagerHook.manualTipsEfectivo,
    setManualTipsEfectivo: cutManagerHook.setManualTipsEfectivo,
    manualTipsTarjeta: cutManagerHook.manualTipsTarjeta,
    setManualTipsTarjeta: cutManagerHook.setManualTipsTarjeta,
    tipBreakdown: cutManagerHook.tipBreakdown,
    isCalculatingTips: cutManagerHook.isCalculatingTips,
    historyError: cutManagerHook.historyError,
    setHistoryError: cutManagerHook.setHistoryError,
    historySuccess: cutManagerHook.historySuccess,
    pendingCutArmed: cutManagerHook.pendingCutArmed,
    isGeneratingPendingCut: cutManagerHook.isGeneratingPendingCut,
    hasPendingCut: cutManagerHook.hasPendingCut,
    pendingDate: cutManagerHook.pendingDate,
    pendingOrders: cutManagerHook.pendingOrders,
    openFinalizeModal: cutManagerHook.openFinalizeModal,
    handleFinalizarDia: cutManagerHook.handleFinalizarDia,
    handleGeneratePendingCut: cutManagerHook.handleGeneratePendingCut,
    terminalCommissionRate: cutManagerHook.terminalCommissionRate,

    showCutsArchive,
    setShowCutsArchive,
    toggleCutsArchive,
    billingOrder,
    setBillingOrder,

    showDailySummaryTicket,
    setShowDailySummaryTicket,
    dailySummaryTicketCut,
    setDailySummaryTicketCut,
    openDailySummaryTicket,
    closeDailySummaryTicket,
  }), [
    ordersHook,
    cutManagerHook,
    showCutsArchive,
    toggleCutsArchive,
    billingOrder,
    showDailySummaryTicket,
    dailySummaryTicketCut,
    openDailySummaryTicket,
    closeDailySummaryTicket,
  ]);

  return (
    <HistoryContext.Provider value={value}>
      {children}
    </HistoryContext.Provider>
  );
}
