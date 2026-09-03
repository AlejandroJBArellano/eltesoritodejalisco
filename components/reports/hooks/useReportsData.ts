"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type {
  DailySaleExportItem,
  EnrichedProductSaleItem,
  Period,
  ReportData,
} from "../types";

export interface UseReportsDataOptions {
  initialPeriod?: Period;
  autoFetch?: boolean;
}

export function useReportsData(options: UseReportsDataOptions = {}) {
  const { initialPeriod = "7days", autoFetch = true } = options;

  const [data, setData] = useState<ReportData | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [period, setPeriod] = useState<Period>(initialPeriod);
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  const fetchData = useCallback(
    async (p: Period, startDateStr?: string, endDateStr?: string) => {
      try {
        setIsLoading(true);
        setErrorMessage(null);
        let url = `/api/reports?period=${p}`;
        if (p === "custom") {
          if (startDateStr) url += `&startDate=${startDateStr}`;
          if (endDateStr) url += `&endDate=${endDateStr}`;
        }
        const response = await fetch(url);
        const json = await response.json();
        if (!response.ok) {
          throw new Error(json.error || "Error al cargar reportes");
        }
        setData(json);
      } catch (err) {
        setErrorMessage(
          err instanceof Error ? err.message : "Error desconocido",
        );
      } finally {
        setIsLoading(false);
      }
    },
    [],
  );

  const handlePeriodChange = useCallback(
    (p: Period) => {
      setPeriod(p);
      if (p !== "custom") {
        fetchData(p);
      }
    },
    [fetchData],
  );

  const handleApplyCustomDates = useCallback(() => {
    if (!customStartDate) return;
    fetchData("custom", customStartDate, customEndDate);
  }, [customStartDate, customEndDate, fetchData]);

  const refreshData = useCallback(() => {
    fetchData(
      period,
      period === "custom" ? customStartDate : undefined,
      period === "custom" ? customEndDate : undefined,
    );
  }, [period, customStartDate, customEndDate, fetchData]);

  useEffect(() => {
    if (autoFetch) {
      fetchData(initialPeriod);
    }
  }, [autoFetch, fetchData, initialPeriod]);

  const dailySalesData = useMemo<DailySaleExportItem[]>(() => {
    if (!data?.salesByDay) return [];
    const totalPeriodSales = data.summary?.totalSales || 0;
    const sortedDates = Object.keys(data.salesByDay).sort();

    return sortedDates.map((date) => {
      const totalSales = Number(data.salesByDay[date] || 0);
      const totalOrders = Number(data.ordersByDay?.[date] || 0);
      const averageTicket =
        totalOrders > 0 ? totalSales / totalOrders : totalSales;

      const dayDate = new Date(`${date}T12:00:00-06:00`);
      const rawDay = dayDate.toLocaleDateString("es-MX", {
        weekday: "long",
        timeZone: "America/Mexico_City",
      });
      const dayOfWeek = rawDay.charAt(0).toUpperCase() + rawDay.slice(1);

      const topItem = data.itemsByDay?.[date]?.[0];
      const topProduct = topItem
        ? `${topItem.name} (${topItem.quantity} u.)`
        : "N/A";
      const percentageOfPeriod =
        totalPeriodSales > 0 ? (totalSales / totalPeriodSales) * 100 : 0;

      return {
        date,
        dayOfWeek,
        totalSales,
        totalOrders,
        averageTicket,
        topProduct,
        percentageOfPeriod,
      };
    });
  }, [data]);

  const enrichedProductSales = useMemo<EnrichedProductSaleItem[]>(() => {
    if (!data?.productSales) return [];
    const totalSales = data.summary?.totalSales || 0;
    return data.productSales.map((p, index) => ({
      ...p,
      rank: index + 1,
      averageUnitPrice: p.quantity > 0 ? p.revenue / p.quantity : 0,
      percentageOfTotal: totalSales > 0 ? (p.revenue / totalSales) * 100 : 0,
    }));
  }, [data]);

  const netUtility = useMemo(() => {
    if (!data?.summary) return 0;
    return data.summary.totalSales - (data.summary.totalExpenses || 0);
  }, [data]);

  return {
    data,
    isLoading,
    errorMessage,
    period,
    customStartDate,
    customEndDate,
    setCustomStartDate,
    setCustomEndDate,
    handlePeriodChange,
    handleApplyCustomDates,
    refreshData,
    dailySalesData,
    enrichedProductSales,
    netUtility,
  };
}
