"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { CutSortField, DailyCut } from "../types";

export interface UseDailyCutsArchiveOptions {
  autoFetch?: boolean;
}

export function useDailyCutsArchive(options: UseDailyCutsArchiveOptions = {}) {
  const { autoFetch = false } = options;

  const [dailyCuts, setDailyCuts] = useState<DailyCut[]>([]);
  const [isLoadingCuts, setIsLoadingCuts] = useState(false);
  const [cutsSortField, setCutsSortField] = useState<CutSortField>("cut_date");
  const [cutsSortDir, setCutsSortDir] = useState<"asc" | "desc">("desc");
  const [cutsPage, setCutsPage] = useState(1);
  const [cutsPageSize, setCutsPageSize] = useState(10);
  const [selectedCutDetail, setSelectedCutDetail] = useState<DailyCut | null>(null);

  const fetchDailyCuts = useCallback(async () => {
    try {
      setIsLoadingCuts(true);
      const response = await fetch("/api/daily-cuts");
      const data = await response.json();
      setDailyCuts(data.cuts || []);
    } catch (err) {
      console.error("Error fetching daily cuts:", err);
    } finally {
      setIsLoadingCuts(false);
    }
  }, []);

  useEffect(() => {
    if (autoFetch) {
      void fetchDailyCuts();
    }
  }, [autoFetch, fetchDailyCuts]);

  const sortedDailyCuts = useMemo(() => {
    return [...dailyCuts].sort((a, b) => {
      let comp = 0;
      if (cutsSortField === "cut_date") {
        comp = a.cut_date.localeCompare(b.cut_date);
      } else if (cutsSortField === "total_orders") {
        comp = a.total_orders - b.total_orders;
      } else if (cutsSortField === "venta_neta") {
        comp = a.venta_neta - b.venta_neta;
      } else if (cutsSortField === "utilidad_final") {
        comp = a.utilidad_final - b.utilidad_final;
      }
      return cutsSortDir === "asc" ? comp : -comp;
    });
  }, [dailyCuts, cutsSortField, cutsSortDir]);

  useEffect(() => {
    setCutsPage(1);
  }, [cutsSortField, cutsSortDir, cutsPageSize]);

  const cutsTotalPages = Math.ceil(sortedDailyCuts.length / cutsPageSize) || 1;

  const paginatedDailyCuts = useMemo(() => {
    const start = (cutsPage - 1) * cutsPageSize;
    return sortedDailyCuts.slice(start, start + cutsPageSize);
  }, [sortedDailyCuts, cutsPage, cutsPageSize]);

  return {
    dailyCuts,
    setDailyCuts,
    sortedDailyCuts,
    paginatedDailyCuts,
    cutsTotalPages,
    totalCuts: sortedDailyCuts.length,
    cutsSortField,
    setCutsSortField,
    cutsSortDir,
    setCutsSortDir,
    cutsPage,
    setCutsPage,
    cutsPageSize,
    setCutsPageSize,
    selectedCutDetail,
    setSelectedCutDetail,
    isLoadingCuts,
    refetch: fetchDailyCuts,
  };
}
