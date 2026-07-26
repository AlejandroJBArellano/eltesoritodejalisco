"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";
import {
  ArrowLeft,
  Utensils,
  CheckCircle2,
  XCircle,
  Layers,
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  ChefHat,
  Image as ImageIcon,
  BookOpen,
} from "lucide-react";

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
  ingredientName: string;
  quantityRequired: number;
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
  ingredientName: string;
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
  ingredientName: "",
  quantityRequired: "",
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [selectedRecipeMenuItemId, setSelectedRecipeMenuItemId] = useState("");
  const [recipeForm, setRecipeForm] = useState<RecipeFormState>(emptyRecipeForm);
  const [recipeErrors, setRecipeErrors] = useState<Record<string, string>>({});
  const [recipeQuantities, setRecipeQuantities] = useState<Record<string, string>>({});
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
    [items]
  );

  const categoriesCount = useMemo(
    () => new Set(items.map((i) => i.category).filter(Boolean)).size,
    [items]
  );

  const fetchMenu = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/menu");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Error al cargar el menú");
      }
      setItems(
        (data.items || []).map((item: any) => ({
          ...item,
          isAvailable: item.is_available,
          imageUrl: item.image_url,
        }))
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al cargar"
      );
    } finally {
      setIsLoading(false);
    }
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
      }, {})
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        await Promise.all([fetchMenu()]);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Error inesperado al cargar"
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
    value: string | boolean
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
    value: string
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
        body: formData,
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
        error instanceof Error ? error.message : "Error inesperado al guardar"
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
      "¿Eliminar este producto del menú? Esta acción no se puede deshacer."
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
        error instanceof Error ? error.message : "Error inesperado al eliminar"
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
    if (!state.ingredientName) {
      errors.ingredientName = "Ingresa el nombre del ingrediente";
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
        ingredientName: recipeForm.ingredientName,
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
        error instanceof Error ? error.message : "Error inesperado al guardar"
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
          : "Error inesperado al actualizar"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    const confirmed = window.confirm(
      "¿Eliminar este ingrediente de la receta?"
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
        error instanceof Error ? error.message : "Error inesperado al eliminar"
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
          : "Error inesperado al cargar recetas"
      );
    }
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Header */}
      <header className="border-b border-white/5 bg-[#181818]/60 backdrop-blur-md sticky top-0 z-10">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex items-center gap-4">
            <Link
              href="/"
              className="flex items-center gap-2 rounded-xl bg-[#242424] border border-white/5 px-3 py-2 text-xs font-bold text-[#E0E0E0]/80 hover:text-white hover:border-white/10 transition-all"
            >
              <ArrowLeft className="h-4 w-4" />
              <span className="uppercase tracking-wider">Dashboard</span>
            </Link>
            <div>
              <h1 className="text-xl font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-primary"></span>
                Gestión de Menú
              </h1>
              <p className="text-xs text-[#E0E0E0]/50 font-medium">
                Administra productos, catálogo y recetas del restaurante
              </p>
            </div>
          </div>
          <div className="flex gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-xl border border-white/10 bg-[#242424] px-4 py-2 text-xs font-extrabold text-[#E0E0E0]/70 hover:bg-[#2c2c2c] hover:text-white uppercase tracking-wider transition-all"
              >
                Cancelar Edición
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Quick Stats Cards */}
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Total Productos
              </span>
              <div className="rounded-xl bg-primary/10 p-3 text-primary">
                <Utensils className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
              {items.length}
            </p>
          </div>

          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Disponibles
              </span>
              <div className="rounded-xl bg-success/10 p-3 text-success">
                <CheckCircle2 className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
              {activeCount}
            </p>
          </div>

          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                No Disponibles
              </span>
              <div className="rounded-xl bg-white/5 p-3 text-gray-400">
                <XCircle className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
              {items.length - activeCount}
            </p>
          </div>

          <div className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 transition-all hover:border-white/10">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Categorías
              </span>
              <div className="rounded-xl bg-secondary/10 p-3 text-secondary">
                <Layers className="h-5 w-5" />
              </div>
            </div>
            <p className="mt-3 text-3xl font-black text-[#E0E0E0] tracking-tight">
              {categoriesCount}
            </p>
          </div>
        </div>

        {/* Form & Recipes Grid */}
        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          {/* Card Form: Producto */}
          <div className="rounded-2xl bg-[#242424] p-6 sm:p-8 shadow-sm border border-white/5">
            <h2 className="mb-6 text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              {isEditing ? "Editar Producto" : "Nuevo Producto"}
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-5">
              <div>
                <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-2">
                  Nombre del Platillo
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    handleFormChange("name", event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] placeholder-[#666666] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  placeholder="Ej. Torta Ahogada Sencilla"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs font-bold text-red-400">
                    {formErrors.name}
                  </p>
                )}
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-2">
                  Descripción
                </label>
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    handleFormChange("description", event.target.value)
                  }
                  className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] placeholder-[#666666] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all resize-none"
                  rows={3}
                  placeholder="Descripción corta del platillo, ingredientes principales o notas."
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-2">
                    Precio (MXN)
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.price}
                    onChange={(event) =>
                      handleFormChange("price", event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] placeholder-[#666666] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                    placeholder="Ej. 95.00"
                  />
                  {formErrors.price && (
                    <p className="mt-1 text-xs font-bold text-red-400">
                      {formErrors.price}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-2">
                    Categoría
                  </label>
                  <select
                    value={formState.category}
                    onChange={(event) =>
                      handleFormChange("category", event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                  >
                    <option value="">Selecciona una categoría</option>
                    <option value="Bebidas">Bebidas</option>
                    <option value="Platillos Fuertes">Platillos Fuertes</option>
                    <option value="Antojitos">Antojitos</option>
                    <option value="Tacos">Tacos</option>
                    <option value="Extras">Extras</option>
                    <option value="Postres">Postres</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-2">
                  Imagen del Producto
                </label>
                <div className="space-y-3">
                  <div className="flex items-center gap-4">
                    {imagePreview ? (
                      <div className="h-16 w-16 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#181818] relative">
                        <img
                          src={imagePreview}
                          alt="Preview"
                          className="h-full w-full object-cover"
                          onError={() => setImagePreview(null)}
                        />
                      </div>
                    ) : (
                      <div className="h-16 w-16 flex-shrink-0 flex items-center justify-center rounded-xl border border-white/5 bg-[#181818] text-[#E0E0E0]/30">
                        <ImageIcon className="h-6 w-6" />
                      </div>
                    )}
                    <div className="flex-1 space-y-2">
                      <input
                        type="file"
                        accept="image/*"
                        ref={fileInputRef}
                        onChange={handleFileChange}
                        className="block w-full text-xs text-[#E0E0E0]/60 file:mr-3 file:rounded-xl file:border-0 file:bg-white/10 file:px-3 file:py-1.5 file:text-xs file:font-bold file:text-[#E0E0E0] hover:file:bg-white/20 file:transition-all cursor-pointer"
                      />
                      <input
                        type="url"
                        value={formState.imageUrl}
                        onChange={(event) => {
                          const url = event.target.value;
                          handleFormChange("imageUrl", url);
                          if (!selectedFile) {
                            setImagePreview(url || null);
                          }
                        }}
                        className="w-full rounded-xl border border-white/10 bg-[#181818] px-3.5 py-2 text-xs text-[#E0E0E0] placeholder-[#666666] focus:border-primary focus:ring-1 focus:ring-primary outline-none transition-all"
                        placeholder="O pega la URL de la imagen (ej. https://...)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-3 text-xs font-bold text-[#E0E0E0]/80 uppercase tracking-wider cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={formState.isAvailable}
                  onChange={(event) =>
                    handleFormChange("isAvailable", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-white/10 bg-[#181818] text-primary focus:ring-primary accent-primary"
                />
                <span>
                  {formState.isAvailable ? "Disponible en Menú" : "No Disponible"}
                </span>
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="mt-2 w-full rounded-xl bg-primary px-5 py-3 text-xs font-black text-black uppercase tracking-widest hover:bg-primary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Plus className="h-4 w-4" />
                {isSubmitting
                  ? "Guardando..."
                  : isEditing
                  ? "Actualizar Producto"
                  : "Crear Producto"}
              </button>
            </form>
          </div>

          {/* Card Form: Recetas */}
          <div className="rounded-2xl bg-[#242424] p-6 sm:p-8 shadow-sm border border-white/5 flex flex-col justify-between">
            <div>
              <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2 mb-1">
                <span className="h-2 w-2 rounded-full bg-secondary"></span>
                Recetas por Producto
              </h2>
              <p className="text-xs text-[#E0E0E0]/50 font-medium mb-6">
                Asigna insumos requeridos por platillo para control de inventario.
              </p>

              <div className="space-y-4">
                <div>
                  <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-2">
                    Seleccionar Producto
                  </label>
                  <select
                    value={selectedRecipeMenuItemId}
                    onChange={(event) =>
                      handleRecipeMenuSelection(event.target.value)
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                  >
                    <option value="">Selecciona un producto</option>
                    {items.map((item) => (
                      <option key={item.id} value={item.id}>
                        {item.name}
                      </option>
                    ))}
                  </select>
                  {recipeErrors.menuItemId && (
                    <p className="mt-1 text-xs font-bold text-red-400">
                      {recipeErrors.menuItemId}
                    </p>
                  )}
                </div>

                <form onSubmit={handleRecipeSubmit} className="grid gap-4">
                  <div>
                    <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-2">
                      Ingrediente / Insumo
                    </label>
                    <input
                      type="text"
                      value={recipeForm.ingredientName}
                      onChange={(event) =>
                        handleRecipeFormChange(
                          "ingredientName",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2 text-sm text-[#E0E0E0] placeholder-[#666666] focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                      placeholder="Ej. Tomate (kg), Carne de Cerdo (kg)"
                    />
                    {recipeErrors.ingredientName && (
                      <p className="mt-1 text-xs font-bold text-red-400">
                        {recipeErrors.ingredientName}
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-2">
                      Cantidad Requerida por Unidad
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={recipeForm.quantityRequired}
                      onChange={(event) =>
                        handleRecipeFormChange(
                          "quantityRequired",
                          event.target.value
                        )
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2 text-sm text-[#E0E0E0] placeholder-[#666666] focus:border-secondary focus:ring-1 focus:ring-secondary outline-none transition-all"
                      placeholder="Ej. 0.20"
                    />
                    {recipeErrors.quantityRequired && (
                      <p className="mt-1 text-xs font-bold text-red-400">
                        {recipeErrors.quantityRequired}
                      </p>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full rounded-xl bg-secondary px-5 py-2.5 text-xs font-black text-black uppercase tracking-widest hover:bg-secondary/90 disabled:opacity-50 transition-all flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    {isSubmitting ? "Guardando..." : "Agregar Ingrediente"}
                  </button>
                </form>

                {recipeErrors.update && (
                  <p className="text-xs font-bold text-red-400">
                    {recipeErrors.update}
                  </p>
                )}
              </div>
            </div>

            {/* List of Recipe Ingredients */}
            <div className="mt-6 space-y-3 pt-4 border-t border-white/5">
              <h3 className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider">
                Ingredientes en Receta
              </h3>
              {!selectedRecipeMenuItemId ? (
                <p className="text-xs text-[#E0E0E0]/40 italic">
                  Selecciona un producto arriba para gestionar su receta.
                </p>
              ) : recipeItems.length === 0 ? (
                <p className="text-xs text-[#E0E0E0]/40 italic">
                  Sin ingredientes registrados para este platillo.
                </p>
              ) : (
                <div className="space-y-2.5 max-h-56 overflow-y-auto pr-1">
                  {recipeItems.map((recipe) => (
                    <div
                      key={recipe.id}
                      className="rounded-xl border border-white/5 bg-[#181818] p-3 flex flex-wrap items-center justify-between gap-3"
                    >
                      <p className="text-xs font-bold text-[#E0E0E0]">
                        {recipe.ingredientName}
                      </p>
                      <div className="flex items-center gap-2">
                        <input
                          type="number"
                          min="0"
                          step="0.01"
                          value={recipeQuantities[recipe.id] || ""}
                          onChange={(event) =>
                            handleRecipeQuantityChange(
                              recipe.id,
                              event.target.value
                            )
                          }
                          className="w-20 rounded-lg border border-white/10 bg-[#242424] px-2 py-1 text-xs font-bold text-[#E0E0E0] focus:border-secondary outline-none"
                        />
                        <button
                          type="button"
                          onClick={() => updateRecipe(recipe.id)}
                          className="rounded-lg bg-white/5 px-2.5 py-1 text-xs font-bold text-secondary hover:bg-secondary/10 transition-colors"
                        >
                          Guardar
                        </button>
                        <button
                          type="button"
                          onClick={() => deleteRecipe(recipe.id)}
                          className="rounded-lg bg-white/5 p-1 text-gray-400 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                          title="Eliminar ingrediente"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </section>

        {/* Section 3: Productos del Menú */}
        <section className="rounded-2xl bg-[#242424] p-6 sm:p-8 shadow-sm border border-white/5">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary"></span>
              Catálogo de Productos
            </h2>
            <button
              type="button"
              onClick={fetchMenu}
              className="flex items-center gap-2 rounded-xl border border-white/5 bg-[#181818] px-3.5 py-2 text-xs font-bold text-[#E0E0E0]/70 hover:text-white hover:border-white/10 transition-all cursor-pointer"
            >
              <RefreshCw className="h-3.5 w-3.5" />
              <span className="uppercase tracking-wider">Recargar</span>
            </button>
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-xs font-medium text-[#E0E0E0]/50">
              Cargando catálogo de productos...
            </div>
          ) : items.length === 0 ? (
            <div className="py-8 text-center text-xs font-medium text-[#E0E0E0]/50">
              No hay productos registrados en el menú.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/5 text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider">
                    <th className="py-3 px-2">Producto</th>
                    <th className="py-3 px-2">Categoría</th>
                    <th className="py-3 px-2">Precio</th>
                    <th className="py-3 px-2">Estado</th>
                    <th className="py-3 px-2 text-right">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {items.map((item) => (
                    <tr
                      key={item.id}
                      className="hover:bg-white/[0.02] transition-colors"
                    >
                      <td className="py-3.5 px-2">
                        <div className="flex items-center gap-3">
                          {item.imageUrl ? (
                            <div className="h-10 w-10 flex-shrink-0 overflow-hidden rounded-xl border border-white/10 bg-[#181818]">
                              <img
                                src={item.imageUrl}
                                alt={item.name}
                                className="h-full w-full object-cover"
                              />
                            </div>
                          ) : (
                            <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center rounded-xl border border-white/5 bg-[#181818] text-[#E0E0E0]/30">
                              <ImageIcon className="h-5 w-5" />
                            </div>
                          )}
                          <div>
                            <p className="font-bold text-[#E0E0E0]">{item.name}</p>
                            {item.description && (
                              <p className="text-xs text-[#E0E0E0]/50 line-clamp-1">
                                {item.description}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="py-3.5 px-2 text-xs font-bold text-[#E0E0E0]/60">
                        {item.category || "—"}
                      </td>
                      <td className="py-3.5 px-2 text-sm font-black text-[#E0E0E0]">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-2">
                        <span
                          className={`inline-flex items-center rounded-full px-3 py-1 text-[10px] font-black uppercase tracking-widest ${
                            item.isAvailable
                              ? "bg-success/10 text-success"
                              : "bg-white/5 text-[#E0E0E0]/40"
                          }`}
                        >
                          {item.isAvailable ? "Disponible" : "No disponible"}
                        </span>
                      </td>
                      <td className="py-3.5 px-2 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 py-1.5 text-xs font-bold text-[#E0E0E0] hover:bg-primary/20 hover:text-primary hover:border-primary/20 transition-all cursor-pointer"
                          >
                            <Pencil className="h-3.5 w-3.5" />
                            <span>Editar</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="flex items-center gap-1.5 rounded-xl border border-white/5 bg-white/5 px-3 py-1.5 text-xs font-bold text-gray-400 hover:bg-red-500/20 hover:text-red-400 hover:border-red-500/20 transition-all cursor-pointer"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                            <span>Eliminar</span>
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
