"use client";

import { useState } from "react";
import {
  SlidersHorizontal,
  Search,
  X,
  LayoutGrid,
  Table as TableIcon,
} from "lucide-react";
import type { Ingredient } from "@/types";
import { ExportButton, type ExportColumn } from "@/components/ui/DataTableControls";
import { IngredientTouchCard, type InventoryActionType } from "./IngredientTouchCard";
import { InventoryActionDrawer } from "./InventoryActionDrawer";

type FilterType = "all" | "low" | "out";
export type InventoryViewMode = "table" | "cards";

function getStatus(ing: Ingredient): "out" | "low" | "ok" {
  if (ing.currentStock <= 0) return "out";
  if (ing.currentStock <= ing.minimumStock) return "low";
  return "ok";
}

const INVENTORY_EXPORT_COLUMNS: ExportColumn<Ingredient>[] = [
  { header: "Ingrediente", key: "name" },
  { header: "Unidad", key: "unit" },
  { header: "Stock Actual", key: "currentStock" },
  { header: "Stock Mínimo", key: "minimumStock" },
  {
    header: "Costo Unitario",
    accessor: (i) => (i.costPerUnit ? `$${i.costPerUnit.toFixed(2)}` : "N/A"),
  },
  { header: "Tipo de Rastreo", key: "trackingType" },
  {
    header: "Estado",
    accessor: (i) => {
      const s = getStatus(i);
      return s === "out" ? "Agotado" : s === "low" ? "Stock Bajo" : "Normal";
    },
  },
];

const STATUS_CONFIG = {
  out: {
    label: "Agotado",
    dot: "bg-red-500",
    badge: "bg-red-500/10 border-red-500/20 text-red-400",
    row: "border-red-500/15 bg-red-500/3",
  },
  low: {
    label: "Stock Bajo",
    dot: "bg-amber-500 animate-pulse",
    badge: "bg-amber-500/10 border-amber-500/20 text-amber-400",
    row: "border-amber-500/15 bg-amber-500/3",
  },
  ok: {
    label: "Normal",
    dot: "bg-emerald-500",
    badge: "bg-emerald-500/10 border-emerald-500/20 text-emerald-400",
    row: "border-transparent",
  },
} as const;

interface InventarioTableProps {
  initialIngredients: Ingredient[];
}

export function InventarioTable({ initialIngredients }: InventarioTableProps) {
  const [ingredients, setIngredients] =
    useState<Ingredient[]>(initialIngredients);
  const [filter, setFilter] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [viewMode, setViewMode] = useState<InventoryViewMode>(() =>
    typeof window !== "undefined" && window.innerWidth < 768 ? "cards" : "table"
  );
  const [activeAction, setActiveAction] = useState<{
    ingredient: Ingredient;
    action: InventoryActionType;
  } | null>(null);

  const filtered = ingredients.filter((ing) => {
    const status = getStatus(ing);
    if (filter === "out" && status !== "out") return false;
    if (filter === "low" && status !== "low" && status !== "out") return false;
    if (search && !ing.name.toLowerCase().includes(search.toLowerCase()))
      return false;
    return true;
  });

  const outCount = ingredients.filter((i) => getStatus(i) === "out").length;
  const lowCount = ingredients.filter((i) => getStatus(i) === "low").length;

  const handleAdjustSuccess = (updated: Ingredient) => {
    setIngredients((prev) =>
      prev.map((i) => (i.id === updated.id ? updated : i)),
    );
    setActiveAction(null);
  };

  const handleOpenAction = (
    action: InventoryActionType,
    ingredient: Ingredient
  ) => {
    setActiveAction({ ingredient, action });
  };

  return (
    <>
      {/* Summary strip */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6">
        <div className="rounded-2xl bg-card border border-border p-4 sm:p-6">
          <p className="text-[10px] font-black uppercase tracking-wider text-text-light/50 mb-1">
            Total Ingredientes
          </p>
          <p className="text-3xl font-black text-text-light tabular-nums">
            {ingredients.length}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 sm:p-6 ${
            lowCount > 0
              ? "bg-amber-500/5 border-amber-500/20"
              : "bg-card border-border"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-text-light/50 mb-1">
            Stock Bajo
          </p>
          <p
            className={`text-3xl font-black tabular-nums ${
              lowCount > 0 ? "text-amber-400" : "text-text-light"
            }`}
          >
            {lowCount}
          </p>
        </div>
        <div
          className={`rounded-2xl border p-4 sm:p-6 ${
            outCount > 0
              ? "bg-red-500/5 border-red-500/20"
              : "bg-card border-border"
          }`}
        >
          <p className="text-[10px] font-black uppercase tracking-wider text-text-light/50 mb-1">
            Agotados
          </p>
          <p
            className={`text-3xl font-black tabular-nums ${
              outCount > 0 ? "text-red-400" : "text-text-light"
            }`}
          >
            {outCount}
          </p>
        </div>
      </div>

      {/* Main Container */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        {/* Controls Bar */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3 px-5 py-4 border-b border-border">
          {/* Status Filters */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 lg:pb-0 custom-scrollbar">
            {(
              [
                { key: "all", label: "Todos" },
                { key: "low", label: "Bajo Stock" },
                { key: "out", label: "Agotados" },
              ] as { key: FilterType; label: string }[]
            ).map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border whitespace-nowrap transition-all ${
                  filter === f.key
                    ? "bg-primary/15 border-primary/30 text-primary"
                    : "bg-white/5 border-border text-text-light/50 hover:text-text-light"
                }`}
              >
                {f.label}
                {f.key === "low" && lowCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-amber-500/20 text-amber-400 px-1.5 py-0.5 text-[9px]">
                    {lowCount}
                  </span>
                )}
                {f.key === "out" && outCount > 0 && (
                  <span className="ml-1.5 rounded-full bg-red-500/20 text-red-400 px-1.5 py-0.5 text-[9px]">
                    {outCount}
                  </span>
                )}
              </button>
            ))}
          </div>

          {/* Actions: Search, View Mode Toggle & Export */}
          <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 w-full lg:w-auto">
            {/* Search Input */}
            <div className="relative flex-1 sm:w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-light/30" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar ingrediente..."
                className="w-full rounded-xl border border-border bg-white/5 pl-8 pr-8 py-2 text-xs text-text-light outline-none focus:border-primary transition-all placeholder:text-text-light/30"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  aria-label="Limpiar búsqueda"
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-text-light/30 hover:text-text-light transition-colors"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>

            {/* View Mode Toggle */}
            <div className="flex items-center p-1 rounded-xl bg-white/5 border border-border">
              <button
                type="button"
                onClick={() => setViewMode("table")}
                aria-label="Vista Tabla"
                title="Vista Tabla"
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === "table"
                    ? "bg-primary/20 text-primary shadow-xs"
                    : "text-text-light/40 hover:text-text-light"
                }`}
              >
                <TableIcon className="h-4 w-4" />
                <span className="hidden md:inline text-[11px]">Tabla</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode("cards")}
                aria-label="Vista Tarjetas"
                title="Vista Tarjetas"
                className={`p-1.5 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 ${
                  viewMode === "cards"
                    ? "bg-primary/20 text-primary shadow-xs"
                    : "text-text-light/40 hover:text-text-light"
                }`}
              >
                <LayoutGrid className="h-4 w-4" />
                <span className="hidden md:inline text-[11px]">Tarjetas</span>
              </button>
            </div>

            {/* Export */}
            <ExportButton
              data={filtered}
              columns={INVENTORY_EXPORT_COLUMNS}
              filename={() => `inventario_${new Date().toISOString().split("T")[0]}`}
              sheetName="Inventario"
            />
          </div>
        </div>

        {/* Content View: Table or Cards */}
        {filtered.length === 0 ? (
          <div className="px-5 py-16 text-center text-text-light/40 font-medium">
            No hay ingredientes que coincidan con el filtro.
          </div>
        ) : viewMode === "cards" ? (
          <div
            data-testid="inventory-cards-grid"
            className="p-4 sm:p-5 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4"
          >
            {filtered.map((ing) => (
              <IngredientTouchCard
                key={ing.id}
                ingredient={ing}
                onAction={handleOpenAction}
              />
            ))}
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-5 py-3 text-left text-[10px] font-black uppercase tracking-wider text-text-light/40">
                    Ingrediente
                  </th>
                  <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-text-light/40 hidden sm:table-cell">
                    Unidad
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-text-light/40">
                    Stock Actual
                  </th>
                  <th className="px-3 py-3 text-right text-[10px] font-black uppercase tracking-wider text-text-light/40 hidden md:table-cell">
                    Mínimo
                  </th>
                  <th className="px-3 py-3 text-center text-[10px] font-black uppercase tracking-wider text-text-light/40">
                    Estado
                  </th>
                  <th className="px-5 py-3 text-right text-[10px] font-black uppercase tracking-wider text-text-light/40">
                    Ajustar
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((ing) => {
                  const status = getStatus(ing);
                  const cfg = STATUS_CONFIG[status];
                  return (
                    <tr
                      key={ing.id}
                      className={`border-l-2 transition-colors hover:bg-white/3 ${cfg.row}`}
                    >
                      <td className="px-5 py-3.5">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`h-2 w-2 rounded-full shrink-0 ${cfg.dot}`}
                          />
                          <span className="font-bold text-text-light truncate max-w-45">
                            {ing.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-3 py-3.5 text-center text-text-light/60 hidden sm:table-cell uppercase">
                        {ing.unit}
                      </td>
                      <td className="px-3 py-3.5 text-right">
                        <span
                          className={`font-black tabular-nums ${
                            status === "out"
                              ? "text-red-400"
                              : status === "low"
                              ? "text-amber-400"
                              : "text-text-light"
                          }`}
                        >
                          {Number(ing.currentStock).toFixed(2)}
                        </span>
                      </td>
                      <td className="px-3 py-3.5 text-right text-text-light/50 tabular-nums hidden md:table-cell">
                        {Number(ing.minimumStock).toFixed(2)}
                      </td>
                      <td className="px-3 py-3.5 text-center">
                        <span
                          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[10px] font-black border ${cfg.badge}`}
                        >
                          <span className={`h-1.5 w-1.5 rounded-full ${cfg.dot}`} />
                          {cfg.label}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenAction("AJUSTE", ing)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-[11px] font-black text-primary hover:bg-primary/20 active:scale-95 transition-all"
                        >
                          <SlidersHorizontal className="h-3 w-3" />
                          <span className="hidden sm:inline">Ajustar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Action Drawer */}
      {activeAction && (
        <InventoryActionDrawer
          isOpen={Boolean(activeAction)}
          ingredient={activeAction.ingredient}
          initialAction={activeAction.action}
          onClose={() => setActiveAction(null)}
          onSuccess={handleAdjustSuccess}
        />
      )}
    </>
  );
}
