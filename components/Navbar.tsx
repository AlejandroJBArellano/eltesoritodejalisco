"use client";

import { logout } from "@/app/login/actions";
import { useTenant } from "@/components/TenantProvider";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

export default function Navbar() {
  const pathname = usePathname();
  const [email, setEmail] = useState<string | null>(null);
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
  const endsWithOS = systemName ? systemName.toLowerCase().endsWith("os") : false;
  const prefix = endsWithOS ? systemName.slice(0, -2) : (systemName || "");
  const suffix = endsWithOS ? systemName.slice(-2) : "";

  const navLinks = [
    { href: "/pos", label: "POS" },
    { href: "/kitchen", label: "Cocina" },
    { href: "/history", label: "Historial" },
  ];

  return (
    <nav className="bg-dark border-b border-border text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="flex items-center gap-2.5 text-xl font-black tracking-tighter shrink-0 group"
          >
            <svg className="w-7 h-7 text-primary transition-transform group-hover:scale-105" fill="none" viewBox="0 0 160 100" stroke="currentColor" stroke-width="5.5" stroke-linecap="round" stroke-linejoin="round">
              <path d="M 40,72 C 30,72 24,46 31,24 C 36,8 46,32 55,52" />
              <path d="M 120,72 C 130,72 136,46 129,24 C 124,8 114,32 105,52" />
              <path d="M 55,52 Q 80,44 105,52" />
              <path d="M 60,49 L 63,28 L 71,38 L 80,16 L 89,38 L 97,28 L 100,49" />
            </svg>
            <div className="flex items-center">
              <span className="text-white">{prefix.toUpperCase()}</span>
              {suffix && (
                <span className="text-warning">{suffix.toUpperCase()}</span>
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-black uppercase tracking-wider transition-all ${
                    isActive
                      ? "bg-primary/15 text-primary"
                      : "text-text-light/50 hover:text-text-light hover:bg-white/5"
                  }`}
                >
                  {link.label}
                </Link>
              );
            })}
          </div>

          {/* Right: email + logout */}
          <div className="flex items-center gap-3 shrink-0">
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
                className="text-xs font-black uppercase tracking-wider text-text-light/50 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 px-3 py-1.5 rounded-lg transition-all duration-200 ease-out"
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
