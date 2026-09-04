"use client";

import React, { createContext, useContext, useMemo } from "react";
import type { Database } from "@/types/supabase";
import type { UserRole } from "@/lib/auth";

export type UserProfile = Database["public"]["Tables"]["profiles"]["Row"];

export interface UserContextValue {
  profile: UserProfile | null;
  role: UserRole | string | null;
  isAdmin: boolean;
  isWaiter: boolean;
  isChef: boolean;
  isAuthenticated: boolean;
}

const UserContext = createContext<UserContextValue | null>(null);

export interface UserProviderProps {
  initialProfile: UserProfile | null;
  children: React.ReactNode;
}

export function UserProvider({ initialProfile, children }: UserProviderProps) {
  const value = useMemo<UserContextValue>(() => {
    const role = (initialProfile?.role as UserRole) ?? null;
    const isAdmin = role === "ADMIN" || role === "MANAGER";
    const isWaiter = role === "WAITER";
    const isChef = role === "CHEF";
    const isAuthenticated = Boolean(initialProfile);

    return {
      profile: initialProfile,
      role,
      isAdmin,
      isWaiter,
      isChef,
      isAuthenticated,
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
