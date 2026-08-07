"use client";

import { useState, useTransition } from "react";
import {
  Package,
  ArrowUp,
  ArrowDown,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  SlidersHorizontal,
  Search,
  X,
} from "lucide-react";
import type { Ingredient } from "@/types";
import { AjusteStockModal } from "./AjusteStockModal";

type FilterType = "all" | "low" | "out";

function getStatus(ing: Ingredient): "out" | "low" | "ok" {
  if (ing.currentStock <= 0) return "out";
  if (ing.currentStock <= ing.minimumStock) return "low";
  return "ok";
}

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
  const [adjustTarget, setAdjustTarget] = useState<Ingredient | null>(null);

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
    setAdjustTarget(null);
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

      {/* Table card */}
      <div className="rounded-2xl bg-card border border-border shadow-sm overflow-hidden">
        {/* Controls */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 px-5 py-4 border-b border-border">
          <div className="flex items-center gap-2">
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
                className={`px-3.5 py-1.5 rounded-full text-[11px] font-black uppercase tracking-wider border transition-all ${
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

          {/* Search */}
          <div className="relative w-full sm:w-56">
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
                className="absolute right-2 top-1/2 -translate-y-1/2 text-text-light/30 hover:text-text-light transition-colors"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Table */}
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
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={6}
                    className="px-5 py-16 text-center text-text-light/30 font-medium"
                  >
                    No hay ingredientes que coincidan con el filtro.
                  </td>
                </tr>
              ) : (
                filtered.map((ing) => {
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
                          <span className="font-bold text-text-light truncate max-w-[180px]">
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
                          onClick={() => setAdjustTarget(ing)}
                          className="inline-flex items-center gap-1.5 rounded-xl bg-primary/10 border border-primary/20 px-3 py-1.5 text-[11px] font-black text-primary hover:bg-primary/20 transition-all"
                        >
                          <SlidersHorizontal className="h-3 w-3" />
                          <span className="hidden sm:inline">Ajustar</span>
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal */}
      {adjustTarget && (
        <AjusteStockModal
          ingredient={adjustTarget}
          onClose={() => setAdjustTarget(null)}
          onSuccess={handleAdjustSuccess}
        />
      )}
    </>
  );
}
