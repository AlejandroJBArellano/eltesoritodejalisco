"use client";

import React from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { BookOpen, ReceiptText, BarChart3, Clock } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { useOptionalUser } from "@/components/UserProvider";

export interface FinanceSectionProps {
  isAdmin?: boolean;
}

export function FinanceSection(props?: FinanceSectionProps) {
  const user = useOptionalUser();
  const isAdmin = props?.isAdmin ?? user?.isAdmin ?? false;

  if (!isAdmin) return null;

  return (
    <CollapsibleSection title="Finanzas y Reportes" dotColorClass="bg-blue-500">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        <ModuleCard
          title="Historial"
          description="Historial de órdenes y cobros."
          href="/history"
          icon={BookOpen}
          badge="Registro"
          themeClass="bg-blue-500/10 text-blue-400"
          hoverColor="#3b82f6"
        />
        <ModuleCard
          title="Gastos"
          description="Registro y control de gastos (insumos, sueldos, etc.)"
          href="/gastos"
          icon={ReceiptText}
          badge="Egresos"
          themeClass="bg-rose-500/10 text-rose-400"
          hoverColor="#ef4444"
        />
        <ModuleCard
          title="Reportes"
          description="Ventas y métricas de negocio."
          href="/reports"
          icon={BarChart3}
          themeClass="bg-secondary text-text-light/80 border border-border"
          hoverColor="var(--color-primary)"
        />
        <ModuleCard
          title="Horas Pico"
          description="Ventas por hora y detector inteligente de horas pico."
          href="/analytics/hourly"
          icon={Clock}
          badge="Análisis"
          themeClass="bg-amber-500/10 text-amber-400"
          hoverColor="#f59e0b"
        />
      </div>
    </CollapsibleSection>
  );
}
