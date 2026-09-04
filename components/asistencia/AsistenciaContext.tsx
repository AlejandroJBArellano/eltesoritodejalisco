"use client";

import React, { createContext, useContext } from "react";
import { useAsistenciaData } from "./hooks/useAsistenciaData";

type AsistenciaContextValue = ReturnType<typeof useAsistenciaData>;

const AsistenciaContext = createContext<AsistenciaContextValue | null>(null);

export function AsistenciaProvider({ children }: { children: React.ReactNode }) {
  const value = useAsistenciaData();

  return (
    <AsistenciaContext.Provider value={value}>
      {children}
    </AsistenciaContext.Provider>
  );
}

export function useOptionalAsistenciaContext() {
  return useContext(AsistenciaContext);
}

export function useAsistenciaContext() {
  const context = useContext(AsistenciaContext);
  if (!context) {
    throw new Error(
      "useAsistenciaContext must be used within an AsistenciaProvider",
    );
  }
  return context;
}
