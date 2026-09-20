"use client";

import React, { useState, useEffect, useTransition } from "react";
import {
  X,
  Plus,
  Minus,
  SlidersHorizontal,
  Package,
  Loader2,
  Delete,
  AlertTriangle,
  RotateCcw,
} from "lucide-react";
import type { Ingredient } from "@/types";
import type { InventoryActionType } from "./IngredientTouchCard";

interface InventoryActionDrawerProps {
  ingredient: Ingredient | null;
  initialAction?: InventoryActionType;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (updatedIngredient: Ingredient) => void;
}

const MERMA_SUGGESTIONS = [
  "Caducado",
  "Dañado / Golpeado",
  "Accidente al servir",
  "Mala calidad proveedor",
];

export function InventoryActionDrawer({
  ingredient,
  initialAction = "ENTRADA",
  isOpen,
  onClose,
  onSuccess,
}: InventoryActionDrawerProps) {
  const [action, setAction] = useState<InventoryActionType>(initialAction);
  const [amountStr, setAmountStr] = useState<string>("0");
  const [reason, setReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (isOpen && ingredient) {
      setAction(initialAction);
      if (initialAction === "AJUSTE") {
        setAmountStr(String(ingredient.currentStock));
      } else {
        setAmountStr("0");
      }
      setReason(
        initialAction === "ENTRADA"
          ? "Compra"
          : initialAction === "AJUSTE"
          ? "Corrección de inventario"
          : ""
      );
      setError(null);
    }
  }, [isOpen, ingredient, initialAction]);

  if (!isOpen || !ingredient) return null;

  const handleActionChange = (newAction: InventoryActionType) => {
    setAction(newAction);
    setError(null);
    if (newAction === "ENTRADA") {
      setReason("Compra");
      setAmountStr("0");
    } else if (newAction === "MERMA") {
      setReason("");
      setAmountStr("0");
    } else if (newAction === "AJUSTE") {
      setReason("Corrección de inventario");
      setAmountStr(String(ingredient.currentStock));
    }
  };

  // Keypad handlers
  const handleDigit = (digit: string) => {
    setError(null);
    setAmountStr((prev) => {
      if (digit === ".") {
        if (prev.includes(".")) return prev;
        return (prev || "0") + ".";
      }
      if (prev === "0") return digit;
      // Prevenir más de 2 decimales
      if (prev.includes(".")) {
        const [, decimals] = prev.split(".");
        if (decimals && decimals.length >= 2) return prev;
      }
      return prev + digit;
    });
  };

  const handleBackspace = () => {
    setError(null);
    setAmountStr((prev) => {
      if (prev.length <= 1) return "0";
      return prev.slice(0, -1);
    });
  };

  const handleClear = () => {
    setError(null);
    setAmountStr("0");
  };

  const handleQuickAdd = (increment: number) => {
    setError(null);
    setAmountStr((prev) => {
      const current = parseFloat(prev) || 0;
      const next = Math.max(0, current + increment);
      return Number.isInteger(next) ? String(next) : next.toFixed(2);
    });
  };

  // Cálculos matemáticos
  const parsedAmount = parseFloat(amountStr) || 0;

  let calculatedAdjustment = 0;
  let projectedStock = ingredient.currentStock;

  if (action === "ENTRADA") {
    calculatedAdjustment = parsedAmount;
    projectedStock = ingredient.currentStock + parsedAmount;
  } else if (action === "MERMA") {
    calculatedAdjustment = -parsedAmount;
    projectedStock = ingredient.currentStock - parsedAmount;
  } else if (action === "AJUSTE") {
    projectedStock = parsedAmount;
    calculatedAdjustment = parsedAmount - ingredient.currentStock;
  }

  const isNegativeStock = projectedStock < 0;

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();

    if (action === "ENTRADA" && parsedAmount <= 0) {
      setError("Ingresa una cantidad válida mayor a 0 para la entrada");
      return;
    }
    if (action === "MERMA" && parsedAmount <= 0) {
      setError("Ingresa una cantidad válida mayor a 0 para la merma");
      return;
    }
    if (action === "MERMA" && !reason.trim()) {
      setError("Especifica el motivo de la merma");
      return;
    }
    if (action === "AJUSTE" && calculatedAdjustment === 0) {
      setError("El nuevo stock es idéntico al actual");
      return;
    }

    const finalReason =
      action === "ENTRADA"
        ? reason || "Compra"
        : action === "AJUSTE"
        ? reason || "Corrección de inventario"
        : reason.trim();

    setError(null);

    startTransition(async () => {
      try {
        const res = await fetch("/api/inventory/adjust", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ingredientId: ingredient.id,
            adjustment: calculatedAdjustment,
            reason: finalReason,
          }),
        });

        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || "Error al actualizar stock");
        }

        onSuccess({
          ...ingredient,
          currentStock: data.newStock ?? projectedStock,
        });
        onClose();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Error desconocido al procesar ajuste");
      }
    });
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="drawer-title"
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/70 backdrop-blur-md transition-opacity duration-200"
    >
      <div className="w-full max-w-lg rounded-t-3xl sm:rounded-3xl bg-card border border-border shadow-2xl overflow-hidden flex flex-col max-h-[92vh] animate-in fade-in slide-in-from-bottom-6 duration-200">
        {/* Header con Insumo y Cerrar */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border bg-white/2">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-primary/10 border border-primary/20 text-primary">
              <Package className="h-5 w-5" />
            </span>
            <div>
              <h2 id="drawer-title" className="text-sm font-black text-text-light uppercase tracking-wide">
                Control de Stock
              </h2>
              <p className="text-xs text-text-light/60 font-medium truncate max-w-60 sm:max-w-xs">
                {ingredient.name}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar modal"
            className="h-9 w-9 flex items-center justify-center rounded-xl text-text-light/40 hover:text-text-light hover:bg-white/10 active:scale-95 transition-all"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 sm:space-y-5 custom-scrollbar">
          {/* Selector de Modo de Acción */}
          <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-white/4 border border-border">
            <button
              type="button"
              onClick={() => handleActionChange("ENTRADA")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                action === "ENTRADA"
                  ? "bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 shadow-sm"
                  : "text-text-light/50 hover:text-text-light"
              }`}
            >
              <Plus className="h-3.5 w-3.5" />
              <span>Entrada</span>
            </button>
            <button
              type="button"
              onClick={() => handleActionChange("MERMA")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                action === "MERMA"
                  ? "bg-red-500/20 border border-red-500/30 text-red-400 shadow-sm"
                  : "text-text-light/50 hover:text-text-light"
              }`}
            >
              <Minus className="h-3.5 w-3.5" />
              <span>Merma</span>
            </button>
            <button
              type="button"
              onClick={() => handleActionChange("AJUSTE")}
              className={`flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-black uppercase tracking-wider transition-all ${
                action === "AJUSTE"
                  ? "bg-primary/20 border border-primary/30 text-primary shadow-sm"
                  : "text-text-light/50 hover:text-text-light"
              }`}
            >
              <SlidersHorizontal className="h-3.5 w-3.5" />
              <span>Ajustar</span>
            </button>
          </div>

          {/* Banner de Previsualización de Stock */}
          <div className="rounded-2xl p-4 bg-white/3 border border-border space-y-2">
            <div className="flex items-center justify-between text-xs">
              <span className="text-text-light/50 font-bold uppercase tracking-wider">
                Stock actual
              </span>
              <span className="font-bold text-text-light tabular-nums">
                {Number(ingredient.currentStock).toFixed(2)} {ingredient.unit}
              </span>
            </div>

            <div className="flex items-center justify-between text-sm pt-1 border-t border-border/60">
              <span className="text-text-light/70 font-black uppercase tracking-wider">
                Nuevo stock
              </span>
              <div className="flex items-center gap-2">
                {calculatedAdjustment !== 0 && (
                  <span
                    className={`text-xs font-black px-2 py-0.5 rounded-md ${
                      calculatedAdjustment > 0
                        ? "bg-emerald-500/20 text-emerald-400"
                        : "bg-red-500/20 text-red-400"
                    }`}
                  >
                    {calculatedAdjustment > 0 ? `+${calculatedAdjustment.toFixed(2)}` : calculatedAdjustment.toFixed(2)}
                  </span>
                )}
                <span
                  className={`text-xl font-black tabular-nums ${
                    isNegativeStock
                      ? "text-red-400"
                      : action === "ENTRADA"
                      ? "text-emerald-400"
                      : action === "MERMA"
                      ? "text-amber-400"
                      : "text-text-light"
                  }`}
                >
                  {projectedStock.toFixed(2)}{" "}
                  <span className="text-xs font-bold text-text-light/50">{ingredient.unit}</span>
                </span>
              </div>
            </div>

            {isNegativeStock && (
              <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/25 text-red-400 text-xs font-bold">
                <AlertTriangle className="h-4 w-4 shrink-0" />
                <span>Alerta: El ajuste resultará en stock negativo</span>
              </div>
            )}
          </div>

          {/* Campo de Motivo (Obligatorio en Merma) */}
          {action === "MERMA" && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label htmlFor="merma-reason-input" className="text-[11px] font-black uppercase tracking-wider text-text-light/60">
                  Motivo de la merma <span className="text-red-400">*</span>
                </label>
              </div>

              <input
                id="merma-reason-input"
                type="text"
                value={reason}
                onChange={(e) => {
                  setReason(e.target.value);
                  setError(null);
                }}
                placeholder="Ej. Se cayó al servir, producto caducado..."
                className="w-full h-11 rounded-xl border border-border bg-white/5 px-4 text-xs text-text-light outline-none focus:border-primary transition-all placeholder:text-text-light/30"
              />

              {/* Chips de sugerencias */}
              <div className="flex flex-wrap gap-1.5 pt-1">
                {MERMA_SUGGESTIONS.map((sug) => (
                  <button
                    key={sug}
                    type="button"
                    onClick={() => {
                      setReason(sug);
                      setError(null);
                    }}
                    className="text-[10px] font-bold text-text-light/60 bg-white/5 border border-border px-2.5 py-1 rounded-lg hover:text-text-light hover:bg-white/10 active:scale-95 transition-all"
                  >
                    {sug}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Display de Cantidad Ingresada */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-black uppercase tracking-wider text-text-light/50">
                {action === "AJUSTE"
                  ? `Conteo físico (${ingredient.unit})`
                  : `Cantidad a ${action === "ENTRADA" ? "sumar" : "restar"} (${ingredient.unit})`}
              </span>
              <button
                type="button"
                onClick={handleClear}
                className="text-[10px] font-black uppercase tracking-wider text-text-light/40 hover:text-text-light flex items-center gap-1 transition-colors"
              >
                <RotateCcw className="h-3 w-3" />
                <span>Limpiar</span>
              </button>
            </div>

            <div className="flex items-center justify-between h-14 rounded-2xl border border-border bg-black/40 px-4">
              <span
                data-testid="keypad-display"
                className="text-2xl sm:text-3xl font-black text-text-light tabular-nums tracking-wider"
              >
                {amountStr}
              </span>
              <span className="text-xs font-black uppercase tracking-wider text-text-light/40">
                {ingredient.unit}
              </span>
            </div>
          </div>

          {/* Presets Rápidos (+1, +5, +10) */}
          <div className="grid grid-cols-3 gap-2">
            {[1, 5, 10].map((preset) => (
              <button
                key={preset}
                type="button"
                onClick={() => handleQuickAdd(preset)}
                className="py-2.5 rounded-xl bg-white/5 border border-border text-xs font-black text-text-light hover:bg-white/10 hover:border-primary/40 active:scale-95 transition-all"
              >
                +{preset} {ingredient.unit}
              </button>
            ))}
          </div>

          {/* Teclado Numérico Táctil (Numpad POS) */}
          <div className="grid grid-cols-3 gap-2">
            {["1", "2", "3", "4", "5", "6", "7", "8", "9", ".", "0"].map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => handleDigit(key)}
                className="h-12 rounded-2xl bg-white/5 border border-border text-lg font-black text-text-light hover:bg-white/10 hover:border-border/80 active:scale-95 active:bg-primary/20 transition-all flex items-center justify-center select-none"
              >
                {key}
              </button>
            ))}
            <button
              type="button"
              onClick={handleBackspace}
              aria-label="Borrar último dígito"
              className="h-12 rounded-2xl bg-white/5 border border-border text-base font-black text-text-light/70 hover:text-text-light hover:bg-white/10 active:scale-95 transition-all flex items-center justify-center select-none"
            >
              <Delete className="h-5 w-5" />
            </button>
          </div>

          {error && (
            <p className="text-xs font-bold text-red-400 bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5">
              {error}
            </p>
          )}
        </div>

        {/* Botones de Acción Final */}
        <div className="p-4 sm:p-6 bg-white/2 border-t border-border flex gap-3">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 h-12 rounded-2xl border border-border bg-white/5 text-xs font-black text-text-light/60 uppercase tracking-wider hover:text-text-light hover:bg-white/10 active:scale-95 transition-all"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={isPending}
            className={`flex-1 h-12 rounded-2xl text-xs font-black uppercase tracking-wider shadow-lg transition-all flex items-center justify-center gap-2 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
              action === "ENTRADA"
                ? "bg-emerald-500 text-black hover:bg-emerald-400 shadow-emerald-500/20"
                : action === "MERMA"
                ? "bg-red-500 text-white hover:bg-red-400 shadow-red-500/20"
                : "bg-primary text-black hover:brightness-110 shadow-primary/20"
            }`}
          >
            {isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                <span>Guardando...</span>
              </>
            ) : (
              <span>
                {action === "ENTRADA"
                  ? "Registrar Entrada"
                  : action === "MERMA"
                  ? "Registrar Merma"
                  : "Confirmar Ajuste"}
              </span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
