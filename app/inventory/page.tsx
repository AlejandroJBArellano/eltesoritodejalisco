"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { createClient } from "@/lib/supabase/client";

type Ingredient = {
  id: string;
  name: string;
  unit: string;
  currentStock: number;
  minimumStock: number;
  costPerUnit?: number | null;
};

type IngredientFormState = {
  id?: string;
  name: string;
  unit: string;
  currentStock: string;
  minimumStock: string;
  costPerUnit: string;
};

type AdjustmentState = {
  ingredientId: string;
  adjustment: string;
  reason: string;
};

const emptyForm: IngredientFormState = {
  name: "",
  unit: "unit",
  currentStock: "",
  minimumStock: "0",
  costPerUnit: "",
};

const emptyAdjustment: AdjustmentState = {
  ingredientId: "",
  adjustment: "",
  reason: "",
};

const UNIT_OPTIONS = [
  { label: "Unidad", value: "unit" },
  { label: "Kilogramo", value: "kg" },
  { label: "Gramo", value: "gr" },
  { label: "Litro", value: "lt" },
  { label: "Mililitro", value: "ml" },
] as const;

export default function InventoryPage() {
  const supabase = createClient();
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<IngredientFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [adjustState, setAdjustState] =
    useState<AdjustmentState>(emptyAdjustment);
  const [adjustErrors, setAdjustErrors] = useState<Record<string, string>>({});

  const isEditing = Boolean(formState.id);

  const lowStockCount = useMemo(
    () =>
      ingredients.filter((item) => item.currentStock <= item.minimumStock)
        .length,
    [ingredients],
  );

  const fetchIngredients = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/inventory");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Error al cargar ingredientes");
      }
      setIngredients(data.ingredients || []);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al cargar",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchIngredients();
  }, []);

  const validateForm = (state: IngredientFormState) => {
    const errors: Record<string, string> = {};
    if (!state.name.trim()) errors.name = "El nombre es obligatorio";
    if (!state.unit) errors.unit = "La unidad es obligatoria";
    const currentStock = Number(state.currentStock);
    if (!Number.isFinite(currentStock) || currentStock < 0) errors.currentStock = "Mínimo 0";
    return errors;
  };

  const validateAdjustment = (state: AdjustmentState) => {
    const errors: Record<string, string> = {};
    if (!state.ingredientId) errors.ingredientId = "Selecciona un ingrediente";
    const adjustment = Number(state.adjustment);
    if (!Number.isFinite(adjustment) || adjustment === 0) errors.adjustment = "Debe ser distinto de 0";
    return errors;
  };

  const handleFormChange = (field: keyof IngredientFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleAdjustChange = (field: keyof AdjustmentState, value: string) => {
    setAdjustState((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormState(emptyForm);
    setFormErrors({});
  };

  const resetAdjust = () => {
    setAdjustState(emptyAdjustment);
    setAdjustErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(formState);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setIsSubmitting(true);
      const payload = {
        id: formState.id,
        name: formState.name.trim(),
        unit: formState.unit,
        currentStock: Number(formState.currentStock),
        minimumStock: Number(formState.minimumStock || 0),
        costPerUnit: formState.costPerUnit === "" ? undefined : Number(formState.costPerUnit),
      };

      const response = await fetch("/api/inventory", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Error al guardar");
      await fetchIngredients();
      resetForm();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateAdjustment(adjustState);
    setAdjustErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setIsSubmitting(true);
      
      // Obtener el ID del usuario de la sesión actual
      const { data: { user } } = await supabase.auth.getUser();
      
      const payload = {
        ingredientId: adjustState.ingredientId,
        adjustment: Number(adjustState.adjustment),
        reason: adjustState.reason || undefined,
        userId: user?.id, // ID automático desde Supabase Auth
      };

      const response = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Error al ajustar");
      await fetchIngredients();
      resetAdjust();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (ingredient: Ingredient) => {
    setFormState({
      id: ingredient.id,
      name: ingredient.name,
      unit: ingredient.unit,
      currentStock: String(ingredient.currentStock),
      minimumStock: String(ingredient.minimumStock),
      costPerUnit: ingredient.costPerUnit === null ? "" : String(ingredient.costPerUnit),
    });
    setFormErrors({});
  };

  const handleDelete = async (ingredientId: string) => {
    if (!window.confirm("¿Eliminar este ingrediente?")) return;
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ingredientId }),
      });
      if (!response.ok) throw new Error("Error al eliminar");
      await fetchIngredients();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="mb-8 rounded-xl border-2 border-primary/20 bg-primary/5 p-4 text-sm font-bold text-primary">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl bg-white p-8 shadow-sm border border-dark/5">
            <h2 className="text-xl font-black text-dark tracking-tight uppercase mb-6">
              {isEditing ? "Editar ingrediente" : "Nuevo ingrediente"}
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-6">
              <div>
                <label className="text-xs font-black text-dark/40 uppercase tracking-widest block mb-2">Nombre</label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(e) => handleFormChange("name", e.target.value)}
                  className="w-full rounded-xl border-2 border-dark/5 bg-gray-50 px-4 py-3 font-bold text-dark focus:border-warning outline-none transition-all"
                  placeholder="Ej. Pan Telera"
                />
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-black text-dark/40 uppercase tracking-widest block mb-2">Unidad</label>
                  <select
                    value={formState.unit}
                    onChange={(e) => handleFormChange("unit", e.target.value)}
                    className="w-full rounded-xl border-2 border-dark/5 bg-gray-50 px-4 py-3 font-bold text-dark focus:border-warning outline-none transition-all"
                  >
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit.value} value={unit.value}>{unit.label}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-black text-dark/40 uppercase tracking-widest block mb-2">Costo (MXN)</label>
                  <input
                    type="number"
                    value={formState.costPerUnit}
                    onChange={(e) => handleFormChange("costPerUnit", e.target.value)}
                    className="w-full rounded-xl border-2 border-dark/5 bg-gray-50 px-4 py-3 font-bold text-dark focus:border-warning outline-none transition-all"
                    placeholder="0.00"
                  />
                </div>
              </div>

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-black text-dark/40 uppercase tracking-widest block mb-2">Stock Actual</label>
                  <input
                    type="number"
                    value={formState.currentStock}
                    onChange={(e) => handleFormChange("currentStock", e.target.value)}
                    className="w-full rounded-xl border-2 border-dark/5 bg-gray-50 px-4 py-3 font-bold text-dark focus:border-warning outline-none transition-all"
                  />
                </div>
                <div>
                  <label className="text-xs font-black text-dark/40 uppercase tracking-widest block mb-2">Stock Mínimo</label>
                  <input
                    type="number"
                    value={formState.minimumStock}
                    onChange={(e) => handleFormChange("minimumStock", e.target.value)}
                    className="w-full rounded-xl border-2 border-dark/5 bg-gray-50 px-4 py-3 font-bold text-dark focus:border-warning outline-none transition-all"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-warning py-4 text-sm font-black text-dark hover:bg-warning/90 transition-all shadow-lg shadow-warning/20 uppercase tracking-widest"
              >
                {isSubmitting ? "Guardando..." : isEditing ? "Actualizar" : "Crear Ingrediente"}
              </button>
            </form>
          </div>

          <div className="rounded-2xl bg-dark p-8 shadow-2xl">
            <h2 className="text-xl font-black text-white tracking-tight uppercase mb-6">Ajuste Manual</h2>
            <form onSubmit={handleAdjustSubmit} className="grid gap-6">
              <div>
                <label className="text-xs font-black text-white/40 uppercase tracking-widest block mb-2">Ingrediente</label>
                <select
                  value={adjustState.ingredientId}
                  onChange={(e) => handleAdjustChange("ingredientId", e.target.value)}
                  className="w-full rounded-xl border-2 border-white/10 bg-white/5 px-4 py-3 font-bold text-white focus:border-warning outline-none transition-all"
                >
                  <option value="" className="text-dark">Seleccionar...</option>
                  {ingredients.map((ing) => <option key={ing.id} value={ing.id} className="text-dark">{ing.name}</option>)}
                </select>
              </div>

              <div>
                <label className="text-xs font-black text-white/40 uppercase tracking-widest block mb-2">Ajuste (+/-)</label>
                <input
                  type="number"
                  value={adjustState.adjustment}
                  onChange={(e) => handleAdjustChange("adjustment", e.target.value)}
                  className="w-full rounded-xl border-2 border-white/10 bg-white/5 px-4 py-3 font-bold text-white focus:border-warning outline-none transition-all"
                  placeholder="Ej. -2 o 5"
                />
              </div>

              <div>
                <label className="text-xs font-black text-white/40 uppercase tracking-widest block mb-2">Motivo</label>
                <input
                  type="text"
                  value={adjustState.reason}
                  onChange={(e) => handleAdjustChange("reason", e.target.value)}
                  className="w-full rounded-xl border-2 border-white/10 bg-white/5 px-4 py-3 font-bold text-white focus:border-warning outline-none transition-all"
                  placeholder="Merma, ajuste de conteo..."
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-xl bg-primary py-4 text-sm font-black text-white hover:bg-primary/90 transition-all shadow-lg shadow-primary/20 uppercase tracking-widest"
              >
                {isSubmitting ? "Procesando..." : "Aplicar Ajuste"}
              </button>
            </form>
          </div>
        </section>

        <section className="mt-12 rounded-2xl bg-white p-8 shadow-sm border border-dark/5">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-black text-dark tracking-tight uppercase">Inventario Actual</h2>
            <button onClick={fetchIngredients} className="text-xs font-black text-secondary uppercase tracking-widest hover:underline">Recargar</button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b-2 border-dark/5 text-dark/40 font-black uppercase tracking-widest">
                  <th className="pb-4 px-2">Ingrediente</th>
                  <th className="pb-4 px-2">Stock</th>
                  <th className="pb-4 px-2">Unidad</th>
                  <th className="pb-4 px-2 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-dark/5">
                {ingredients.map((ing) => (
                  <tr key={ing.id} className="group hover:bg-gray-50 transition-colors">
                    <td className="py-4 px-2 font-bold text-dark">
                      {ing.name}
                      {ing.currentStock <= ing.minimumStock && (
                        <span className="ml-3 rounded-full bg-primary/10 px-2 py-0.5 text-[10px] font-black text-primary uppercase">Bajo</span>
                      )}
                    </td>
                    <td className={`py-4 px-2 font-black ${ing.currentStock <= ing.minimumStock ? 'text-primary' : 'text-success'}`}>{ing.currentStock}</td>
                    <td className="py-4 px-2 text-dark/50 font-bold uppercase text-xs">{ing.unit}</td>
                    <td className="py-4 px-2 text-right">
                      <div className="flex justify-end gap-4">
                        <button onClick={() => handleEdit(ing)} className="text-xs font-black text-secondary uppercase hover:underline">Editar</button>
                        <button onClick={() => handleDelete(ing.id)} className="text-xs font-black text-primary uppercase hover:underline">Borrar</button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
