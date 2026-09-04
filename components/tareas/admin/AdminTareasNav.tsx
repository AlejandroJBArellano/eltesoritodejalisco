"use client";

import React from "react";
import { FolderPlus, Plus } from "lucide-react";
import { useOptionalAdminTareasContext } from "./AdminTareasContext";
import type { AdminTareasTab } from "./types";

export interface AdminTareasNavProps {
  activeTab?: AdminTareasTab;
  onTabChange?: (tab: AdminTareasTab) => void;
  selectedDate?: string;
  onDateChange?: (date: string) => void;
  onOpenCategoryModal?: () => void;
  onOpenNewTaskModal?: () => void;
  errorMsg?: string | null;
}

export function AdminTareasNav(props: AdminTareasNavProps) {
  const context = useOptionalAdminTareasContext();

  const activeTab = props.activeTab ?? context?.activeTab ?? "history";
  const onTabChange =
    props.onTabChange ?? context?.setActiveTab ?? (() => {});
  const selectedDate = props.selectedDate ?? context?.selectedDate ?? "";
  const onDateChange =
    props.onDateChange ?? context?.setSelectedDate ?? (() => {});
  const onOpenCategoryModal =
    props.onOpenCategoryModal ?? context?.openCategoryModal ?? (() => {});
  const onOpenNewTaskModal =
    props.onOpenNewTaskModal ?? context?.openNewTaskModal ?? (() => {});
  const errorMsg = props.errorMsg ?? context?.errorMsg ?? null;

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-border pb-4">
        <div className="flex gap-2 bg-card p-1 rounded-xl border border-border">
          <button
            onClick={() => onTabChange("history")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "history"
                ? "bg-primary text-black shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            📋 Historial
          </button>
          <button
            onClick={() => onTabChange("performance")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "performance"
                ? "bg-primary text-black shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            📊 Rendimiento
          </button>
          <button
            onClick={() => onTabChange("config")}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-widest transition-all ${
              activeTab === "config"
                ? "bg-primary text-black shadow-lg"
                : "text-gray-400 hover:text-white"
            }`}
          >
            ⚙️ Configuración
          </button>
        </div>

        <div className="flex items-center gap-3">
          {activeTab === "config" && (
            <>
              <button
                onClick={onOpenCategoryModal}
                className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-bold text-white hover:bg-white/10 flex items-center gap-1.5 uppercase tracking-wider"
              >
                <FolderPlus className="h-4 w-4 text-purple-400" />
                Nueva Categoría
              </button>
              <button
                onClick={onOpenNewTaskModal}
                className="rounded-xl bg-primary px-3.5 py-2 text-xs font-black text-black hover:brightness-105 flex items-center gap-1.5 uppercase tracking-wider shadow-lg shadow-primary/20"
              >
                <Plus className="h-4 w-4" />
                Nueva Tarea
              </button>
            </>
          )}

          {activeTab !== "config" && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-gray-400 uppercase tracking-widest">
                Fecha:
              </span>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => onDateChange(e.target.value)}
                className="bg-card border border-border text-white rounded-xl px-4 py-2 text-xs focus:outline-none focus:border-primary font-bold scheme-dark"
              />
            </div>
          )}
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-900/40 border border-red-500/20 text-red-200 rounded-xl text-sm font-semibold">
          {errorMsg}
        </div>
      )}
    </div>
  );
}
