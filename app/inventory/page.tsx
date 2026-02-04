"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

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
  userId: string;
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
  userId: "",
};

const UNIT_OPTIONS = ["unit", "kg", "gr", "lt", "ml"] as const;

export default function InventoryPage() {
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

    if (!state.name.trim()) {
      errors.name = "El nombre es obligatorio";
    }
    if (!state.unit) {
      errors.unit = "La unidad es obligatoria";
    }

    const currentStock = Number(state.currentStock);
    if (!Number.isFinite(currentStock) || currentStock < 0) {
      errors.currentStock =
        "El stock actual debe ser un número mayor o igual a 0";
    }

    const minimumStock = Number(state.minimumStock || 0);
    if (!Number.isFinite(minimumStock) || minimumStock < 0) {
      errors.minimumStock =
        "El stock mínimo debe ser un número mayor o igual a 0";
    }

    if (state.costPerUnit) {
      const cost = Number(state.costPerUnit);
      if (!Number.isFinite(cost) || cost < 0) {
        errors.costPerUnit = "El costo debe ser un número mayor o igual a 0";
      }
    }

    return errors;
  };

  const validateAdjustment = (state: AdjustmentState) => {
    const errors: Record<string, string> = {};

    if (!state.ingredientId) {
      errors.ingredientId = "Selecciona un ingrediente";
    }

    const adjustment = Number(state.adjustment);
    if (!Number.isFinite(adjustment) || adjustment === 0) {
      errors.adjustment = "El ajuste debe ser un número distinto de 0";
    }

    return errors;
  };

  const handleFormChange = (
    field: keyof IngredientFormState,
    value: string,
  ) => {
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
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: formState.id,
        name: formState.name.trim(),
        unit: formState.unit,
        currentStock: Number(formState.currentStock),
        minimumStock: Number(formState.minimumStock || 0),
        costPerUnit:
          formState.costPerUnit === ""
            ? undefined
            : Number(formState.costPerUnit),
      };

      const response = await fetch("/api/inventory", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar el ingrediente");
      }
      await fetchIngredients();
      resetForm();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al guardar",
      );
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
      costPerUnit:
        ingredient.costPerUnit === null || ingredient.costPerUnit === undefined
          ? ""
          : String(ingredient.costPerUnit),
    });
    setFormErrors({});
  };

  const handleDelete = async (ingredientId: string) => {
    const confirmed = window.confirm(
      "¿Eliminar este ingrediente? Esta acción no se puede deshacer.",
    );
    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/inventory", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: ingredientId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo eliminar el ingrediente");
      }
      await fetchIngredients();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al eliminar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdjustSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateAdjustment(adjustState);
    setAdjustErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        ingredientId: adjustState.ingredientId,
        adjustment: Number(adjustState.adjustment),
        reason: adjustState.reason || undefined,
        userId: adjustState.userId || undefined,
      };

      const response = await fetch("/api/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo ajustar el stock");
      }
      await fetchIngredients();
      resetAdjust();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al ajustar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Inventario
            </h1>
            <p className="text-sm text-gray-600">
              {ingredients.length} ingredientes · {lowStockCount} en stock bajo
            </p>
          </div>
          <div className="flex gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Editar ingrediente" : "Nuevo ingrediente"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    handleFormChange("name", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Ej. Pan Telera"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Unidad
                  </label>
                  <select
                    value={formState.unit}
                    onChange={(event) =>
                      handleFormChange("unit", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    {UNIT_OPTIONS.map((unit) => (
                      <option key={unit} value={unit}>
                        {unit}
                      </option>
                    ))}
                  </select>
                  {formErrors.unit && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.unit}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Costo por unidad
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.costPerUnit}
                    onChange={(event) =>
                      handleFormChange("costPerUnit", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ej. 25.50"
                  />
                  {formErrors.costPerUnit && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.costPerUnit}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Stock actual
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.currentStock}
                    onChange={(event) =>
                      handleFormChange("currentStock", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ej. 12"
                  />
                  {formErrors.currentStock && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.currentStock}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Stock mínimo
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.minimumStock}
                    onChange={(event) =>
                      handleFormChange("minimumStock", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ej. 4"
                  />
                  {formErrors.minimumStock && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.minimumStock}
                    </p>
                  )}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {isSubmitting
                  ? "Guardando..."
                  : isEditing
                    ? "Actualizar ingrediente"
                    : "Crear ingrediente"}
              </button>
            </form>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">
              Ajuste manual de stock
            </h2>
            <form onSubmit={handleAdjustSubmit} className="mt-4 grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Ingrediente
                </label>
                <select
                  value={adjustState.ingredientId}
                  onChange={(event) =>
                    handleAdjustChange("ingredientId", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecciona un ingrediente</option>
                  {ingredients.map((ingredient) => (
                    <option key={ingredient.id} value={ingredient.id}>
                      {ingredient.name}
                    </option>
                  ))}
                </select>
                {adjustErrors.ingredientId && (
                  <p className="mt-1 text-xs text-red-600">
                    {adjustErrors.ingredientId}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Ajuste (positivo o negativo)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={adjustState.adjustment}
                  onChange={(event) =>
                    handleAdjustChange("adjustment", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Ej. -2 o 3"
                />
                {adjustErrors.adjustment && (
                  <p className="mt-1 text-xs text-red-600">
                    {adjustErrors.adjustment}
                  </p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Motivo
                </label>
                <input
                  type="text"
                  value={adjustState.reason}
                  onChange={(event) =>
                    handleAdjustChange("reason", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Merma, ajuste de conteo, etc."
                />
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Usuario (opcional)
                </label>
                <input
                  type="text"
                  value={adjustState.userId}
                  onChange={(event) =>
                    handleAdjustChange("userId", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="ID del usuario"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-70"
              >
                {isSubmitting ? "Ajustando..." : "Aplicar ajuste"}
              </button>
            </form>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Ingredientes
            </h2>
            <button
              type="button"
              onClick={fetchIngredients}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Recargar
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-gray-600">
              Cargando ingredientes...
            </p>
          ) : ingredients.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">
              No hay ingredientes registrados.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2">Ingrediente</th>
                    <th className="py-2">Unidad</th>
                    <th className="py-2">Stock</th>
                    <th className="py-2">Mínimo</th>
                    <th className="py-2">Costo</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {ingredients.map((ingredient) => {
                    const isLow =
                      ingredient.currentStock <= ingredient.minimumStock;
                    return (
                      <tr
                        key={ingredient.id}
                        className="border-b last:border-0"
                      >
                        <td className="py-3 font-medium text-gray-900">
                          {ingredient.name}
                          {isLow && (
                            <span className="ml-2 rounded-full bg-red-100 px-2 py-1 text-xs text-red-700">
                              Bajo
                            </span>
                          )}
                        </td>
                        <td className="py-3 text-gray-600">
                          {ingredient.unit}
                        </td>
                        <td className="py-3 text-gray-600">
                          {ingredient.currentStock}
                        </td>
                        <td className="py-3 text-gray-600">
                          {ingredient.minimumStock}
                        </td>
                        <td className="py-3 text-gray-600">
                          {ingredient.costPerUnit !== null &&
                          ingredient.costPerUnit !== undefined
                            ? `$${ingredient.costPerUnit.toFixed(2)}`
                            : "—"}
                        </td>
                        <td className="py-3">
                          <div className="flex gap-2">
                            <button
                              type="button"
                              onClick={() => handleEdit(ingredient)}
                              className="text-blue-600 hover:text-blue-800"
                            >
                              Editar
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(ingredient.id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              Eliminar
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
