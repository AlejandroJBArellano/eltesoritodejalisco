import CollapsibleSection from "@/components/CollapsibleSection";
import type { HourlySalesRow } from "@/lib/services/hourlyAnalytics";
import { ClipboardList, DollarSign, HandCoins } from "lucide-react";
import { StatCard } from "./StatCard";
import { TodaySalesChart } from "./TodaySalesChart";
import type { DashboardStats } from "./types";

export interface DailyStatsSectionProps {
  stats: DashboardStats;
  hourlyRows?: HourlySalesRow[];
}

export function DailyStatsSection({
  stats,
  hourlyRows,
}: DailyStatsSectionProps) {
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
      <div className="space-y-4">
        {hourlyRows && (
          <TodaySalesChart
            hourlyRows={hourlyRows}
            salesToday={stats.salesToday}
            ordersCount={stats.activeOrdersCount}
            tipsToday={stats.tipsToday}
          />
        )}
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
      </div>
    </CollapsibleSection>
  );
}

