"use client";

import { useState, type FormEvent } from "react";
import { EMPTY_RECIPE_FORM, MenuItem, RecipeFormState, RecipeItem } from "../types";

export function useRecipes(items: MenuItem[]) {
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [selectedRecipeMenuItemId, setSelectedRecipeMenuItemId] = useState("");
  const [recipeForm, setRecipeForm] = useState<RecipeFormState>(EMPTY_RECIPE_FORM);
  const [recipeErrors, setRecipeErrors] = useState<Record<string, string>>({});
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteArmedRecipeId, setDeleteArmedRecipeId] = useState<string | null>(null);

  // ── Handlers ──────────────────────────────────────────────────

  const fetchRecipes = async (menuItemId: string) => {
    if (!menuItemId) {
      setRecipeItems([]);
      return;
    }
    const response = await fetch(`/api/recipes?menuItemId=${menuItemId}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar recetas");
    setRecipeItems(data.recipeItems || []);
  };

  const openRecipeModal = (menuItemId?: string) => {
    const targetId = menuItemId || (items[0]?.id ?? "");
    setSelectedRecipeMenuItemId(targetId);
    setRecipeForm(EMPTY_RECIPE_FORM);
    setRecipeErrors({});
    if (targetId) fetchRecipes(targetId);
    setIsRecipeModalOpen(true);
  };

  const handleRecipeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecipeMenuItemId) {
      setRecipeErrors({ menuItemId: "Selecciona un producto" });
      return;
    }
    if (!recipeForm.ingredientId) {
      setRecipeErrors({ ingredientId: "Selecciona un ingrediente" });
      return;
    }
    const qty = Number(recipeForm.quantityRequired);
    if (!Number.isFinite(qty) || qty <= 0) {
      setRecipeErrors({ quantityRequired: "La cantidad debe ser mayor a 0" });
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/recipes", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          menuItemId: selectedRecipeMenuItemId,
          ingredientId: recipeForm.ingredientId,
          quantityRequired: qty,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Error al guardar receta");
      await fetchRecipes(selectedRecipeMenuItemId);
      setRecipeForm(EMPTY_RECIPE_FORM);
      setRecipeErrors({});
    } catch (error) {
      console.error("Recipe submit error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteRecipe = async (recipeId: string) => {
    if (deleteArmedRecipeId !== recipeId) {
      setDeleteArmedRecipeId(recipeId);
      setTimeout(() => setDeleteArmedRecipeId(null), 3000);
      return;
    }
    setDeleteArmedRecipeId(null);
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/recipes", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: recipeId }),
      });
      if (!response.ok) throw new Error("Error al eliminar");
      await fetchRecipes(selectedRecipeMenuItemId);
    } catch (e) {
      console.error(e);
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    recipeItems,
    selectedRecipeMenuItemId,
    setSelectedRecipeMenuItemId,
    recipeForm,
    setRecipeForm,
    recipeErrors,
    isRecipeModalOpen,
    setIsRecipeModalOpen,
    isSubmitting,
    deleteArmedRecipeId,
    // Actions
    fetchRecipes,
    openRecipeModal,
    handleRecipeSubmit,
    deleteRecipe,
  };
}
