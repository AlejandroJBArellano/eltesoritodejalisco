"use client";

import React from "react";
import { Plus } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

export interface GastosHeaderProps {
  onOpenExpenseModal: () => void;
  onOpenCategoryModal: () => void;
}

export function GastosHeader({
  onOpenExpenseModal,
  onOpenCategoryModal,
}: GastosHeaderProps) {
  return (
    <PageHeader
      title="Control de Gastos & Egresos"
      subtitle="Registro contable, deducciones operativas y categorización financiera"
      badgeColor="bg-red-500"
      actions={
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={onOpenExpenseModal}
            className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-black hover:brightness-105 transition-all uppercase tracking-wider flex items-center gap-1.5 shadow-lg shadow-primary/20 active:scale-95"
          >
            <Plus className="h-4 w-4" />
            Registrar Gasto
          </button>
          <button
            type="button"
            onClick={onOpenCategoryModal}
            className="rounded-xl bg-white/5 border border-border px-4 py-2 text-xs font-bold text-text-light hover:bg-white/10 transition-all uppercase tracking-wider flex items-center gap-1.5 active:scale-95"
          >
            <Plus className="h-4 w-4 text-primary" />
            Nueva Categoría
          </button>
        </div>
      }
    />
  );
}
