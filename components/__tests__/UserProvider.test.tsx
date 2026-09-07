import React from "react";
import { describe, it, expect, vi } from "vitest";
import { renderHook } from "@testing-library/react";
import {
  UserProvider,
  useUser,
  useOptionalUser,
  type UserProfile,
} from "../UserProvider";

const mockAdminProfile: UserProfile = {
  id: "u-admin",
  email: "admin@restaurante.com",
  full_name: "Administrador General",
  role: "ADMIN",
  tenant_id: "t-1",
  updated_at: "2026-01-01",
  pin: "1234",
};

const mockWaiterProfile: UserProfile = {
  id: "u-waiter",
  email: "mesero@restaurante.com",
  full_name: "Mesero Juan",
  role: "WAITER",
  tenant_id: "t-1",
  updated_at: "2026-01-01",
  pin: null,
};

const mockChefProfile: UserProfile = {
  id: "u-chef",
  email: "chef@restaurante.com",
  full_name: "Chef Mario",
  role: "CHEF",
  tenant_id: "t-1",
  updated_at: "2026-01-01",
  pin: null,
};

describe("UserProvider and useUser Hook", () => {
  it("throws error when useUser is called outside UserProvider", () => {
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useUser())).toThrow(
      "useUser must be used within a UserProvider",
    );
    spy.mockRestore();
  });

  it("returns null when useOptionalUser is called outside UserProvider", () => {
    const { result } = renderHook(() => useOptionalUser());
    expect(result.current).toBeNull();
  });

  it("provides correct context values for ADMIN", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider initialProfile={mockAdminProfile}>{children}</UserProvider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.profile).toEqual(mockAdminProfile);
    expect(result.current.role).toBe("ADMIN");
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isWaiter).toBe(false);
    expect(result.current.isChef).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
  });

  it("provides correct context values for WAITER", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider initialProfile={mockWaiterProfile}>{children}</UserProvider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.role).toBe("WAITER");
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isWaiter).toBe(true);
    expect(result.current.isChef).toBe(false);
  });

  it("provides correct context values for CHEF", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider initialProfile={mockChefProfile}>{children}</UserProvider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.role).toBe("CHEF");
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isWaiter).toBe(false);
    expect(result.current.isChef).toBe(true);
  });

  it("handles null profile gracefully", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider initialProfile={null}>{children}</UserProvider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.profile).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isWaiter).toBe(false);
    expect(result.current.isChef).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
  });
});
