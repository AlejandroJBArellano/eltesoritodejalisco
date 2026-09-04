"use client";

import React, { createContext, useContext, useMemo } from "react";
import { useReportsData } from "./hooks/useReportsData";
import type {
  DailySaleExportItem,
  EnrichedProductSaleItem,
  Period,
  ReportData,
} from "./types";

export interface ReportsContextValue {
  data: ReportData | null;
  isLoading: boolean;
  errorMessage: string | null;
  period: Period;
  customStartDate: string;
  customEndDate: string;
  setCustomStartDate: (date: string) => void;
  setCustomEndDate: (date: string) => void;
  handlePeriodChange: (p: Period) => void;
  handleApplyCustomDates: () => void;
  refreshData: () => void;
  dailySalesData: DailySaleExportItem[];
  enrichedProductSales: EnrichedProductSaleItem[];
  netUtility: number;
}

const ReportsContext = createContext<ReportsContextValue | null>(null);

export function useReportsContext(): ReportsContextValue {
  const ctx = useContext(ReportsContext);
  if (!ctx) {
    throw new Error("useReportsContext must be used within a ReportsProvider");
  }
  return ctx;
}

export function useReportsContextNullable(): ReportsContextValue | null {
  return useContext(ReportsContext);
}

export interface ReportsProviderProps {
  children: React.ReactNode;
  initialPeriod?: Period;
  autoFetch?: boolean;
}

export function ReportsProvider({
  children,
  initialPeriod = "7days",
  autoFetch = true,
}: ReportsProviderProps) {
  const reportsHook = useReportsData({ initialPeriod, autoFetch });

  const value = useMemo<ReportsContextValue>(() => reportsHook, [reportsHook]);

  return (
    <ReportsContext.Provider value={value}>{children}</ReportsContext.Provider>
  );
}
