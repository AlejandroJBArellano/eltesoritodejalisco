"use client";

import CollapsibleSection from "@/components/CollapsibleSection";
import { useOptionalTenant } from "@/components/TenantProvider";
import { useOptionalUser } from "@/components/UserProvider";
import {
  Settings,
  ShoppingBag,
  Users,
  UtensilsCrossed,
} from "lucide-react";
import { ModuleCard } from "./ModuleCard";

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
        {isAdmin && (
          <ModuleCard
            title="Gestión de Equipo"
            href="/admin/users/list"
            icon={Users}
            themeClass="bg-primary/10 text-primary"
            hoverColor="var(--color-primary)"
          />
        )}
        {(isAdmin || isInventory) && (
          <ModuleCard
            title="Menú e Inventario"
            href={isAdmin ? "/menu" : "/inventario"}
            icon={UtensilsCrossed}
            themeClass="bg-primary/10 text-primary"
            hoverColor="var(--color-primary)"
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
        {(isAdmin || isWaiter) && (
          <ModuleCard
            title="Kittn Portal"
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
