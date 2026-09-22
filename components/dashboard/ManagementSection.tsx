"use client";

import React from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import {
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Package,
  ClipboardCheck,
  UserCog,
  Clock,
  Settings,
} from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { useOptionalUser } from "@/components/UserProvider";
import { useOptionalTenant } from "@/components/TenantProvider";

export interface ManagementTenantInfo {
  stripe_charges_enabled?: boolean | null;
  slug?: string | null;
}

export interface ManagementSectionProps {
  isAdmin?: boolean;
  isWaiter?: boolean;
  isInventory?: boolean;
  tenant?: ManagementTenantInfo;
}

export function ManagementSection(props?: ManagementSectionProps) {
  const user = useOptionalUser();
  const tenantContext = useOptionalTenant();

  const isAdmin = props?.isAdmin ?? user?.isAdmin ?? false;
  const isWaiter = props?.isWaiter ?? user?.isWaiter ?? false;
  const isInventory = props?.isInventory ?? user?.isInventory ?? false;
  const tenant = props?.tenant ??
    tenantContext ?? { slug: "", stripe_charges_enabled: false };

  if (!isAdmin && !isWaiter && !isInventory) return null;

  const isStripeEnabled = Boolean(tenant.stripe_charges_enabled);
  const slug = tenant.slug || "";

  return (
    <CollapsibleSection
      title="Gestión y Clientes"
      dotColorClass="bg-emerald-500"
    >
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
        {(isAdmin || isWaiter) && (
          <ModuleCard
            title="Kittn Pickup & Horarios"
            href={
              isAdmin
                ? "/admin/pickup"
                : isStripeEnabled
                  ? `https://${slug}.trykittn.com`
                  : "/admin/pickup"
            }
            target={!isAdmin && isStripeEnabled ? "_blank" : undefined}
            icon={ShoppingBag}
            themeClass={
              isStripeEnabled
                ? "bg-emerald-500/10 text-emerald-400"
                : "bg-dark/40 text-text-light/50 border border-border"
            }
            hoverColor={isStripeEnabled ? "#10b981" : "var(--color-primary)"}
          />
        )}
        {(isAdmin || isWaiter) && (
          <ModuleCard
            title="Clientes"
            href="/customers"
            icon={Users}
            themeClass="bg-emerald-500/10 text-emerald-400"
            hoverColor="var(--color-success)"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Gestión de Menú"
            href="/menu"
            icon={UtensilsCrossed}
            themeClass="bg-primary/10 text-primary"
            hoverColor="var(--color-primary)"
          />
        )}
        {(isAdmin || isInventory) && (
          <ModuleCard
            title="Inventario"
            href="/inventario"
            icon={Package}
            themeClass="bg-emerald-500/10 text-emerald-400"
            hoverColor="#10b981"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Colaboradores y Roles"
            href="/admin/users/list"
            icon={UserCog}
            themeClass="bg-primary/10 text-primary"
            hoverColor="var(--color-primary)"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Horarios y Turnos"
            href="/admin/users/horarios"
            icon={Clock}
            themeClass="bg-primary/10 text-primary"
            hoverColor="var(--color-primary)"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Control de Tareas"
            href="/admin/users/tareas"
            icon={ClipboardCheck}
            themeClass="bg-amber-500/10 text-amber-400"
            hoverColor="#f59e0b"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Configuración"
            href="/admin/settings"
            icon={Settings}
            themeClass="bg-dark/40 text-text-light/80 border border-border"
            hoverColor="var(--color-primary)"
          />
        )}
      </div>
    </CollapsibleSection>
  );
}
