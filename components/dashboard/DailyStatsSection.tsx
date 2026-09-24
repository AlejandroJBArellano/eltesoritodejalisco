import CollapsibleSection from "@/components/CollapsibleSection";
import { ClipboardList, DollarSign, HandCoins } from "lucide-react";
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
    <CollapsibleSection
      title="Resumen del Día"
      dotColorClass="bg-primary"
      defaultOpen={true}
    >
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-3">
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
          themeClass="bg-dark/40 text-secondary"
        />
        <StatCard
          title="Propinas Hoy"
          icon={HandCoins}
          value={currencyFormatter.format(stats.tipsToday)}
          themeClass="bg-primary/10 text-primary"
        />
      </div>
    </CollapsibleSection>
  );
}
