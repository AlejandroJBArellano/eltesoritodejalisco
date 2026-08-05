"use client";

import { useState, type FormEvent, useEffect } from "react";
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

  useEffect(() => {
    fetchCategories();
  }, []);

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
        showInPickup: category.show_in_pickup ?? true,
      });
    } else {
      setCategoryForm(EMPTY_CATEGORY_FORM);
    }
    setCategoryErrors({});
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (
    event: FormEvent<HTMLFormElement>,
    onSuccess: (newCategoryName?: string) => void,
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
          show_in_pickup: categoryForm.showInPickup,
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Error al guardar");
      await fetchCategories();
      onSuccess(data.category?.name); // caller can re-fetch menu items if needed
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

    // Swap items in the sorted array
    const updated = [...sorted];
    const temp = updated[index];
    updated[index] = updated[targetIndex];
    updated[targetIndex] = temp;

    // Assign sequential sort_orders to resolve duplicates and guarantee order
    const localUpdated = updated.map((cat, i) => ({
      ...cat,
      sort_order: (i + 1) * 10,
    }));

    setMenuCategories(localUpdated); // optimistic update

    try {
      const response = await fetch("/api/menu-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reorder: localUpdated.map((c) => ({ id: c.id, sort_order: c.sort_order })),
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
