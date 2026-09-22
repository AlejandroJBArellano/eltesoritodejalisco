"use client";

import React, { useEffect, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTenant } from "@/components/TenantProvider";
import { useOptionalUser } from "@/components/UserProvider";
import {
  X,
  Receipt,
  ChefHat,
  Clock,
  CheckSquare,
  Users,
  CalendarDays,
  ClipboardCheck,
  UtensilsCrossed,
  Package,
  UserCheck,
  ShoppingBag,
  ReceiptText,
  TrendingDown,
  BarChart3,
  Activity,
  Settings,
  LayoutDashboard,
  ChevronRight,
} from "lucide-react";

export interface SidebarDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

interface NavItem {
  href: string;
  label: string;
  icon: React.ElementType;
  badge?: string;
  visible: boolean;
}

interface NavGroup {
  title: string;
  items: NavItem[];
}

export function SidebarDrawer({ isOpen, onClose }: SidebarDrawerProps) {
  const pathname = usePathname();
  const user = useOptionalUser();
  const { system_name, logo_url } = useTenant();
  const [, startTransition] = useTransition();

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  // Prevent background scrolling when drawer is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const isAdmin = user?.isAdmin ?? false;
  const isWaiter = user?.isWaiter ?? false;
  const isChef = user?.isChef ?? false;
  const isInventory = user?.isInventory ?? false;
  const hasPermission = user?.hasPermission;

  const canAccessPOS =
    isAdmin || isWaiter || (hasPermission ? hasPermission("pos.view") : false);
  const canAccessKitchen =
    isAdmin ||
    isChef ||
    (hasPermission ? hasPermission("kitchen.view") : false);
  const canAccessInventory =
    isAdmin ||
    isInventory ||
    (hasPermission ? hasPermission("inventory.view") : false);
  const canAccessReports =
    isAdmin || (hasPermission ? hasPermission("finance.view_reports") : false);
  const canAccessExpenses =
    isAdmin ||
    (hasPermission ? hasPermission("finance.manage_expenses") : false);
  const canAccessCustomers =
    isAdmin ||
    isWaiter ||
    (hasPermission ? hasPermission("customers.view") : false);
  const canAccessMenu =
    isAdmin || (hasPermission ? hasPermission("menu.manage") : false);

  const groups: NavGroup[] = [
    {
      title: "Operación Diaria",
      items: [
        {
          href: "/pos",
          label: "Punto de Venta",
          icon: Receipt,
          visible: canAccessPOS,
        },
        {
          href: "/kitchen",
          label: "Sistema de Cocina",
          icon: ChefHat,
          visible: canAccessKitchen,
        },
        {
          href: "/asistencia",
          label: "Asistencia Diaria",
          icon: Clock,
          visible: true,
        },
        {
          href: "/tareas",
          label: "Tareas Diarias",
          icon: CheckSquare,
          visible: true,
        },
      ],
    },
    {
      title: "Gestión de Equipo",
      items: [
        {
          href: "/admin/users/list",
          label: "Colaboradores y Roles",
          icon: Users,
          visible: isAdmin,
        },
        {
          href: "/admin/users/horarios",
          label: "Horarios y Turnos",
          icon: CalendarDays,
          visible: isAdmin,
        },
        {
          href: "/admin/users/tareas",
          label: "Control de Tareas",
          icon: ClipboardCheck,
          visible: isAdmin,
        },
      ],
    },
    {
      title: "Catálogo y Clientes",
      items: [
        {
          href: "/menu",
          label: "Gestión de Menú",
          icon: UtensilsCrossed,
          visible: canAccessMenu,
        },
        {
          href: "/inventario",
          label: "Inventario e Insumos",
          icon: Package,
          visible: canAccessInventory,
        },
        {
          href: "/customers",
          label: "Clientes y Fidelidad",
          icon: UserCheck,
          visible: canAccessCustomers,
        },
        {
          href: "/admin/pickup",
          label: "Portal Kittn Pickup",
          icon: ShoppingBag,
          visible: isAdmin,
        },
      ],
    },
    {
      title: "Finanzas y Reportes",
      items: [
        {
          href: "/history",
          label: "Historial de Órdenes",
          icon: ReceiptText,
          visible: canAccessReports || !isWaiter,
        },
        {
          href: "/gastos",
          label: "Control de Gastos",
          icon: TrendingDown,
          visible: canAccessExpenses || isAdmin,
        },
        {
          href: "/reports",
          label: "Reportes de Ventas",
          icon: BarChart3,
          visible: canAccessReports,
        },
        {
          href: "/analytics/hourly",
          label: "Detector de Horas Pico",
          icon: Activity,
          visible: canAccessReports,
        },
      ],
    },
    {
      title: "Configuración",
      items: [
        {
          href: "/admin/settings",
          label: "Configuración General",
          icon: Settings,
          visible: isAdmin,
        },
      ],
    },
  ];

  const handleLinkClick = () => {
    startTransition(() => {
      onClose();
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Menú de navegación global"
      className="fixed inset-0 z-50 overflow-hidden"
    >
      {/* Backdrop */}
      <div
        data-testid="sidebar-backdrop"
        onClick={onClose}
        className="fixed inset-0 bg-black/60 backdrop-blur-sm transition-opacity duration-200"
      />

      {/* Drawer Panel */}
      <div
        data-testid="sidebar-drawer-panel"
        className="fixed inset-y-0 left-0 max-w-xs w-full bg-dark/95 border-r border-border/80 shadow-2xl flex flex-col z-10 backdrop-blur-xl animate-in slide-in-from-left duration-200"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 h-16 border-b border-border/80 shrink-0">
          <Link
            href="/"
            onClick={handleLinkClick}
            className="flex items-center gap-2.5 font-bold tracking-tight text-white hover:opacity-90 transition-opacity"
          >
            {logo_url ? (
              <img
                src={logo_url}
                alt="Logo"
                className="w-7 h-7 object-contain rounded"
              />
            ) : (
              <img
                src="/logo-icon-orange.svg"
                alt="Logo"
                className="w-7 h-7 object-contain"
              />
            )}
            <div className="flex flex-col">
              <span className="text-sm font-black tracking-wider text-white">
                {system_name || "KITTNOS"}
              </span>
              <span className="text-[10px] text-text-light/50 uppercase tracking-widest font-mono">
                Menú Principal
              </span>
            </div>
          </Link>

          <button
            type="button"
            data-testid="sidebar-close-button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="p-2 rounded-lg text-text-light/60 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Dashboard Direct Home Link */}
        <div className="px-3 pt-3">
          <Link
            href="/"
            onClick={handleLinkClick}
            className={`flex items-center justify-between px-3 py-2.5 rounded-lg text-xs font-bold transition-all ${
              pathname === "/"
                ? "bg-primary/20 text-primary border border-primary/30"
                : "text-text-light hover:text-white hover:bg-white/5 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-2.5">
              <LayoutDashboard className="w-4 h-4 text-primary" />
              <span>Panel de Inicio</span>
            </div>
            <ChevronRight className="w-3.5 h-3.5 opacity-50" />
          </Link>
        </div>

        {/* Navigation Content */}
        <div className="flex-1 overflow-y-auto px-3 py-2 space-y-5 custom-scrollbar">
          {groups.map((group) => {
            const visibleItems = group.items.filter((item) => item.visible);
            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-1">
                <p className="px-3 text-[10px] font-black uppercase tracking-wider text-text-light/40">
                  {group.title}
                </p>
                <div className="space-y-0.5">
                  {visibleItems.map((item) => {
                    const Icon = item.icon;
                    const isActive =
                      pathname === item.href ||
                      (item.href !== "/" && pathname.startsWith(item.href));

                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        onClick={handleLinkClick}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                          isActive
                            ? "bg-primary/15 text-primary font-bold border border-primary/25"
                            : "text-text-light/80 hover:text-white hover:bg-white/5 border border-transparent"
                        }`}
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Icon
                            className={`w-4 h-4 shrink-0 ${
                              isActive ? "text-primary" : "text-text-light/60"
                            }`}
                          />
                          <span className="truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className="text-[10px] uppercase font-bold px-1.5 py-0.2 bg-primary/20 text-primary rounded">
                            {item.badge}
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* User Footer */}
        {user?.profile && (
          <div className="p-3 border-t border-border/80 bg-black/20 shrink-0">
            <div className="flex items-center justify-between">
              <div className="flex flex-col min-w-0">
                <span className="text-xs font-bold text-text-light truncate">
                  {user.profile.full_name || user.profile.email}
                </span>
                <span className="text-[10px] font-mono text-primary uppercase">
                  {user.profile.role || "USUARIO"}
                </span>
              </div>
              <span className="text-[10px] text-text-light/40 font-mono">
                ESC para cerrar
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
