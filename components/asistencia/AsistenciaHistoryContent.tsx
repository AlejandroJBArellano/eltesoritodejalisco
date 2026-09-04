"use client";

import { PageHeader } from "@/components/PageHeader";
import {
  AsistenciaHistoryProvider,
} from "./AsistenciaHistoryContext";
import { AsistenciaFilterBar } from "./AsistenciaFilterBar";
import { AsistenciaSummaryKPIs } from "./AsistenciaSummaryKPIs";
import { AsistenciaHistoryTable } from "./AsistenciaHistoryTable";

function AsistenciaHistoryContentInner() {
  return (
    <div className="min-h-screen bg-background pb-16 text-text-light">
      <PageHeader
        title="Historial de Asistencia"
        subtitle="Control de entradas, salidas y duraciones de turno del personal"
        badgeColor="bg-primary"
        backHref="/asistencia"
        backLabel="Checador"
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 space-y-6">
        <AsistenciaFilterBar />
        <AsistenciaSummaryKPIs />
        <AsistenciaHistoryTable />
      </main>
    </div>
  );
}

export function AsistenciaHistoryContent() {
  return (
    <AsistenciaHistoryProvider>
      <AsistenciaHistoryContentInner />
    </AsistenciaHistoryProvider>
  );
}
