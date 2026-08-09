"use client";

import { PageHeader } from "@/components/PageHeader";
import { BookOpen, Plus, RefreshCw, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { SubmitEvent, useMemo, useState, useTransition } from "react";

import { MenuCategoriesProvider, useMenuCategories } from "./hooks/useMenuCategories";
import { MenuItemsProvider, useMenuItems } from "./hooks/useMenuItems";
import { RecipesProvider, useRecipes } from "./hooks/useRecipes";

import { CategoriesPanel } from "./components/CategoriesPanel";
import { CategoryModal } from "./components/CategoryModal";
import { IngredientModal } from "./components/IngredientModal";
import { MenuFilters } from "./components/MenuFilters";
import { MenuStatsCards } from "./components/MenuStatsCards";
import { MenuTable } from "./components/MenuTable";
import { ProductModal } from "./components/ProductModal";
import { RecipeModal } from "./components/RecipeModal";

import { EMPTY_INGREDIENT_FORM, Ingredient, IngredientFormState, MenuCategory, MenuItem, SortField } from "./types";

interface MenuContentProps {
  items: MenuItem[];
  paginatedItems: MenuItem[];
  categories: string[];
  activeCount: number;
  totalPages: number;
  totalItems: number;
  initialMenuCategories: MenuCategory[];
  initialIngredients: Ingredient[];
  searchParams: {
    q: string;
    category: string;
    availability: string;
    sort: SortField;
    direction: "asc" | "desc";
    page: number;
    pageSize: number;
  };
}

export function MenuContent(props: MenuContentProps) {
  return (
    <MenuItemsProvider items={props.items}>
      <RecipesProvider items={props.items}>
        <MenuCategoriesProvider initialCategories={props.initialMenuCategories}>
          <MenuContentInner {...props} />
        </MenuCategoriesProvider>
      </RecipesProvider>
    </MenuItemsProvider>
  );
}

function MenuContentInner({
  items,
  paginatedItems,
  totalPages,
  totalItems,
  initialIngredients,
}: MenuContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const {
    errorMessage,
    setErrorMessage,
    isProductModalOpen,
    openNewProductModal,
    handleFormChange,
  } = useMenuItems();

  const {
    menuCategories,
    categoriesLoaded,
    errorMessage: categoryErrorMessage,
    openCategoryModal,
  } = useMenuCategories();

  const {
    openRecipeModal,
    isRecipeModalOpen,
    setRecipeForm,
  } = useRecipes();

  // Ingredient modal state
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [ingredientForm, setIngredientForm] = useState<IngredientFormState>(EMPTY_INGREDIENT_FORM);
  const [ingredientErrors, setIngredientErrors] = useState<Record<string, string>>({});
  const [isIngredientSubmitting, setIsIngredientSubmitting] = useState(false);

  const handleIngredientFormChange = (field: keyof IngredientFormState, value: string) => {
    setIngredientForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIngredientSubmit = async (e: SubmitEvent<HTMLFormElement>) => {
    e.preventDefault();
    const errors: Record<string, string> = {};
    if (!ingredientForm.name.trim()) {
      errors.name = "El nombre es obligatorio";
    }
    setIngredientErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setIsIngredientSubmitting(true);
      const response = await fetch("/api/inventory", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: ingredientForm.name.trim(),
          unit: ingredientForm.unit,
          currentStock: Number(ingredientForm.currentStock || 0),
          minimumStock: Number(ingredientForm.minimumStock || 0),
          costPerUnit: ingredientForm.costPerUnit ? Number(ingredientForm.costPerUnit) : null,
          trackingType: ingredientForm.trackingType,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Error al crear el ingrediente");
      }

      router.refresh();

      const newIngredient = data.ingredient;
      if (newIngredient) {
        if (isProductModalOpen) {
          handleFormChange("ingredientId", newIngredient.id);
        }
        if (isRecipeModalOpen) {
          setRecipeForm((prev) => ({
            ...prev,
            ingredientId: newIngredient.id,
          }));
        }
      }

      setIsIngredientModalOpen(false);
      setIngredientForm(EMPTY_INGREDIENT_FORM);
    } catch (err) {
      console.error("Error saving ingredient:", err);
      setErrorMessage(err instanceof Error ? err.message : "Error al guardar el ingrediente");
    } finally {
      setIsIngredientSubmitting(false);
    }
  };

  const dbCategories = useMemo(() => {
    const set = new Set<string>();
    menuCategories.forEach((c) => set.add(c.name));
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [menuCategories, items]);

  const activeErrors = errorMessage || categoryErrorMessage;

  return (
    <div className="min-h-screen bg-background">
      <PageHeader
        title="Gestión de Menú"
        subtitle="Administra productos, catálogo y recetas del restaurante"
        badgeColor="bg-primary"
        actions={
          <>
            <button
              onClick={() => {
                setIngredientForm(EMPTY_INGREDIENT_FORM);
                setIngredientErrors({});
                setIsIngredientModalOpen(true);
              }}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-text-light hover:bg-card-light transition-all duration-200 ease-out uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              <Plus className="h-4 w-4 text-purple-400" />
              Nuevo Ingrediente
            </button>
            <button
              onClick={() => openRecipeModal()}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-text-light hover:bg-card-light transition-all duration-200 ease-out uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              <BookOpen className="h-4 w-4 text-purple-400" />
              Recetas e Ingredientes
            </button>
            <button
              onClick={() => openCategoryModal()}
              className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-text-light hover:bg-card-light transition-all duration-200 ease-out uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              <Tag className="h-4 w-4 text-amber-400" />
              Categorías
            </button>
            <button
              onClick={openNewProductModal}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-black hover:brightness-105 active:scale-95 transition-all duration-200 ease-out uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-lg shadow-primary/20 focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </button>
          </>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {activeErrors && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-400">
            {activeErrors}
          </div>
        )}

        <MenuStatsCards />

        {categoriesLoaded && (
          <CategoriesPanel />
        )}

        <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <h2 className="text-base font-black text-text-light tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Catálogo de Menú ({totalItems})
            </h2>
            <button
              onClick={() => {
                startTransition(() => {
                  router.refresh();
                });
              }}
              className="text-xs text-text-light/60 hover:text-text-light flex items-center gap-1.5 font-bold cursor-pointer transition-colors duration-200 ease-out"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isPending ? "animate-spin" : ""}`}
              />
              Actualizar Lista
            </button>
          </div>

          <MenuFilters />

          <MenuTable
            paginatedItems={paginatedItems}
            totalPages={totalPages}
            totalItems={totalItems}
          />
        </section>
      </main>

      <ProductModal
        categories={dbCategories}
        ingredients={initialIngredients}
        onAddIngredient={() => setIsIngredientModalOpen(true)}
      />

      <CategoryModal />

      <RecipeModal
        ingredients={initialIngredients}
        onAddIngredient={() => setIsIngredientModalOpen(true)}
      />

      <IngredientModal
        isOpen={isIngredientModalOpen}
        onClose={() => setIsIngredientModalOpen(false)}
        onSubmit={handleIngredientSubmit}
        ingredientForm={ingredientForm}
        ingredientErrors={ingredientErrors}
        isSubmitting={isIngredientSubmitting}
        onFormChange={handleIngredientFormChange}
      />
    </div>
  );
}
