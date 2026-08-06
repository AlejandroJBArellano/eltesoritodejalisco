import { FormEvent } from "react";
import { Package } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { IngredientFormState } from "../types";

interface IngredientModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  ingredientForm: IngredientFormState;
  ingredientErrors: Record<string, string>;
  isSubmitting: boolean;
  onFormChange: (field: keyof IngredientFormState, value: string) => void;
}

export function IngredientModal({
  isOpen,
  onClose,
  onSubmit,
  ingredientForm,
  ingredientErrors,
  isSubmitting,
  onFormChange,
}: IngredientModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Nuevo Ingrediente / Insumo"
      subtitle="Registra un ingrediente en el catálogo para control de recetas y stock"
      icon={<Package className="h-5 w-5 text-purple-400" />}
      maxWidth="md"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
            Nombre del Ingrediente *
          </label>
          <input
            type="text"
            value={ingredientForm.name}
            onChange={(e) => onFormChange("name", e.target.value)}
            className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light placeholder-[#666666] outline-none focus:border-primary font-medium"
            placeholder="Ej. Jitomate Sliced o Pan Telera"
          />
          {ingredientErrors.name && (
            <p className="mt-1 text-xs font-bold text-red-400">
              {ingredientErrors.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Unidad de Medida *
            </label>
            <select
              value={ingredientForm.unit}
              onChange={(e) => onFormChange("unit", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm font-bold text-text-light outline-none focus:border-primary"
            >
              <option value="unit">Unidad (pz / pza)</option>
              <option value="kg">Kilogramo (kg)</option>
              <option value="gr">Gramo (gr)</option>
              <option value="lt">Litro (lt)</option>
              <option value="ml">Mililitro (ml)</option>
            </select>
          </div>

          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Tipo de Registro (Tracking) *
            </label>
            <select
              value={ingredientForm.trackingType}
              onChange={(e) => onFormChange("trackingType", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm font-bold text-text-light outline-none focus:border-primary"
            >
              <option value="MEASURABLE">Medible (Admite decimales, ej: 0.5 kg)</option>
              <option value="PIECE">Por pieza (Solo enteros, ej: 2 panes)</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4">
          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Stock Inicial
            </label>
            <input
              type="number"
              step={ingredientForm.trackingType === "MEASURABLE" ? "0.001" : "1"}
              value={ingredientForm.currentStock}
              onChange={(e) => onFormChange("currentStock", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary"
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Stock Mínimo
            </label>
            <input
              type="number"
              step={ingredientForm.trackingType === "MEASURABLE" ? "0.001" : "1"}
              value={ingredientForm.minimumStock}
              onChange={(e) => onFormChange("minimumStock", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary"
              placeholder="0"
            />
          </div>

          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1 font-mono">
              Costo Unitario ($)
            </label>
            <input
              type="number"
              step="0.01"
              value={ingredientForm.costPerUnit}
              onChange={(e) => onFormChange("costPerUnit", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary"
              placeholder="Opcional"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-text-light/70 hover:bg-white/5 cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-purple-500 px-5 py-2.5 text-xs font-black text-white hover:bg-purple-600 disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Guardando..." : "Crear Ingrediente"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
