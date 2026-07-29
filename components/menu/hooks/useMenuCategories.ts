"use client";

import { useState, type FormEvent } from "react";
import {
  CategoryFormState,
  EMPTY_CATEGORY_FORM,
  MenuCategory,
  Translations,
} from "../types";

export function useMenuCategories() {
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Category modal state
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [categoryForm, setCategoryForm] =
    useState<CategoryFormState>(EMPTY_CATEGORY_FORM);
  const [categoryErrors, setCategoryErrors] = useState<Record<string, string>>(
    {},
  );
  const [deleteArmedCategoryId, setDeleteArmedCategoryId] = useState<
    string | null
  >(null);

  // ── Handlers ──────────────────────────────────────────────────

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/menu-categories");
      const data = await response.json();
      if (response.ok) {
        setMenuCategories(data.categories || []);
        setCategoriesLoaded(true);
      }
    } catch (error) {
      console.error("Error fetching categories:", error);
    }
  };

  const openCategoryModal = (category?: MenuCategory) => {
    if (!categoriesLoaded) fetchCategories();
    if (category) {
      setCategoryForm({
        id: category.id,
        name: category.name,
        nameEn: category.translations?.en?.name || "",
      });
    } else {
      setCategoryForm(EMPTY_CATEGORY_FORM);
    }
    setCategoryErrors({});
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (
    event: FormEvent<HTMLFormElement>,
    onSuccess: () => void,
  ) => {
    event.preventDefault();
    const errors: Record<string, string> = {};
    if (!categoryForm.name.trim()) errors.name = "El nombre es obligatorio";
    setCategoryErrors(errors);
    if (Object.keys(errors).length > 0) return;

    const translations: Translations = categoryForm.nameEn.trim()
      ? { en: { name: categoryForm.nameEn.trim() } }
      : {};

    try {
      setIsSubmitting(true);
      const isEditing = Boolean(categoryForm.id);
      const response = await fetch("/api/menu-categories", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(isEditing ? { id: categoryForm.id } : {}),
          name: categoryForm.name.trim(),
          translations,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Error al guardar");
      await fetchCategories();
      onSuccess(); // caller can re-fetch menu items if needed
      setIsCategoryModalOpen(false);
      setCategoryForm(EMPTY_CATEGORY_FORM);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteCategory = async (categoryId: string) => {
    if (deleteArmedCategoryId !== categoryId) {
      setDeleteArmedCategoryId(categoryId);
      setTimeout(() => setDeleteArmedCategoryId(null), 3000);
      return;
    }
    setDeleteArmedCategoryId(null);
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/menu-categories", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: categoryId }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "No se pudo eliminar");
      await fetchCategories();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al eliminar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveCategoryOrder = async (
    index: number,
    direction: "up" | "down",
  ) => {
    const sorted = [...menuCategories].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const updated = [...sorted];
    const tempOrder = updated[index].sort_order;
    updated[index] = {
      ...updated[index],
      sort_order: updated[targetIndex].sort_order,
    };
    updated[targetIndex] = { ...updated[targetIndex], sort_order: tempOrder };

    setMenuCategories(updated); // optimistic update

    try {
      const response = await fetch("/api/menu-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reorder: [
            { id: updated[index].id, sort_order: updated[index].sort_order },
            {
              id: updated[targetIndex].id,
              sort_order: updated[targetIndex].sort_order,
            },
          ],
        }),
      });
      if (!response.ok) await fetchCategories(); // revert on error
    } catch {
      await fetchCategories();
    }
  };

  return {
    menuCategories,
    categoriesLoaded,
    isSubmitting,
    errorMessage,
    setErrorMessage,
    // Category modal
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    categoryForm,
    setCategoryForm,
    categoryErrors,
    deleteArmedCategoryId,
    // Actions
    fetchCategories,
    openCategoryModal,
    handleCategorySubmit,
    handleDeleteCategory,
    handleMoveCategoryOrder,
  };
}
