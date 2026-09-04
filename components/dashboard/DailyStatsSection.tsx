import React from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { ClipboardList, DollarSign, Users, HandCoins } from "lucide-react";
import { StatCard } from "./StatCard";
import type { DashboardStats } from "./types";

export interface DailyStatsSectionProps {
  stats: DashboardStats;
}

export function DailyStatsSection({ stats }: DailyStatsSectionProps) {
  const currencyFormatter = new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
  });

  return (
    <CollapsibleSection title="Resumen del Día" defaultOpen={false}>
      <div className="grid gap-2 sm:gap-6 grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Órdenes Activas"
          icon={ClipboardList}
          value={stats.activeOrdersCount}
          themeClass="bg-primary/10 text-primary"
        />
        <StatCard
          title="Venta Bruta"
          icon={DollarSign}
          value={currencyFormatter.format(stats.salesToday)}
          themeClass="bg-secondary/10 text-secondary"
        />
        <StatCard
          title="Clientes"
          icon={Users}
          value={stats.customersCount}
          themeClass="bg-success/10 text-success"
        />
        <StatCard
          title="Propinas Hoy"
          icon={HandCoins}
          value={currencyFormatter.format(stats.tipsToday)}
          themeClass="bg-blue-500/10 text-blue-500"
        />
      </div>
    </CollapsibleSection>
  );
}
