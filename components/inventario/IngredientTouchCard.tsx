"use client";

import React from "react";
import { Plus, Minus, SlidersHorizontal } from "lucide-react";
import type { Ingredient } from "@/types";

export type InventoryActionType = "ENTRADA" | "MERMA" | "AJUSTE";

interface IngredientTouchCardProps {
  ingredient: Ingredient;
  onAction: (action: InventoryActionType, ingredient: Ingredient) => void;
}

function getStatus(ing: Ingredient): "out" | "low" | "ok" {
  if (ing.currentStock <= 0) return "out";
  if (ing.currentStock <= ing.minimumStock) return "low";
  return "ok";
}

const STATUS_CONFIG = {
  out: {
    label: "Agotado",
    dot: "bg-rose-500",
    badge: "bg-rose-500/10 border-rose-500/25 text-rose-300",
    bar: "bg-rose-500",
  },
  low: {
    label: "Stock Bajo",
    dot: "bg-amber-500 animate-pulse",
    badge: "bg-amber-500/10 border-amber-500/25 text-amber-300",
    bar: "bg-amber-500",
  },
  ok: {
    label: "Normal",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 border-emerald-500/25 text-emerald-300",
    bar: "bg-emerald-500",
  },
} as const;

export function IngredientTouchCard({
  ingredient,
  onAction,
}: IngredientTouchCardProps) {
  const status = getStatus(ingredient);
  const cfg = STATUS_CONFIG[status];

  // Cálculo de progreso visual respecto al stock mínimo o nivel óptimo
  const targetStock =
    ingredient.minimumStock > 0 ? ingredient.minimumStock * 2 : 10;
  const progressPercent = Math.min(
    100,
    Math.max(0, (ingredient.currentStock / targetStock) * 100),
  );

  return (
    <div
      data-testid={`ingredient-card-${ingredient.id}`}
      className="group relative rounded-xl bg-card border border-border p-4 sm:p-5 flex flex-col justify-between gap-3.5 transition-all duration-150 hover:border-border/80 hover:bg-card/95 shadow-xs"
    >
      {/* Encabezado: Nombre y Badge de Estado */}
      <div className="flex items-start justify-between gap-2.5">
        <div className="min-w-0 flex-1">
          <h3
            className="font-bold text-sm sm:text-base text-text-light truncate"
            title={ingredient.name}
          >
            {ingredient.name}
          </h3>
          <div className="flex items-center gap-2 mt-1">
            <span className="inline-flex items-center text-[10px] font-mono font-bold uppercase tracking-wider text-text-light/50 bg-white/5 border border-border px-1.5 py-0.5 rounded">
              {ingredient.unit}
            </span>
            {ingredient.costPerUnit !== undefined && (
              <span className="text-[11px] text-text-light/40 font-mono">
                ${ingredient.costPerUnit.toFixed(2)} /{" "}
                {ingredient.unit.toLowerCase()}
              </span>
            )}
          </div>
        </div>

        <span
          className={`shrink-0 inline-flex items-center gap-1.5 rounded-md px-2 py-0.5 text-[10px] font-semibold border uppercase tracking-wider ${cfg.badge}`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
          <span>{cfg.label}</span>
        </span>
      </div>

      {/* Métrica Central de Stock */}
      <div className="space-y-2">
        <div className="flex items-baseline justify-between">
          <span className="text-[10px] font-bold uppercase tracking-wider text-text-light/40">
            Stock Disponible
          </span>
          <span className="text-[11px] text-text-light/50 font-normal">
            Mínimo:{" "}
            <span className="font-mono font-bold text-text-light/70">
              {ingredient.minimumStock} {ingredient.unit}
            </span>
          </span>
        </div>

        <div className="flex items-baseline gap-2">
          <span
            className={`text-2xl sm:text-3xl font-mono font-bold tabular-nums tracking-tight ${
              status === "out"
                ? "text-rose-400"
                : status === "low"
                  ? "text-amber-400"
                  : "text-text-light"
            }`}
          >
            {Number(ingredient.currentStock).toFixed(2)}
          </span>
          <span className="text-xs font-semibold text-text-light/40 uppercase">
            {ingredient.unit}
          </span>
        </div>

        {/* Barra de progreso de nivel */}
        <div className="h-1.5 w-full rounded-full bg-white/5 overflow-hidden">
          <div
            className={`h-full rounded-full transition-all duration-300 ${cfg.bar}`}
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Barra de Acciones Inferior Táctil */}
      <div className="grid grid-cols-3 gap-2 pt-1 border-t border-border/60">
        <button
          type="button"
          onClick={() => onAction("ENTRADA", ingredient)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/25 px-2 py-2 text-xs font-semibold text-emerald-400 hover:bg-emerald-500/20 active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          <Plus className="h-3.5 w-3.5" />
          <span>Entrada</span>
        </button>

        <button
          type="button"
          onClick={() => onAction("MERMA", ingredient)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/25 px-2 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/20 active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          <Minus className="h-3.5 w-3.5" />
          <span>Merma</span>
        </button>

        <button
          type="button"
          onClick={() => onAction("AJUSTE", ingredient)}
          className="flex items-center justify-center gap-1.5 rounded-lg bg-white/5 border border-border px-2 py-2 text-xs font-semibold text-text-light/70 hover:text-text-light hover:bg-white/10 active:scale-95 transition-all cursor-pointer shadow-xs"
        >
          <SlidersHorizontal className="h-3.5 w-3.5" />
          <span>Ajustar</span>
        </button>
      </div>
    </div>
  );
}
