"use client";

import React, { createContext, useContext } from "react";
import { useAsistenciaHistory } from "./hooks/useAsistenciaHistory";

type AsistenciaHistoryContextValue = ReturnType<typeof useAsistenciaHistory>;

const AsistenciaHistoryContext =
  createContext<AsistenciaHistoryContextValue | null>(null);

export function AsistenciaHistoryProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const value = useAsistenciaHistory();

  return (
    <AsistenciaHistoryContext.Provider value={value}>
      {children}
    </AsistenciaHistoryContext.Provider>
  );
}

export function useAsistenciaHistoryContext() {
  const context = useContext(AsistenciaHistoryContext);
  if (!context) {
    throw new Error(
      "useAsistenciaHistoryContext must be used within an AsistenciaHistoryProvider",
    );
  }
  return context;
}
