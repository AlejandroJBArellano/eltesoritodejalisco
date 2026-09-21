"use client";

import React from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Receipt, ChefHat, CheckSquare, Clock } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { useOptionalUser } from "@/components/UserProvider";

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
            description="Crear órdenes y procesar pagos."
            href="/pos"
            icon={Receipt}
            badge="Activo"
            themeClass="bg-dark/40 text-secondary"
            hoverColor="var(--color-secondary)"
          />
        )}
        <ModuleCard
          title="Sistema de Cocina"
          description="KDS con temporizador y smart batching."
          href="/kitchen"
          icon={ChefHat}
          badge="Real-time"
          themeClass="bg-primary/10 text-primary"
          hoverColor="var(--color-primary)"
        />
        {canAccessTasks && (
          <ModuleCard
            title="Tareas Diarias"
            description="Checklist de tareas primordiales y operación diaria."
            href="/tareas"
            icon={CheckSquare}
            badge="Checklist"
            themeClass="bg-primary/10 text-primary"
            hoverColor="var(--color-primary)"
          />
        )}
        <ModuleCard
          title="Asistencia"
          description="Registro de entradas y salidas."
          href="/asistencia"
          icon={Clock}
          badge="Turnos"
          themeClass="bg-primary/10 text-primary"
          hoverColor="var(--color-primary)"
        />
      </div>
    </CollapsibleSection>
  );
}
