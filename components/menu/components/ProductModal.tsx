import { Modal } from "@/components/ui/Modal";
import { ChevronDown, Globe, Image as ImageIcon, Utensils } from "lucide-react";
import { useMenuCategories } from "../hooks/useMenuCategories";
import { useMenuItems } from "../hooks/useMenuItems";
import { Ingredient } from "../types";

interface ProductModalProps {
  categories: string[];
  ingredients: Ingredient[];
  onAddIngredient?: () => void;
}

export function ProductModal({
  categories,
  ingredients,
  onAddIngredient,
}: ProductModalProps) {
  const {
    isProductModalOpen: isOpen,
    setIsProductModalOpen,
    handleSubmit: onSubmit,
    formState,
    formErrors,
    isEditing,
    isSubmitting,
    showTranslations,
    setShowTranslations,
    handleFormChange: onFormChange,
    imagePreview,
    fileInputRef,
    handleFileChange: onFileChange,
  } = useMenuItems();

  const { openCategoryModal: onAddCategory } = useMenuCategories();

  const onClose = () => setIsProductModalOpen(false);
  const onToggleTranslations = () => setShowTranslations((v) => !v);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? "Editar Producto" : "Nuevo Producto"}
      subtitle="Llena los datos del platillo o bebida para el catálogo"
      icon={<Utensils className="h-5 w-5 text-primary" />}
      maxWidth="lg"
    >
      <form onSubmit={onSubmit} className="space-y-4">
        <div>
          <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
            Nombre del Platillo *
          </label>
          <input
            type="text"
            value={formState.name}
            onChange={(e) => onFormChange("name", e.target.value)}
            className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light placeholder-[#666666] outline-none focus:border-primary"
            placeholder="Ej. Torta Ahogada Sencilla"
          />
          {formErrors.name && (
            <p className="mt-1 text-xs font-bold text-red-400">
              {formErrors.name}
            </p>
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
              Precio ($) *
            </label>
            <input
              type="text"
              value={formState.price}
              onChange={(e) => onFormChange("price", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary"
              placeholder="0.00"
            />
            {formErrors.price && (
              <p className="mt-1 text-xs font-bold text-red-400">
                {formErrors.price}
              </p>
            )}
          </div>

          <div>
            <div className="flex justify-between items-center mb-1">
              <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block">
                Categoría
              </label>
              <button
                type="button"
                onClick={() => onAddCategory()}
                className="text-[10px] text-amber-400 font-extrabold uppercase tracking-widest hover:underline"
              >
                + Nueva Categoría
              </button>
            </div>
            <select
              value={formState.category}
              onChange={(e) => onFormChange("category", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm font-bold text-text-light outline-none focus:border-primary"
            >
              <option value="">-- Sin Categoría --</option>
              {categories.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div>
          <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
            Descripción
          </label>
          <textarea
            rows={2}
            value={formState.description}
            onChange={(e) => onFormChange("description", e.target.value)}
            className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary"
            placeholder="Ingredientes principales, preparación, etc."
          />
        </div>

        <div>
          <div className="flex justify-between items-center mb-1">
            <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block">
              Enlace Directo a Inventario (Control de Stock Directo)
            </label>
            {onAddIngredient && (
              <button
                type="button"
                onClick={onAddIngredient}
                className="text-[10px] text-purple-400 font-extrabold uppercase tracking-widest hover:underline cursor-pointer"
              >
                + Nuevo Ingrediente
              </button>
            )}
          </div>
          <select
            value={formState.ingredientId || ""}
            onChange={(e) => onFormChange("ingredientId", e.target.value)}
            className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary font-bold"
          >
            <option value="">
              -- No trackear directamente (usar recetas si existen) --
            </option>
            {ingredients.map((ing) => (
              <option key={ing.id} value={ing.id}>
                {ing.name} ({ing.unit})
              </option>
            ))}
          </select>
        </div>

        <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
          <button
            type="button"
            onClick={onToggleTranslations}
            className="w-full flex items-center justify-between px-4 py-3 text-left"
          >
            <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-2">
              <Globe className="h-3.5 w-3.5" />
              Traducción al Inglés (EN)
              {(formState.nameEn || formState.descriptionEn) && (
                <span className="rounded-full bg-blue-500 h-1.5 w-1.5" />
              )}
            </span>
            <ChevronDown
              className={`h-3.5 w-3.5 text-blue-400 transition-transform ${showTranslations ? "rotate-180" : ""}`}
            />
          </button>
          {showTranslations && (
            <div className="px-4 pb-4 space-y-3 border-t border-blue-500/10">
              <div className="pt-3">
                <label className="text-[10px] font-extrabold text-text-light/40 uppercase tracking-wider block mb-1">
                  Nombre en Inglés
                </label>
                <input
                  type="text"
                  value={formState.nameEn}
                  onChange={(e) => onFormChange("nameEn", e.target.value)}
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light placeholder-[#444] outline-none focus:border-blue-500"
                  placeholder="e.g. Drowned Sandwich"
                />
              </div>
              <div>
                <label className="text-[10px] font-extrabold text-text-light/40 uppercase tracking-wider block mb-1">
                  Descripción en Inglés
                </label>
                <textarea
                  rows={2}
                  value={formState.descriptionEn}
                  onChange={(e) =>
                    onFormChange("descriptionEn", e.target.value)
                  }
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light placeholder-[#444] outline-none focus:border-blue-500"
                  placeholder="e.g. Slow-cooked pork, chipotle sauce..."
                />
              </div>
            </div>
          )}
        </div>

        <div>
          <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
            Imagen del Producto
          </label>
          <div className="flex items-center gap-4">
            {imagePreview ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={imagePreview}
                alt="Preview"
                className="h-16 w-16 rounded-xl object-cover border border-border"
              />
            ) : (
              <div className="h-16 w-16 rounded-xl bg-dark/40 border border-border flex items-center justify-center text-text-light/30">
                <ImageIcon className="h-6 w-6" />
              </div>
            )}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={onFileChange}
              className="text-xs text-text-light/60 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 pt-2">
          <input
            type="checkbox"
            id="isAvailable"
            checked={formState.isAvailable}
            onChange={(e) => onFormChange("isAvailable", e.target.checked)}
            className="h-4 w-4 rounded border-border bg-dark/40 text-primary focus:ring-primary"
          />
          <label
            htmlFor="isAvailable"
            className="text-xs font-bold text-text-light"
          >
            Disponible para Punto de Venta
          </label>
        </div>

        <div className="border-t border-border/50 pt-4 mt-2">
          <label className="text-xs font-extrabold text-text-light/50 uppercase tracking-wider block mb-2">
            Opciones de Servicio Digital
          </label>
          <div className="grid grid-cols-2 gap-4">
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showInDineIn"
                checked={formState.showInDineIn}
                onChange={(e) => onFormChange("showInDineIn", e.target.checked)}
                className="h-4 w-4 rounded border-border bg-dark/40 text-primary focus:ring-primary"
              />
              <label
                htmlFor="showInDineIn"
                className="text-xs font-bold text-text-light"
              >
                Comer aquí / Dine-in
              </label>
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="showInTakeaway"
                checked={formState.showInTakeaway}
                onChange={(e) => onFormChange("showInTakeaway", e.target.checked)}
                className="h-4 w-4 rounded border-border bg-dark/40 text-primary focus:ring-primary"
              />
              <label
                htmlFor="showInTakeaway"
                className="text-xs font-bold text-text-light"
              >
                Para llevar / Takeout
              </label>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-text-light/70 hover:bg-white/5"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-black hover:brightness-105 disabled:opacity-50"
          >
            {isSubmitting
              ? "Guardando..."
              : isEditing
                ? "Actualizar Producto"
                : "Guardar Producto"}
          </button>
        </div>
      </form>
    </Modal>
  );
}
