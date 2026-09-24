"use client";

import CollapsibleSection from "@/components/CollapsibleSection";
import { useOptionalUser } from "@/components/UserProvider";
import { BarChart3, BookOpen, Clock, ReceiptText } from "lucide-react";
import { ModuleCard } from "./ModuleCard";

export interface FinanceSectionProps {
  isAdmin?: boolean;
}

export function FinanceSection(props?: FinanceSectionProps) {
  const user = useOptionalUser();
  const isAdmin = props?.isAdmin ?? user?.isAdmin ?? false;

  if (!isAdmin) return null;

  return (
    <CollapsibleSection title="Finanzas y Reportes" dotColorClass="bg-primary">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <ModuleCard
          title="Historial"
          href="/history"
          icon={BookOpen}
          themeClass="bg-primary/10 text-primary"
          hoverColor="var(--color-primary)"
        />
        <ModuleCard
          title="Gastos"
          href="/gastos"
          icon={ReceiptText}
          themeClass="bg-rose-500/10 text-rose-400"
          hoverColor="#ef4444"
        />
        <ModuleCard
          title="Reportes"
          href="/reports"
          icon={BarChart3}
          themeClass="bg-dark/40 text-text-light/80 border border-border"
          hoverColor="var(--color-primary)"
        />
        <ModuleCard
          title="Horas Pico"
          href="/analytics/hourly"
          icon={Clock}
          themeClass="bg-amber-500/10 text-amber-400"
          hoverColor="#f59e0b"
        />
      </div>
    </CollapsibleSection>
  );
}
