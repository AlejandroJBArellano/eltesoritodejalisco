"use client";

import React from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import {
  ShoppingBag,
  Users,
  UtensilsCrossed,
  Package,
  ReceiptText,
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
  tenant?: ManagementTenantInfo;
}

export function ManagementSection(props?: ManagementSectionProps) {
  const user = useOptionalUser();
  const tenantContext = useOptionalTenant();

  const isAdmin = props?.isAdmin ?? user?.isAdmin ?? false;
  const isWaiter = props?.isWaiter ?? user?.isWaiter ?? false;
  const tenant =
    props?.tenant ??
    tenantContext ?? { slug: "", stripe_charges_enabled: false };

  if (!isAdmin && !isWaiter) return null;

  const isStripeEnabled = Boolean(tenant.stripe_charges_enabled);
  const slug = tenant.slug || "";

  return (
    <CollapsibleSection title="Gestión y Clientes" dotColorClass="bg-success">
      <div className="grid gap-2 sm:gap-6 grid-cols-2 lg:grid-cols-3">
        <ModuleCard
          title="Kittn Pickup"
          description={
            isStripeEnabled
              ? "Portal de pedidos para clientes en línea."
              : "Activar tienda online y cobros con Stripe."
          }
          href={
            isStripeEnabled
              ? `https://${slug}.trykittn.com`
              : "/admin/settings#pickup"
          }
          target={isStripeEnabled ? "_blank" : undefined}
          icon={ShoppingBag}
          badge={isStripeEnabled ? "Online" : "Inactivo"}
          themeClass={
            isStripeEnabled
              ? "bg-emerald-500/10 text-emerald-400"
              : "bg-zinc-800 text-text-light/50"
          }
          hoverColor={isStripeEnabled ? "#10b981" : "var(--color-primary)"}
        />
        <ModuleCard
          title="Clientes"
          description="Lealtad y fuentes de visita."
          href="/customers"
          icon={Users}
          badge="CRM"
          themeClass="bg-success/10 text-success"
          hoverColor="var(--color-success)"
        />
        {isAdmin && (
          <ModuleCard
            title="Gestión de Menú"
            description="Productos y recetas técnicas."
            href="/menu"
            icon={UtensilsCrossed}
            themeClass="bg-primary/10 text-primary"
            hoverColor="var(--color-primary)"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Inventario"
            description="Control de stock, alertas de bajo inventario y ajustes."
            href="/inventario"
            icon={Package}
            badge="Stock"
            themeClass="bg-emerald-500/10 text-emerald-500"
            hoverColor="#10b981"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Historial de Asistencia"
            description="Filtros de horas trabajadas y registros de turno por empleado."
            href="/asistencia/history"
            icon={ReceiptText}
            badge="Historial"
            themeClass="bg-purple-500/10 text-purple-500"
            hoverColor="#a855f7"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Control de Tareas"
            description="Aprobación de tareas críticas y monitoreo de tiempos netos."
            href="/admin/tareas"
            icon={ClipboardCheck}
            badge="Control"
            themeClass="bg-blue-500/10 text-blue-500"
            hoverColor="#3b82f6"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Usuarios"
            description="Gestión de personal y roles."
            href="/admin/users"
            icon={UserCog}
            themeClass="bg-primary/10 text-primary"
            hoverColor="var(--color-primary)"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Horarios del Portal"
            description="Días y horas para programar pedidos."
            href="/admin/horarios"
            icon={Clock}
            badge="Config"
            themeClass="bg-amber-500/10 text-amber-500"
            hoverColor="#f59e0b"
          />
        )}
        {isAdmin && (
          <ModuleCard
            title="Configuración"
            description="Ajustes de marca, colores del portal, datos fiscales y ticket."
            href="/admin/settings"
            icon={Settings}
            badge="Empresa"
            themeClass="bg-card text-white border border-border"
            hoverColor="var(--color-primary)"
          />
        )}
      </div>
    </CollapsibleSection>
  );
}
