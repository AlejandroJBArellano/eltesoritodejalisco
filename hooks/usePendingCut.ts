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
      const data: PendingCutResponse = await response.json();
      setPendingDate(data?.pendingDate ?? null);
      setPendingOrders(Number(data?.pendingOrders ?? 0));
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
