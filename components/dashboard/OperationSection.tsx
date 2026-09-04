"use client";

import React from "react";
import CollapsibleSection from "@/components/CollapsibleSection";
import { Receipt, ChefHat, CheckSquare, Clock } from "lucide-react";
import { ModuleCard } from "./ModuleCard";
import { useOptionalUser } from "@/components/UserProvider";

export interface OperationSectionProps {
  isAdmin?: boolean;
  isWaiter?: boolean;
}

export function OperationSection(props?: OperationSectionProps) {
  const user = useOptionalUser();
  const isAdmin = props?.isAdmin ?? user?.isAdmin ?? false;
  const isWaiter = props?.isWaiter ?? user?.isWaiter ?? false;

  const canAccessPOSAndTasks = isAdmin || isWaiter;

  return (
    <CollapsibleSection title="Operación Diaria" dotColorClass="bg-primary">
      <div className="grid gap-2 sm:gap-6 grid-cols-2 lg:grid-cols-3">
        {canAccessPOSAndTasks && (
          <ModuleCard
            title="Punto de Venta"
            description="Crear órdenes y procesar pagos."
            href="/pos"
            icon={Receipt}
            badge="Activo"
            themeClass="bg-secondary/10 text-secondary"
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
        {canAccessPOSAndTasks && (
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
          themeClass="bg-purple-500/10 text-purple-500"
          hoverColor="#a855f7"
        />
      </div>
    </CollapsibleSection>
  );
}
