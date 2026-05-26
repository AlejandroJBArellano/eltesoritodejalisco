"use client";

import { useCallback, useEffect, useState } from "react";

interface PendingCutResponse {
  hasPendingCut: boolean;
  pendingDate: string | null;
  pendingOrders: number;
}

export function usePendingCut() {
  const [pendingDate, setPendingDate] = useState<string | null>(null);
  const [pendingOrders, setPendingOrders] = useState(0);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const response = await fetch("/api/cortes/pendiente-ayer");
      if (!response.ok) {
        throw new Error("No se pudo verificar el corte pendiente");
      }
      const data: PendingCutResponse = await response.json();
      setPendingDate(data?.pendingDate ?? null);
      setPendingOrders(data?.pendingOrders ?? 0);
    } catch (error) {
      console.error("Error checking pending cut:", error);
      setPendingDate(null);
      setPendingOrders(0);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  return {
    loading,
    hasPendingCut: !!pendingDate,
    pendingDate,
    pendingOrders,
    refresh,
  };
}
