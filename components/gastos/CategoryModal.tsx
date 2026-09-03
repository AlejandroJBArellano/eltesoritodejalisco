"use client";

import React, { useEffect, useState } from "react";
import { AlertTriangle, Tag, X } from "lucide-react";
import type { Category, ExpenseCategoryType } from "./types";
import type {
  CreateCategoryPayload,
  UpdateCategoryPayload,
} from "./hooks/useGastosData";

export interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  editingCategory: Category | null;
  onCreateCategory: (payload: CreateCategoryPayload) => Promise<void>;
  onUpdateCategory: (payload: UpdateCategoryPayload) => Promise<void>;
}

export function CategoryModal({
  isOpen,
  onClose,
  editingCategory,
  onCreateCategory,
  onUpdateCategory,
}: CategoryModalProps) {
  const [name, setName] = useState<string>("");
  const [color, setColor] = useState<string>("#FFB7CE");
  const [tipoGasto, setTipoGasto] = useState<ExpenseCategoryType>("variable");
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingCategory) {
      setName(editingCategory.name);
      setColor(editingCategory.color || "#FFB7CE");
      setTipoGasto(editingCategory.tipo_gasto || "variable");
    } else {
      setName("");
      setColor("#FFB7CE");
      setTipoGasto("variable");
    }
    setError(null);
  }, [editingCategory, isOpen]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setError("El nombre de la categoría es requerido");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      if (editingCategory) {
        await onUpdateCategory({
          id: editingCategory.id,
          name: name.trim(),
          color,
          tipo_gasto: tipoGasto,
        });
      } else {
        await onCreateCategory({
          name: name.trim(),
          color,
          tipo_gasto: tipoGasto,
        });
      }
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al procesar categoría");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 no-print">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border space-y-5">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
            <Tag className="h-4 w-4 text-purple-400" />
            {editingCategory ? "Editar Categoría" : "Crear Categoría de Gasto"}
          </h3>
          <button
            onClick={() => {
              setError(null);
              onClose();
            }}
            className="text-text-light/40 hover:text-text-light transition-colors p-1 rounded-lg hover:bg-white/10"
            type="button"
            aria-label="Cerrar modal de categoría"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 p-3 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Nombre */}
          <div>
            <label
              htmlFor="category-name-input"
              className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5"
            >
              Nombre de la Categoría *
            </label>
            <input
              id="category-name-input"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Ej. Publicidad, Gasolina, Mantenimiento"
              required
              aria-label="Nombre de la Categoría"
              className="w-full rounded-xl border border-border bg-dark/40 px-3.5 py-2.5 text-xs text-text-light outline-none focus:border-primary transition-colors placeholder:text-text-light/30"
            />
          </div>

          {/* Color */}
          <div>
            <label
              htmlFor="category-color-input"
              className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5"
            >
              Color Distintivo
            </label>
            <div className="flex items-center gap-3 bg-dark/40 p-2 rounded-xl border border-border">
              <input
                id="category-color-input"
                type="color"
                value={color}
                onChange={(e) => setColor(e.target.value)}
                aria-label="Color Distintivo"
                className="h-8 w-12 cursor-pointer rounded-lg border-0 bg-transparent p-0"
              />
              <span className="text-xs font-mono font-bold text-text-light/70">
                {color}
              </span>
            </div>
          </div>

          {/* Tipo de Gasto */}
          <div>
            <span className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
              Tipo de Gasto *
            </span>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setTipoGasto("variable")}
                className={`py-2.5 px-3 rounded-xl border font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                  tipoGasto === "variable"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400"
                    : "bg-dark/40 border-border text-text-light/50 hover:text-text-light"
                }`}
              >
                Variable
              </button>
              <button
                type="button"
                onClick={() => setTipoGasto("fijo")}
                className={`py-2.5 px-3 rounded-xl border font-black text-xs uppercase tracking-wider transition-all active:scale-95 ${
                  tipoGasto === "fijo"
                    ? "bg-amber-500/20 border-amber-500 text-amber-400"
                    : "bg-dark/40 border-border text-text-light/50 hover:text-text-light"
                }`}
              >
                Fijo
              </button>
            </div>
            <p className="text-[10px] text-text-light/40 mt-2 italic">
              {tipoGasto === "variable"
                ? "💡 Variables: Restan en el Corte Diario (ej. insumos, compras de jornada)."
                : "💡 Fijos: No restan en el Corte Diario (ej. rentas, servicios, nómina fija)."}
            </p>
          </div>

          {/* Botones */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-white/5 text-text-light/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary text-black py-3 rounded-xl font-black hover:brightness-105 transition-all uppercase text-xs tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting
                ? "Guardando..."
                : editingCategory
                ? "Actualizar Categoría"
                : "Guardar Categoría"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
