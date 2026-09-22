"use client";

import React, { useState } from "react";
import { CalendarDays, ReceiptText } from "lucide-react";
import { WeeklyShiftPlanner } from "./WeeklyShiftPlanner";
import type { ShiftUserOption } from "./ShiftModal";
import { AsistenciaHistoryProvider } from "@/components/asistencia/AsistenciaHistoryContext";
import { AsistenciaFilterBar } from "@/components/asistencia/AsistenciaFilterBar";
import { AsistenciaSummaryKPIs } from "@/components/asistencia/AsistenciaSummaryKPIs";
import { AsistenciaHistoryTable } from "@/components/asistencia/AsistenciaHistoryTable";

interface AdminHorariosTurnosTabProps {
  initialUsers?: ShiftUserOption[];
  initialToleranceMinutes?: number;
}

export function AdminHorariosTurnosTab({
  initialUsers = [],
  initialToleranceMinutes = 10,
}: AdminHorariosTurnosTabProps) {
  const [activeTab, setActiveTab] = useState<"planner" | "history">("planner");

  return (
    <div className="space-y-6">
      {/* Tab Selector */}
      <div className="flex items-center gap-2 border-b border-border pb-4">
        <button
          type="button"
          onClick={() => setActiveTab("planner")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "planner"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-text-light/60 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <CalendarDays className="h-4 w-4" />
          <span>Planeador de Turnos Semanales</span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("history")}
          className={`px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 cursor-pointer ${
            activeTab === "history"
              ? "bg-primary/15 text-primary border border-primary/30"
              : "text-text-light/60 hover:text-white hover:bg-white/5 border border-transparent"
          }`}
        >
          <ReceiptText className="h-4 w-4" />
          <span>Historial de Marcajes y Asistencias</span>
        </button>
      </div>

      {/* View 1: Weekly Shift Planner */}
      {activeTab === "planner" && (
        <WeeklyShiftPlanner
          initialUsers={initialUsers}
          initialToleranceMinutes={initialToleranceMinutes}
        />
      )}

      {/* View 2: Attendance History */}
      {activeTab === "history" && (
        <AsistenciaHistoryProvider>
          <div className="space-y-6">
            <AsistenciaFilterBar />
            <AsistenciaSummaryKPIs />
            <AsistenciaHistoryTable />
          </div>
        </AsistenciaHistoryProvider>
      )}
    </div>
  );
}
