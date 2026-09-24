"use client";

import CollapsibleSection from "@/components/CollapsibleSection";
import { useOptionalUser } from "@/components/UserProvider";
import { CheckSquare, ChefHat, Clock, Receipt } from "lucide-react";
import { ModuleCard } from "./ModuleCard";

export interface OperationSectionProps {
  isAdmin?: boolean;
  isWaiter?: boolean;
  isInventory?: boolean;
}

export function OperationSection(props?: OperationSectionProps) {
  const user = useOptionalUser();
  const isAdmin = props?.isAdmin ?? user?.isAdmin ?? false;
  const isWaiter = props?.isWaiter ?? user?.isWaiter ?? false;
  const isInventory = props?.isInventory ?? user?.isInventory ?? false;

  const canAccessPOS = isAdmin || isWaiter;
  const canAccessTasks = isAdmin || isWaiter || isInventory;

  return (
    <CollapsibleSection title="Operación Diaria" dotColorClass="bg-primary">
      <div className="grid gap-3 sm:gap-4 grid-cols-2 lg:grid-cols-4">
        {canAccessPOS && (
          <ModuleCard
            title="Punto de Venta"
            href="/pos"
            icon={Receipt}
            themeClass="bg-dark/40 text-secondary"
            hoverColor="var(--color-secondary)"
          />
        )}
        <ModuleCard
          title="Sistema de Cocina"
          href="/kitchen"
          icon={ChefHat}
          themeClass="bg-primary/10 text-primary"
          hoverColor="var(--color-primary)"
        />
        {canAccessTasks && (
          <ModuleCard
            title="Tareas Diarias"
            href="/tareas"
            icon={CheckSquare}
            themeClass="bg-primary/10 text-primary"
            hoverColor="var(--color-primary)"
          />
        )}
        <ModuleCard
          title="Asistencia"
          href="/asistencia"
          icon={Clock}
          themeClass="bg-primary/10 text-primary"
          hoverColor="var(--color-primary)"
        />
      </div>
    </CollapsibleSection>
  );
}
