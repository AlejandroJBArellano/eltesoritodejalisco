"use client";

import React, { createContext, useContext, useEffect } from "react";
import type { TenantContextType } from "@/lib/tenant";

const TenantContext = createContext<TenantContextType | null>(null);

export function TenantProvider({
  tenant,
  children,
}: {
  tenant: TenantContextType;
  children: React.ReactNode;
}) {
  useEffect(() => {
    const faviconUrl = tenant?.logo_url || "/favicon.ico";
    let link: HTMLLinkElement | null =
      document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.removeAttribute("type");
    link.href = faviconUrl;
  }, [tenant?.logo_url]);

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

export function useOptionalTenant(): TenantContextType | null {
  return useContext(TenantContext);
}
