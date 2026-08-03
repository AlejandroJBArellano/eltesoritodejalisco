"use client";

import React, { createContext, useContext } from "react";
import type { TenantContextType } from "@/lib/tenant";

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantContextType;
  children: React.ReactNode;
}) {
  return (
    <TenantContext.Provider value={tenant}>{children}</TenantContext.Provider>
  );
}

export function useTenant() {
  const context = useContext(TenantContext);
  if (!context) {
    throw new Error("useTenant must be used within a TenantProvider");
  }
  return context;
}
