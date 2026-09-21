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
  role_id: null,
  tenant_id: "t-1",
  updated_at: "2026-01-01",
  pin: "1234",
};

const mockWaiterProfile: UserProfile = {
  id: "u-waiter",
  email: "mesero@restaurante.com",
  full_name: "Mesero Juan",
  role: "WAITER",
  role_id: null,
  tenant_id: "t-1",
  updated_at: "2026-01-01",
  pin: null,
};

const mockChefProfile: UserProfile = {
  id: "u-chef",
  email: "chef@restaurante.com",
  full_name: "Chef Mario",
  role: "CHEF",
  role_id: null,
  tenant_id: "t-1",
  updated_at: "2026-01-01",
  pin: null,
};

const mockInventoryProfile: UserProfile = {
  id: "u-inv",
  email: "almacen@restaurante.com",
  full_name: "Almacenista Pedro",
  role: "INVENTORY",
  role_id: null,
  tenant_id: "t-1",
  updated_at: "2026-01-01",
  pin: null,
};

const mockCustomProfile: UserProfile = {
  id: "u-custom",
  email: "capitan@restaurante.com",
  full_name: "Capitán Carlos",
  role: "Capitán de Meseros",
  role_id: "role-capitan-1",
  tenant_id: "t-1",
  updated_at: "2026-01-01",
  pin: null,
  role_data: {
    id: "role-capitan-1",
    tenant_id: "t-1",
    name: "Capitán de Meseros",
    is_system: false,
    permissions: ["pos.view", "pos.create_order", "pos.apply_discount"],
  },
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

  it("provides correct context values and permission evaluation for ADMIN", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider initialProfile={mockAdminProfile}>{children}</UserProvider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.profile).toEqual(mockAdminProfile);
    expect(result.current.role).toBe("ADMIN");
    expect(result.current.isAdmin).toBe(true);
    expect(result.current.isWaiter).toBe(false);
    expect(result.current.isChef).toBe(false);
    expect(result.current.isInventory).toBe(false);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasPermission?.("pos.create_order")).toBe(true);
    expect(result.current.hasPermission?.("team.manage_roles")).toBe(true);
    expect(
      result.current.hasAnyPermission?.(["pos.create_order", "menu.manage"]),
    ).toBe(true);
    expect(
      result.current.hasAllPermissions?.([
        "pos.create_order",
        "team.manage_roles",
      ]),
    ).toBe(true);
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
    expect(result.current.isInventory).toBe(false);
    expect(result.current.hasPermission?.("pos.create_order")).toBe(true);
    expect(result.current.hasPermission?.("team.manage_roles")).toBe(false);
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
    expect(result.current.isInventory).toBe(false);
    expect(result.current.hasPermission?.("kitchen.view")).toBe(true);
    expect(result.current.hasPermission?.("pos.create_order")).toBe(false);
  });

  it("provides correct context values for INVENTORY", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider initialProfile={mockInventoryProfile}>
        {children}
      </UserProvider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.role).toBe("INVENTORY");
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isWaiter).toBe(false);
    expect(result.current.isChef).toBe(false);
    expect(result.current.isInventory).toBe(true);
    expect(result.current.isAuthenticated).toBe(true);
    expect(result.current.hasPermission?.("inventory.view")).toBe(true);
    expect(result.current.hasPermission?.("kitchen.view")).toBe(false);
  });

  it("evaluates custom role permissions correctly", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider initialProfile={mockCustomProfile}>{children}</UserProvider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.role).toBe("Capitán de Meseros");
    expect(result.current.roleData?.name).toBe("Capitán de Meseros");
    expect(result.current.hasPermission?.("pos.apply_discount")).toBe(true);
    expect(result.current.hasPermission?.("pos.cancel_order")).toBe(false);
    expect(
      result.current.hasAnyPermission?.([
        "pos.cancel_order",
        "pos.apply_discount",
      ]),
    ).toBe(true);
    expect(
      result.current.hasAllPermissions?.(["pos.view", "pos.apply_discount"]),
    ).toBe(true);
    expect(
      result.current.hasAllPermissions?.(["pos.view", "team.manage_roles"]),
    ).toBe(false);
  });

  it("handles null profile gracefully", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <UserProvider initialProfile={null}>{children}</UserProvider>
    );

    const { result } = renderHook(() => useUser(), { wrapper });

    expect(result.current.profile).toBeNull();
    expect(result.current.role).toBeNull();
    expect(result.current.roleData).toBeNull();
    expect(result.current.permissions).toEqual([]);
    expect(result.current.isAdmin).toBe(false);
    expect(result.current.isWaiter).toBe(false);
    expect(result.current.isChef).toBe(false);
    expect(result.current.isInventory).toBe(false);
    expect(result.current.isAuthenticated).toBe(false);
    expect(result.current.hasPermission?.("pos.view")).toBe(false);
  });
});
