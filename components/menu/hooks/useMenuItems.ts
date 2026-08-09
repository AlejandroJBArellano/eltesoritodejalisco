"use client";

import React, { createContext, useContext, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  EMPTY_PRODUCT_FORM,
  MenuItem,
  MenuFormState,
  Translations,
} from "../types";

type MenuItemsContextType = ReturnType<typeof useMenuItemsInner>;

const MenuItemsContext = createContext<MenuItemsContextType | null>(null);

function useMenuItemsInner(items: MenuItem[]) {
  const router = useRouter();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Product modal state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);
  const [formState, setFormState] = useState<MenuFormState>(EMPTY_PRODUCT_FORM);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  // Image upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Delete confirmation
  const [deleteArmedItemId, setDeleteArmedItemId] = useState<string | null>(
    null,
  );

  // Derived values
  const isEditing = Boolean(formState.id);

  // ── Handlers ──────────────────────────────────────────────────

  const validateForm = (state: MenuFormState): Record<string, string> => {
    const errors: Record<string, string> = {};
    if (!state.name.trim()) errors.name = "El nombre es obligatorio";
    const price = Number(state.price);
    if (!Number.isFinite(price) || price < 0)
      errors.price = "El precio debe ser un número mayor o igual a 0";
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
      reader.onloadend = () => setImagePreview(reader.result as string);
      reader.readAsDataURL(file);
    }
  };

  const resetForm = () => {
    setFormState(EMPTY_PRODUCT_FORM);
    setFormErrors({});
    setSelectedFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const openNewProductModal = () => {
    resetForm();
    setShowTranslations(false);
    setIsProductModalOpen(true);
  };

  const openEditProductModal = (item: MenuItem) => {
    setFormState({
      id: item.id,
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      category: item.category || "",
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable,
      nameEn: item.translations?.en?.name || "",
      descriptionEn: item.translations?.en?.description || "",
      ingredientId: item.ingredientId || "",
      showInDineIn: item.show_in_dine_in ?? true,
      showInTakeaway: item.show_in_takeaway ?? true,
    });
    setImagePreview(item.imageUrl || null);
    setFormErrors({});
    setSelectedFile(null);
    setShowTranslations(
      !!(item.translations?.en?.name || item.translations?.en?.description),
    );
    setIsProductModalOpen(true);
  };

  const handleSubmit = async (event: React.SubmitEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(formState);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

    try {
      setIsSubmitting(true);
      const formData = new FormData();
      if (formState.id) formData.append("id", formState.id);
      formData.append("name", formState.name.trim());
      formData.append("description", formState.description);
      formData.append("price", formState.price);
      formData.append("category", formState.category);
      formData.append("isAvailable", String(formState.isAvailable));
      formData.append("imageUrl", formState.imageUrl || "");
      formData.append("ingredientId", formState.ingredientId || "");
      formData.append("showInDineIn", String(formState.showInDineIn));
      formData.append("showInTakeaway", String(formState.showInTakeaway));

      const enTranslation: Record<string, string> = {};
      if (formState.nameEn.trim()) enTranslation.name = formState.nameEn.trim();
      if (formState.descriptionEn.trim())
        enTranslation.description = formState.descriptionEn.trim();
      const translations: Translations =
        Object.keys(enTranslation).length > 0 ? { en: enTranslation } : {};
      formData.append("translations", JSON.stringify(translations));

      if (selectedFile) formData.append("image", selectedFile);

      const response = await fetch("/api/menu", {
        method: isEditing ? "PUT" : "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "No se pudo guardar el producto");

      router.refresh();
      resetForm();
      setIsProductModalOpen(false);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al guardar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (itemId: string) => {
    if (deleteArmedItemId !== itemId) {
      setDeleteArmedItemId(itemId);
      setTimeout(() => setDeleteArmedItemId(null), 3000);
      return;
    }
    setDeleteArmedItemId(null);
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/menu", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: itemId }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "No se pudo eliminar el producto");

      router.refresh();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al eliminar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    items,
    isSubmitting,
    errorMessage,
    setErrorMessage,
    isProductModalOpen,
    setIsProductModalOpen,
    showTranslations,
    setShowTranslations,
    formState,
    formErrors,
    isEditing,
    imagePreview,
    fileInputRef,
    deleteArmedItemId,
    openNewProductModal,
    openEditProductModal,
    handleSubmit,
    handleDelete,
    handleFormChange,
    handleFileChange,
  };
}

export function MenuItemsProvider({
  items,
  children,
}: {
  items: MenuItem[];
  children: React.ReactNode;
}) {
  const value = useMenuItemsInner(items);
  return React.createElement(MenuItemsContext.Provider, { value }, children);
}

export function useMenuItems(items?: MenuItem[]) {
  const context = useContext(MenuItemsContext);
  if (context) return context;

  // Fallback for tests/isolated calls
  if (!items) {
    throw new Error("useMenuItems must be used within a MenuItemsProvider or passed items directly");
  }
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return useMenuItemsInner(items);
}
