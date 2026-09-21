"use client";

import { logout } from "@/app/login/actions";
import { useTenant } from "@/components/TenantProvider";
import { useOptionalUser } from "@/components/UserProvider";
import { PushNotificationPrompt } from "@/components/notifications/PushNotificationPrompt";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const user = useOptionalUser();
  const [email, setEmail] = useState<string | null>(
    user?.profile?.email ?? null,
  );
  const { system_name } = useTenant();

  useEffect(() => {
    const supabase = createClient();

    // Fetch initial user
    supabase.auth.getUser().then(({ data: { user } }) => {
      setEmail(user?.email ?? null);
    });

    // Listen to auth state changes to dynamically update the user email
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setEmail(session?.user?.email ?? null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [pathname]);

  // Hide Navbar on login or auth pages
  if (pathname.startsWith("/login") || pathname.startsWith("/auth")) {
    return null;
  }

  if (email === null) return null;

  const systemName = system_name;
  const endsWithOS = systemName
    ? systemName.toLowerCase().endsWith("os")
    : false;
  const prefix = endsWithOS ? systemName.slice(0, -2) : systemName || "";
  const suffix = endsWithOS ? systemName.slice(-2) : "";

  const isWaiter = user?.isWaiter ?? false;
  const isInventory = user?.isInventory ?? false;

  // Si cuenta con hasPermission y no es un rol simple estático
  let navLinks: Array<{ href: string; label: string }> = [];

  if (isInventory) {
    navLinks = [
      { href: "/inventario", label: "Inventario" },
      { href: "/tareas", label: "Tareas" },
    ];
  } else if (user?.roleData && !user.roleData.is_system && user.hasPermission) {
    // Para roles personalizados, construimos enlaces según sus permisos activos
    if (user.hasPermission("pos.view")) {
      navLinks.push({ href: "/pos", label: "POS" });
    }
    if (user.hasPermission("kitchen.view")) {
      navLinks.push({ href: "/kitchen", label: "Cocina" });
    }
    if (user.hasPermission("inventory.view")) {
      navLinks.push({ href: "/inventario", label: "Inventario" });
    }
    if (user.hasPermission("finance.view_reports") || user.isAdmin) {
      navLinks.push({ href: "/history", label: "Historial" });
    }
    if (user.hasPermission("team.view")) {
      navLinks.push({ href: "/tareas", label: "Tareas" });
    }
  } else {
    navLinks = [
      { href: "/pos", label: "POS" },
      { href: "/kitchen", label: "Cocina" },
      ...(!isWaiter ? [{ href: "/history", label: "Historial" }] : []),
    ];
  }

  return (
    <nav className="bg-dark/85 backdrop-blur-md border-b border-border/80 text-white sticky top-0 z-40 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-14 sm:h-16 items-center gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-lg sm:text-xl font-bold tracking-tight shrink-0 group"
          >
            <img
              src="/logo-icon-orange.svg"
              alt="Logo"
              className="w-6 h-6 sm:w-7 sm:h-7 object-contain transition-transform duration-150 group-hover:scale-105"
            />
            <div className="flex items-center">
              <span className="text-white font-black">
                {prefix.toUpperCase()}
              </span>
              {suffix && (
                <span className="text-warning font-black">
                  {suffix.toUpperCase()}
                </span>
              )}
            </div>
          </Link>

          {/* Quick nav links */}
          <div className="hidden sm:flex items-center gap-1">
            {navLinks.map((link) => {
              const isActive =
                pathname === link.href || pathname.startsWith(link.href + "/");
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-150 ${
                    isActive
                      ? "bg-primary/15 text-primary border border-primary/25"
                      : "text-text-light/60 hover:text-text-light hover:bg-white/5 border border-transparent"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right: notifications + email + logout */}
          <div className="flex items-center gap-3 shrink-0">
            <PushNotificationPrompt
              compact
              role={
                user?.role === "CHEF"
                  ? "KITCHEN"
                  : ((user?.role as
                      "ADMIN" | "MANAGER" | "WAITER" | undefined) ?? "ADMIN")
              }
            />
            {email && (
              <span
                className="hidden sm:block text-xs font-medium text-text-light/40 max-w-45 truncate"
                title={email}
              >
                {email}
              </span>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="text-xs font-semibold text-text-light/60 hover:text-rose-400 bg-white/4 hover:bg-rose-500/10 border border-border/60 hover:border-rose-500/20 px-3 py-1.5 rounded-lg transition-all duration-150 active:scale-[0.98] cursor-pointer"
              >
                Salir
              </button>
            </form>
          </div>
        </div>
      </div>
    </nav>
  );
}
