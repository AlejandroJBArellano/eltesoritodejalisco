import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, renderHook } from "@testing-library/react";
import {
  TenantProvider,
  useTenant,
  useOptionalTenant,
} from "../TenantProvider";
import type { TenantContextType } from "@/lib/tenant";

const mockTenantWithLogo = {
  id: "t-1",
  name: "Tacos Paco",
  slug: "tacos-paco",
  system_name: "Tacos Paco OS",
  logo_url: "https://example.com/logo.png",
  primary_color: "#FF5500",
  secondary_color: "#FF8800",
  dark_bg_color: "#121212",
  commission_rate: 0.05,
} as TenantContextType;

const mockTenantWithoutLogo = {
  ...mockTenantWithLogo,
  id: "t-2",
  name: "Burger Bar",
  slug: "burger-bar",
  logo_url: null,
} as TenantContextType;

describe("TenantProvider and Hooks", () => {
  beforeEach(() => {
    document.head.innerHTML = "";
  });

  it("throws error when useTenant is called outside TenantProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useTenant())).toThrow(
      "useTenant must be used within a TenantProvider",
    );
    spy.mockRestore();
  });

  it("returns null when useOptionalTenant is called outside TenantProvider", () => {
    const { result } = renderHook(() => useOptionalTenant());
    expect(result.current).toBeNull();
  });

  it("provides tenant context to child components and hooks", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <TenantProvider tenant={mockTenantWithLogo}>{children}</TenantProvider>
    );

    const { result } = renderHook(() => useTenant(), { wrapper });
    expect(result.current).toEqual(mockTenantWithLogo);
    expect(result.current.name).toBe("Tacos Paco");

    const { result: optionalResult } = renderHook(() => useOptionalTenant(), {
      wrapper,
    });
    expect(optionalResult.current).toEqual(mockTenantWithLogo);
  });

  it("dynamically updates favicon with tenant.logo_url when link element exists", () => {
    const existingLink = document.createElement("link");
    existingLink.rel = "icon";
    existingLink.type = "image/x-icon";
    existingLink.href = "/default-icon.ico";
    document.head.appendChild(existingLink);

    render(
      <TenantProvider tenant={mockTenantWithLogo}>
        <div>Contenido</div>
      </TenantProvider>,
    );

    const favicon = document.querySelector("link[rel~='icon']");
    expect(favicon).not.toBeNull();
    expect(favicon?.getAttribute("href")).toBe("https://example.com/logo.png");
    expect(favicon?.hasAttribute("type")).toBe(false);
  });

  it("creates a new favicon link element if none exists in head", () => {
    expect(document.querySelector("link[rel~='icon']")).toBeNull();

    render(
      <TenantProvider tenant={mockTenantWithLogo}>
        <div>Contenido</div>
      </TenantProvider>,
    );

    const favicon = document.querySelector("link[rel~='icon']");
    expect(favicon).not.toBeNull();
    expect(favicon?.getAttribute("rel")).toBe("icon");
    expect(favicon?.getAttribute("href")).toBe("https://example.com/logo.png");
  });

  it("falls back to /favicon.ico when tenant.logo_url is null", () => {
    render(
      <TenantProvider tenant={mockTenantWithoutLogo}>
        <div>Contenido</div>
      </TenantProvider>,
    );

    const favicon = document.querySelector("link[rel~='icon']");
    expect(favicon).not.toBeNull();
    expect(favicon?.getAttribute("href")).toBe("/favicon.ico");
  });
});
