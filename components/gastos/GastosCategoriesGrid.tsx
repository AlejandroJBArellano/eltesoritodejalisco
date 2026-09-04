"use client";

import React from "react";
import { Edit3, Plus, Tag } from "lucide-react";
import { useGastosContextNullable } from "./GastosContext";
import type { Category } from "./types";

export interface GastosCategoriesGridProps {
  categories?: Category[];
  onOpenCreateCategory?: () => void;
  onEditCategory?: (cat: Category) => void;
}

export function GastosCategoriesGrid(props: GastosCategoriesGridProps = {}) {
  const context = useGastosContextNullable();
  const categories = props.categories ?? context?.categories ?? [];
  const onOpenCreateCategory =
    props.onOpenCreateCategory ?? context?.handleOpenCreateCategory ?? (() => {});
  const onEditCategory =
    props.onEditCategory ?? context?.handleOpenEditCategory ?? (() => {});
  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-sm font-black text-text-light uppercase tracking-wider flex items-center gap-2">
          <Tag className="h-4 w-4 text-purple-400" />
          Categorías Registradas
        </h2>
        <button
          type="button"
          onClick={onOpenCreateCategory}
          className="text-xs text-primary hover:underline font-black uppercase tracking-wider flex items-center gap-1 active:scale-95"
        >
          <Plus className="h-3.5 w-3.5" /> Nueva Categoría
        </button>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="flex items-center justify-between p-3.5 rounded-xl bg-dark/40 border border-border hover:border-border transition-colors"
          >
            <div className="flex items-center gap-2.5 min-w-0">
              <span
                className="w-3.5 h-3.5 rounded-full shrink-0 shadow-sm"
                style={{ backgroundColor: cat.color }}
              />
              <span className="text-xs text-text-light font-black uppercase truncate">
                {cat.name}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[9px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                  cat.tipo_gasto === "fijo"
                    ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    : "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                }`}
              >
                {cat.tipo_gasto === "fijo" ? "Fijo" : "Var"}
              </span>
              <button
                type="button"
                onClick={() => onEditCategory(cat)}
                className="text-xs text-text-light/40 hover:text-text-light p-1 transition-colors rounded-lg hover:bg-white/10"
                title={`Editar categoría ${cat.name}`}
                aria-label={`Editar categoría ${cat.name}`}
              >
                <Edit3 className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        ))}
        {categories.length === 0 && (
          <p className="col-span-full text-text-light/40 text-xs italic text-center py-4">
            No hay categorías registradas.
          </p>
        )}
      </div>
    </section>
  );
}
