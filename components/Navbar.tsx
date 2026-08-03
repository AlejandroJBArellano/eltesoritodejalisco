"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { logout } from "@/app/login/actions";
import { useEffect, useState } from "react";
import { useTenant } from "@/components/TenantProvider";

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

  const systemName = system_name || "TesoritoOS";
  const endsWithOS = systemName.toLowerCase().endsWith("os");
  const prefix = endsWithOS ? systemName.slice(0, -2) : systemName;
  const suffix = endsWithOS ? systemName.slice(-2) : "";

  const navLinks = [
    { href: "/pos", label: "POS" },
    { href: "/kitchen", label: "Cocina" },
    { href: "/history", label: "Historial" },
  ];

  return (
    <nav className="bg-dark border-b border-white/5 text-white sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center gap-4">
          {/* Logo */}
          <Link
            href="/"
            className="text-xl font-black tracking-tighter shrink-0"
          >
            <span className="text-primary">{prefix.toUpperCase()}</span>
            {suffix && (
              <span className="text-warning">{suffix.toUpperCase()}</span>
            )}
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
                      : "text-[#E0E0E0]/50 hover:text-[#E0E0E0] hover:bg-white/5"
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
                className="hidden sm:block text-xs font-medium text-[#E0E0E0]/40 max-w-[180px] truncate"
                title={email}
              >
                {email}
              </span>
            )}
            <form action={logout}>
              <button
                type="submit"
                className="text-xs font-black uppercase tracking-wider text-[#E0E0E0]/50 hover:text-red-400 bg-white/5 hover:bg-red-500/10 border border-transparent hover:border-red-500/20 px-3 py-1.5 rounded-lg transition-all"
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
