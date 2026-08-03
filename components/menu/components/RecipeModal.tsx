import { FormEvent } from "react";
import { BookOpen, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/Modal";
import { MenuItem, RecipeFormState, RecipeItem } from "../types";

interface RecipeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (e: FormEvent<HTMLFormElement>) => void;
  items: MenuItem[];
  recipeItems: RecipeItem[];
  ingredients: any[];
  selectedRecipeMenuItemId: string;
  onSelectedRecipeMenuItemIdChange: (id: string) => void;
  recipeForm: RecipeFormState;
  onRecipeFormChange: (form: RecipeFormState) => void;
  recipeErrors: Record<string, string>;
  isSubmitting: boolean;
  deleteArmedRecipeId: string | null;
  onDeleteRecipe: (recipeId: string) => void;
}

export function RecipeModal({
  isOpen,
  onClose,
  onSubmit,
  items,
  recipeItems,
  ingredients,
  selectedRecipeMenuItemId,
  onSelectedRecipeMenuItemIdChange,
  recipeForm,
  onRecipeFormChange,
  recipeErrors,
  isSubmitting,
  deleteArmedRecipeId,
  onDeleteRecipe,
}: RecipeModalProps) {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Gestión de Recetas e Ingredientes"
      subtitle="Asigna ingredientes a cada platillo para control de inventario"
      icon={<BookOpen className="h-5 w-5 text-purple-400" />}
      maxWidth="xl"
    >
      <div className="space-y-6">
        <div>
          <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
            Selecciona Producto del Menú
          </label>
          <select
            value={selectedRecipeMenuItemId}
            onChange={(e) => onSelectedRecipeMenuItemIdChange(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-primary font-bold"
          >
            <option value="">-- Seleccionar Producto --</option>
            {items.map((i) => (
              <option key={i.id} value={i.id}>
                {i.name} (${Number(i.price).toFixed(2)})
              </option>
            ))}
          </select>
        </div>

        {selectedRecipeMenuItemId ? (
          <>
            <form
              onSubmit={onSubmit}
              className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#181818] p-4 rounded-xl border border-white/5"
            >
              <div className="sm:col-span-2">
                <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
                  Ingrediente del Catálogo
                </label>
                <select
                  value={recipeForm.ingredientId}
                  onChange={(e) =>
                    onRecipeFormChange({
                      ...recipeForm,
                      ingredientId: e.target.value,
                    })
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#242424] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary font-bold"
                >
                  <option value="">-- Seleccionar Ingrediente --</option>
                  {ingredients.map((ing) => (
                    <option key={ing.id} value={ing.id}>
                      {ing.name} ({ing.unit})
                    </option>
                  ))}
                </select>
                {recipeErrors.ingredientId && (
                  <p className="text-[10px] font-bold text-red-400 mt-0.5">
                    {recipeErrors.ingredientId}
                  </p>
                )}
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
                  Cantidad Requerida
                </label>
                <div className="flex gap-2">
                  <input
                    type="number"
                    step="0.01"
                    value={recipeForm.quantityRequired}
                    onChange={(e) =>
                      onRecipeFormChange({
                        ...recipeForm,
                        quantityRequired: e.target.value,
                      })
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#242424] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary"
                    placeholder="1"
                  />
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="rounded-xl bg-purple-500 px-3 py-2 text-xs font-bold text-white hover:bg-purple-600 shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
                {recipeErrors.quantityRequired && (
                  <p className="text-[10px] font-bold text-red-400 mt-0.5">
                    {recipeErrors.quantityRequired}
                  </p>
                )}
              </div>
            </form>

            <div>
              <h4 className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider mb-2">
                Ingredientes Configurados ({recipeItems.length})
              </h4>
              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {recipeItems.map((rec) => (
                  <div
                    key={rec.id}
                    className="flex items-center justify-between bg-[#181818] p-3 rounded-xl border border-white/5 text-xs"
                  >
                    <span className="font-bold text-[#E0E0E0]">
                      {rec.ingredientName}
                    </span>
                    <div className="flex items-center gap-3">
                      <span className="text-[#E0E0E0]/60 font-mono font-bold">
                        {rec.quantityRequired} unidad(es)
                      </span>
                      <button
                        type="button"
                        onClick={() => onDeleteRecipe(rec.id)}
                        className={`text-xs font-black transition-all p-1 rounded ${
                          deleteArmedRecipeId === rec.id
                            ? "text-red-300 bg-red-500/30 px-2"
                            : "text-red-400 hover:text-red-300"
                        }`}
                        title={
                          deleteArmedRecipeId === rec.id
                            ? "Confirmar"
                            : "Quitar de receta"
                        }
                      >
                        {deleteArmedRecipeId === rec.id ? (
                          "¿Quitar?"
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                  </div>
                ))}
                {recipeItems.length === 0 && (
                  <p className="text-xs text-[#E0E0E0]/40 italic text-center py-4">
                    No hay ingredientes registrados para este platillo.
                  </p>
                )}
              </div>
            </div>
          </>
        ) : (
          <p className="text-xs text-[#E0E0E0]/40 italic text-center py-8">
            Selecciona un producto arriba para ver o agregar sus ingredientes.
          </p>
        )}
      </div>
    </Modal>
  );
}
