"use client";

import { useState, useTransition } from "react";
import {
  X,
  Plus,
  Minus,
  Package,
  Loader2,
  ShoppingCart,
  Trash2,
  Settings,
  Wrench,
} from "lucide-react";
import type { Ingredient } from "@/types";

const RAZONES = [
  { value: "Compra", label: "🛒 Compra / Reabastecimiento", positive: true },
  { value: "Merma", label: "🗑️ Merma / Desperdicio", positive: false },
  { value: "Corrección", label: "🔧 Corrección de inventario", positive: null },
  { value: "Producción", label: "🍳 Uso en producción", positive: false },
  { value: "Devolución", label: "📦 Devolución a proveedor", positive: false },
  { value: "Otro", label: "📋 Otro", positive: null },
];

interface AjusteStockModalProps {
  ingredient: Ingredient;
  onClose: () => void;
  onSuccess: (updatedIngredient: Ingredient) => void;
}

export function AjusteStockModal({
  ingredient,
  onClose,
  onSuccess,
}: AjusteStockModalProps) {
  const [razon, setRazon] = useState("Compra");
  const [cantidad, setCantidad] = useState("");
  const [signo, setSigno] = useState<1 | -1>(1);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const razonConfig = RAZONES.find((r) => r.value === razon);

  const handleRazonChange = (value: string) => {
    setRazon(value);
    const config = RAZONES.find((r) => r.value === value);
    if (config?.positive === true) setSigno(1);
    else if (config?.positive === false) setSigno(-1);
  };

  const adjustedAmount = signo * Math.abs(Number(cantidad) || 0);
  const newStock = ingredient.currentStock + adjustedAmount;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = Number(cantidad);
    if (!parsed || isNaN(parsed) || parsed <= 0) {
      setError("Ingresa una cantidad válida mayor a 0");
      return;
    }
    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/inventory/adjust", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ingredientId: ingredient.id,
            adjustment: adjustedAmount,
            reason: razon,
          }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error || "Error al ajustar");
        onSuccess({ ...ingredient, currentStock: data.newStock });
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido");
      }
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl bg-card border border-border shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10">
              <Package className="h-5 w-5 text-primary" />
            </span>
            <div>
              <h2 className="text-sm font-black text-text-light uppercase tracking-wide">
                Ajustar Stock
              </h2>
              <p className="text-xs text-text-light/50 font-medium">
                {ingredient.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="h-8 w-8 flex items-center justify-center rounded-lg text-text-light/40 hover:text-text-light hover:bg-white/10 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Stock actual */}
        <div className="px-6 py-4 bg-white/3 border-b border-border flex items-center justify-between">
          <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
            Stock Actual
          </span>
          <span className="text-2xl font-black text-text-light tabular-nums">
            {ingredient.currentStock}
            <span className="text-sm font-bold text-text-light/40 ml-1">
              {ingredient.unit}
            </span>
          </span>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Razón */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-text-light/50">
              Razón del ajuste
            </label>
            <div className="grid grid-cols-2 gap-2">
              {RAZONES.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => handleRazonChange(r.value)}
                  className={`rounded-xl px-3 py-2.5 text-left text-xs font-bold border transition-all ${
                    razon === r.value
                      ? "bg-primary/15 border-primary/40 text-text-light"
                      : "bg-white/5 border-border text-text-light/60 hover:border-border/40 hover:text-text-light"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {/* Signo manual (solo para razones neutras) */}
          {razonConfig?.positive === null && (
            <div className="space-y-2">
              <label className="text-[11px] font-black uppercase tracking-wider text-text-light/50">
                Tipo de ajuste
              </label>
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSigno(1)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black border transition-all ${
                    signo === 1
                      ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400"
                      : "bg-white/5 border-border text-text-light/60 hover:text-text-light"
                  }`}
                >
                  <Plus className="h-3.5 w-3.5" /> Entrada
                </button>
                <button
                  type="button"
                  onClick={() => setSigno(-1)}
                  className={`flex-1 flex items-center justify-center gap-2 rounded-xl py-2.5 text-xs font-black border transition-all ${
                    signo === -1
                      ? "bg-red-500/15 border-red-500/40 text-red-400"
                      : "bg-white/5 border-border text-text-light/60 hover:text-text-light"
                  }`}
                >
                  <Minus className="h-3.5 w-3.5" /> Salida
                </button>
              </div>
            </div>
          )}

          {/* Cantidad */}
          <div className="space-y-2">
            <label className="text-[11px] font-black uppercase tracking-wider text-text-light/50">
              Cantidad ({ingredient.unit})
            </label>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() =>
                  setCantidad((p) => String(Math.max(0, (Number(p) || 0) - 1)))
                }
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-border text-text-light hover:bg-white/10 transition-colors"
              >
                <Minus className="h-4 w-4" />
              </button>
              <input
                type="number"
                min="0"
                step="0.01"
                value={cantidad}
                onChange={(e) => setCantidad(e.target.value)}
                placeholder="0"
                className="flex-1 h-10 rounded-xl border border-border bg-white/5 px-4 text-center text-lg font-black text-text-light outline-none focus:border-primary transition-all tabular-nums"
              />
              <button
                type="button"
                onClick={() => setCantidad((p) => String((Number(p) || 0) + 1))}
                className="h-10 w-10 shrink-0 flex items-center justify-center rounded-xl bg-white/5 border border-border text-text-light hover:bg-white/10 transition-colors"
              >
                <Plus className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Preview resultado */}
          {Number(cantidad) > 0 && (
            <div
              className={`rounded-xl p-3.5 border flex items-center justify-between ${
                newStock < 0
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-emerald-500/10 border-emerald-500/20"
              }`}
            >
              <span className="text-xs font-bold text-text-light/60">
                Nuevo stock
              </span>
              <span
                className={`text-xl font-black tabular-nums ${
                  newStock < 0 ? "text-red-400" : "text-emerald-400"
                }`}
              >
                {newStock.toFixed(2)}{" "}
                <span className="text-sm font-bold opacity-70">
                  {ingredient.unit}
                </span>
              </span>
            </div>
          )}

          {error && (
            <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 h-11 rounded-xl border border-border bg-white/5 text-xs font-black text-text-light/60 uppercase tracking-wider hover:text-text-light hover:bg-white/10 transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isPending || !cantidad || Number(cantidad) <= 0}
              className="flex-1 h-11 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-wider hover:brightness-110 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2"
            >
              {isPending ? (
                <>
                  <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  Guardando...
                </>
              ) : (
                "Confirmar Ajuste"
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
