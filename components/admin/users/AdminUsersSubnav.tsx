"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Users, Clock, ClipboardCheck } from "lucide-react";

export function AdminUsersSubnav() {
  const pathname = usePathname();

  const tabs = [
    {
      href: "/admin/users/list",
      label: "Colaboradores y Roles",
      icon: Users,
      match: (path: string) =>
        path === "/admin/users/list" || path === "/admin/users",
    },
    {
      href: "/admin/users/horarios",
      label: "Horarios y Asistencia",
      icon: Clock,
      match: (path: string) => path.startsWith("/admin/users/horarios"),
    },
    {
      href: "/admin/users/tareas",
      label: "Control de Tareas",
      icon: ClipboardCheck,
      match: (path: string) => path.startsWith("/admin/users/tareas"),
    },
  ];

  return (
    <div
      data-testid="admin-users-subnav"
      className="bg-card/60 backdrop-blur-md border-b border-border/80 sticky top-14 sm:top-16 z-30"
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <nav className="flex items-center gap-2 py-2.5 overflow-x-auto no-scrollbar">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = tab.match(pathname);

            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold uppercase tracking-wider transition-all shrink-0 ${
                  isActive
                    ? "bg-primary/20 text-primary border border-primary/30 shadow-sm"
                    : "text-text-light/60 hover:text-white hover:bg-white/5 border border-transparent"
                }`}
              >
                <Icon
                  className={`w-4 h-4 ${
                    isActive ? "text-primary" : "text-text-light/60"
                  }`}
                />
                <span>{tab.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>
    </div>
  );
}
