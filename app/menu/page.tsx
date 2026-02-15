"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent, useRef } from "react";

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  isAvailable: boolean;
};

type Ingredient = {
  id: string;
  name: string;
  unit: string;
};

type RecipeItem = {
  id: string;
  menuItemId: string;
  ingredientId: string;
  quantityRequired: number;
  ingredient?: Ingredient;
};

type MenuFormState = {
  id?: string;
  name: string;
  description: string;
  price: string;
  category: string;
  imageUrl: string;
  isAvailable: boolean;
};

type RecipeFormState = {
  ingredientId: string;
  quantityRequired: string;
};

const emptyForm: MenuFormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  imageUrl: "",
  isAvailable: true,
};

const emptyRecipeForm: RecipeFormState = {
  ingredientId: "",
  quantityRequired: "",
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [selectedRecipeMenuItemId, setSelectedRecipeMenuItemId] = useState("");
  const [recipeForm, setRecipeForm] =
    useState<RecipeFormState>(emptyRecipeForm);
  const [recipeErrors, setRecipeErrors] = useState<Record<string, string>>({});
  const [recipeQuantities, setRecipeQuantities] = useState<
    Record<string, string>
  >({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<MenuFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isEditing = Boolean(formState.id);

  const activeCount = useMemo(
    () => items.filter((item) => item.isAvailable).length,
    [items],
  );

  const fetchMenu = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/menu");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Error al cargar el menú");
      }
      setItems(data.items || []);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al cargar",
      );
    } finally {
      setIsLoading(false);
    }
  };

  const fetchIngredients = async () => {
    const response = await fetch("/api/inventory");
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Error al cargar ingredientes");
    }
    const ingredientsList = (data.ingredients || []).map((item: any) => ({
      id: item.id,
      name: item.name,
      unit: item.unit,
    }));
    setIngredients(ingredientsList);
  };

  const fetchRecipes = async (menuItemId: string) => {
    if (!menuItemId) {
      setRecipeItems([]);
      setRecipeQuantities({});
      return;
    }
    const response = await fetch(`/api/recipes?menuItemId=${menuItemId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Error al cargar recetas");
    }
    const recipes = data.recipeItems || [];
    setRecipeItems(recipes);
    setRecipeQuantities(
      recipes.reduce((acc: Record<string, string>, item: RecipeItem) => {
        acc[item.id] = String(item.quantityRequired);
        return acc;
      }, {}),
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchMenu(), fetchIngredients()]);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Error inesperado al cargar",
        );
      }
    };
    load();
  }, []);

  const validateForm = (state: MenuFormState) => {
    const errors: Record<string, string> = {};

    if (!state.name.trim()) {
      errors.name = "El nombre es obligatorio";
    }

    const price = Number(state.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.price = "El precio debe ser un número mayor o igual a 0";
    }

    return errors;
  };

  const handleFormChange = (
    field: keyof MenuFormState,
    value: string | boolean,
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setSelectedFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRecipeFormChange = (
    field: keyof RecipeFormState,
    value: string,
  ) => {
    setRecipeForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormState(emptyForm);
    setFormErrors({});
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const resetRecipeForm = () => {
    setRecipeForm(emptyRecipeForm);
    setRecipeErrors({});
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
      
      const formData = new FormData();
      if (formState.id) formData.append("id", formState.id);
      formData.append("name", formState.name.trim());
      formData.append("description", formState.description);
      formData.append("price", formState.price);
      formData.append("category", formState.category);
      formData.append("isAvailable", String(formState.isAvailable));
      
      if (selectedFile) {
        formData.append("image", selectedFile);
      } else if (formState.imageUrl) {
        formData.append("imageUrl", formState.imageUrl);
      }

      const response = await fetch("/api/menu", {
        method: isEditing ? "PUT" : "POST",
        body: formData, // Enviar como FormData
      });
      
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar el producto");
      }
      await fetchMenu();
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

  const handleEdit = (item: MenuItem) => {
    setFormState({
      id: item.id,
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      category: item.category || "",
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable,
    });
    setImagePreview(item.imageUrl || null);
    setFormErrors({});
    setSelectedFile(null);
  };

  const handleDelete = async (itemId: string) => {
    const confirmed = window.confirm(
      "¿Eliminar este producto del menú? Esta acción no se puede deshacer.",
    );
    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/menu", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo eliminar el producto");
      }
      await fetchMenu();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al eliminar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateRecipeForm = (state: RecipeFormState) => {
    const errors: Record<string, string> = {};
    if (!selectedRecipeMenuItemId) {
      errors.menuItemId = "Selecciona un producto del menú";
    }
    if (!state.ingredientId) {
      errors.ingredientId = "Selecciona un ingrediente";
    }
    const qty = Number(state.quantityRequired);
    if (!Number.isFinite(qty) || qty <= 0) {
      errors.quantityRequired = "La cantidad debe ser mayor a 0";
    }
    return errors;
  };

  const handleRecipeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateRecipeForm(recipeForm);
    setRecipeErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        menuItemId: selectedRecipeMenuItemId,
        ingredientId: recipeForm.ingredientId,
        quantityRequired: Number(recipeForm.quantityRequired),
      };
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar la receta");
      }
      await fetchRecipes(selectedRecipeMenuItemId);
      resetRecipeForm();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al guardar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecipeQuantityChange = (recipeId: string, value: string) => {
    setRecipeQuantities((prev) => ({ ...prev, [recipeId]: value }));
  };

  const updateRecipe = async (recipeId: string) => {
    const qty = Number(recipeQuantities[recipeId]);
    if (!Number.isFinite(qty) || qty <= 0) {
      setRecipeErrors({ update: "La cantidad debe ser mayor a 0" });
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/recipes", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recipeId, quantityRequired: qty }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo actualizar la receta");
      }
      await fetchRecipes(selectedRecipeMenuItemId);
      setErrorMessage(null);
      setRecipeErrors({});
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado al actualizar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    const confirmed = window.confirm(
      "¿Eliminar este ingrediente de la receta?",
    );
    if (!confirmed) {
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recipeId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo eliminar la receta");
      }
      await fetchRecipes(selectedRecipeMenuItemId);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al eliminar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleRecipeMenuSelection = async (menuItemId: string) => {
    setSelectedRecipeMenuItemId(menuItemId);
    try {
      await fetchRecipes(menuItemId);
      setRecipeErrors({});
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado al cargar recetas",
      );
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
              Gestión de Menú
            </h1>
            <p className="text-sm text-gray-600">
              {items.length} productos · {activeCount} disponibles
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
              {isEditing ? "Editar producto" : "Nuevo producto"}
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
                  placeholder="Ej. Torta Ahogada"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    handleFormChange("description", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Descripción corta del platillo"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Precio
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.price}
                    onChange={(event) =>
                      handleFormChange("price", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ej. 95"
                  />
                  {formErrors.price && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.price}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formState.category}
                    onChange={(event) =>
                      handleFormChange("category", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Entradas, Bebidas, etc."
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Imagen del producto
                </label>
                <div className="mt-1 flex items-center gap-4">
                  {imagePreview && (
                    <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200">
                      <img
                        src={imagePreview}
                        alt="Preview"
                        className="h-full w-full object-cover"
                      />
                    </div>
                  )}
                  <input
                    type="file"
                    accept="image/*"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:rounded-full file:border-0 file:bg-blue-50 file:px-4 file:py-2 file:text-sm file:font-semibold file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formState.isAvailable}
                  onChange={(event) =>
                    handleFormChange("isAvailable", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                Disponible en menú
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {isSubmitting
                  ? "Guardando..."
                  : isEditing
                    ? "Actualizar producto"
                    : "Crear producto"}
              </button>
            </form>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">
              Recetas por producto
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Selecciona un producto y registra los ingredientes necesarios.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Producto del menú
                </label>
                <select
                  value={selectedRecipeMenuItemId}
                  onChange={(event) =>
                    handleRecipeMenuSelection(event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                >
                  <option value="">Selecciona un producto</option>
                  {items.map((item) => (
                    <option key={item.id} value={item.id}>
                      {item.name}
                    </option>
                  ))}
                </select>
                {recipeErrors.menuItemId && (
                  <p className="mt-1 text-xs text-red-600">
                    {recipeErrors.menuItemId}
                  </p>
                )}
              </div>

              <form onSubmit={handleRecipeSubmit} className="grid gap-3">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Ingrediente
                  </label>
                  <select
                    value={recipeForm.ingredientId}
                    onChange={(event) =>
                      handleRecipeFormChange("ingredientId", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona un ingrediente</option>
                    {ingredients.map((ingredient) => (
                      <option key={ingredient.id} value={ingredient.id}>
                        {ingredient.name} ({ingredient.unit})
                      </option>
                    ))}
                  </select>
                  {recipeErrors.ingredientId && (
                    <p className="mt-1 text-xs text-red-600">
                      {recipeErrors.ingredientId}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Cantidad requerida
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={recipeForm.quantityRequired}
                    onChange={(event) =>
                      handleRecipeFormChange(
                        "quantityRequired",
                        event.target.value,
                      )
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ej. 0.2"
                  />
                  {recipeErrors.quantityRequired && (
                    <p className="mt-1 text-xs text-red-600">
                      {recipeErrors.quantityRequired}
                    </p>
                  )}
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-lg bg-purple-600 px-4 py-2 text-white hover:bg-purple-700 disabled:opacity-70"
                >
                  {isSubmitting ? "Guardando..." : "Agregar ingrediente"}
                </button>
              </form>

              {recipeErrors.update && (
                <p className="text-xs text-red-600">{recipeErrors.update}</p>
              )}

              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-gray-700">
                  Ingredientes en receta
                </h3>
                {!selectedRecipeMenuItemId ? (
                  <p className="text-sm text-gray-500">
                    Selecciona un producto para ver su receta.
                  </p>
                ) : recipeItems.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    Aún no hay ingredientes registrados.
                  </p>
                ) : (
                  <div className="space-y-3">
                    {recipeItems.map((recipe) => (
                      <div
                        key={recipe.id}
                        className="rounded-lg border border-gray-200 p-3"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div>
                            <p className="text-sm font-semibold text-gray-900">
                              {recipe.ingredient?.name || recipe.ingredientId}
                            </p>
                            <p className="text-xs text-gray-500">
                              Unidad: {recipe.ingredient?.unit || "—"}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <input
                              type="number"
                              min="0"
                              step="0.01"
                              value={recipeQuantities[recipe.id] || ""}
                              onChange={(event) =>
                                handleRecipeQuantityChange(
                                  recipe.id,
                                  event.target.value,
                                )
                              }
                              className="w-24 rounded-lg border border-gray-300 px-2 py-1 text-sm"
                            />
                            <button
                              type="button"
                              onClick={() => updateRecipe(recipe.id)}
                              className="text-blue-600 hover:text-blue-800 text-sm"
                            >
                              Actualizar
                            </button>
                            <button
                              type="button"
                              onClick={() => deleteRecipe(recipe.id)}
                              className="text-red-600 hover:text-red-800 text-sm"
                            >
                              Eliminar
                            </button>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Productos del menú
            </h2>
            <button
              type="button"
              onClick={fetchMenu}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Recargar
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-gray-600">Cargando productos...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">
              No hay productos registrados.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2">Producto</th>
                    <th className="py-2">Categoría</th>
                    <th className="py-2">Precio</th>
                    <th className="py-2">Disponibilidad</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3">
                        <div className="flex items-center gap-3">
                          {item.imageUrl && (
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-lg border border-gray-200">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          )}
                          <div>
                            <p className="font-medium text-gray-900">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-gray-500">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3 text-gray-600">
                        {item.category || "—"}
                      </td>
                      <td className="py-3 text-gray-600">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            item.isAvailable
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {item.isAvailable ? "Disponible" : "No disponible"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
