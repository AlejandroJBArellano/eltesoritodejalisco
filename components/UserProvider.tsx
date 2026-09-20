"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Database } from "@/types/supabase";
import type { UserRole } from "@/lib/auth";
import {
  extractPermissions,
  hasPermission as checkPermission,
  hasAnyPermission as checkAnyPermission,
  hasAllPermissions as checkAllPermissions,
  type PermissionKey,
  type RoleData,
} from "@/lib/permissions";

export type BaseUserProfile = Database["public"]["Tables"]["profiles"]["Row"];

export interface UserProfile extends BaseUserProfile {
  role_data?: RoleData | null;
  permissions?: string[] | null;
}

export interface UserContextValue {
  profile: UserProfile | null;
  role: UserRole | string | null;
  roleData?: RoleData | null;
  permissions?: string[];
  isAdmin: boolean;
  isWaiter: boolean;
  isChef: boolean;
  isInventory?: boolean;
  isAuthenticated: boolean;
  hasPermission?: (permission: PermissionKey) => boolean;
  hasAnyPermission?: (permissions: PermissionKey[]) => boolean;
  hasAllPermissions?: (permissions: PermissionKey[]) => boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export interface UserProviderProps {
  initialProfile: UserProfile | null;
  children: React.ReactNode;
}

export function UserProvider({ initialProfile, children }: UserProviderProps) {
  const value = useMemo<UserContextValue>(() => {
    const role = (initialProfile?.role as UserRole) ?? null;
    const roleData = initialProfile?.role_data ?? null;
    const permissions = extractPermissions(initialProfile);

    // Compatibilidad retroactiva y derivación de roles
    const isAdmin =
      role === "ADMIN" ||
      role === "MANAGER" ||
      checkPermission(initialProfile, "team.manage_roles") ||
      permissions.includes("*");

    const isChef =
      role === "CHEF" ||
      (checkPermission(initialProfile, "kitchen.view") &&
        !checkPermission(initialProfile, "pos.view") &&
        !isAdmin);

    const isWaiter =
      role === "WAITER" ||
      (checkPermission(initialProfile, "pos.view") &&
        !checkPermission(initialProfile, "kitchen.view") &&
        !isAdmin);

    const isInventory =
      role === "INVENTORY" ||
      (checkPermission(initialProfile, "inventory.adjust_stock") &&
        !checkPermission(initialProfile, "kitchen.view") &&
        !checkPermission(initialProfile, "pos.view") &&
        !isAdmin);

    const isAuthenticated = Boolean(initialProfile);

    return {
      profile: initialProfile,
      role,
      roleData,
      permissions,
      isAdmin,
      isWaiter,
      isChef,
      isInventory,
      isAuthenticated,
      hasPermission: (p: PermissionKey) => checkPermission(initialProfile, p),
      hasAnyPermission: (pList: PermissionKey[]) =>
        checkAnyPermission(initialProfile, pList),
      hasAllPermissions: (pList: PermissionKey[]) =>
        checkAllPermissions(initialProfile, pList),
    };
  }, [initialProfile]);

  return <UserContext.Provider value={value}>{children}</UserContext.Provider>;
}

export function useUser(): UserContextValue {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error("useUser must be used within a UserProvider");
  }
  return context;
}

export function useOptionalUser(): UserContextValue | null {
  return useContext(UserContext);
}
