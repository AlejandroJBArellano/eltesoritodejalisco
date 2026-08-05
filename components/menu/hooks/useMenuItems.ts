"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";
import {
  DatabaseMenuItem,
  EMPTY_PRODUCT_FORM,
  MenuItem,
  MenuFormState,
  SortField,
  Translations,
} from "../types";

export function useMenuItems(initialItems: MenuItem[]) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [isLoading, setIsLoading] = useState(false);
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

  // Table filters, sort & pagination
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "available" | "unavailable"
  >("all");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // Derived values
  const isEditing = Boolean(formState.id);

  const categories = useMemo(() => {
    const set = new Set<string>();
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [items]);

  const activeCount = useMemo(
    () => items.filter((item) => item.isAvailable).length,
    [items],
  );

  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }
      if (categoryFilter !== "all" && item.category !== categoryFilter)
        return false;
      if (availabilityFilter === "available" && !item.isAvailable) return false;
      if (availabilityFilter === "unavailable" && item.isAvailable)
        return false;
      return true;
    });
  }, [items, searchQuery, categoryFilter, availabilityFilter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let comp = 0;
      if (sortField === "name") comp = a.name.localeCompare(b.name);
      else if (sortField === "price") comp = a.price - b.price;
      else if (sortField === "category")
        comp = (a.category || "").localeCompare(b.category || "");
      else if (sortField === "isAvailable")
        comp = (a.isAvailable ? 1 : 0) - (b.isAvailable ? 1 : 0);
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [filteredItems, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedItems.length / pageSize) || 1;

  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  // ── Handlers ──────────────────────────────────────────────────

  const fetchMenu = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/menu");
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Error al cargar el menú");
      setItems(
        (data.items || []).map((item: DatabaseMenuItem) => ({
          ...item,
          isAvailable: item.is_available,
          imageUrl: item.image_url,
          translations: item.translations,
          ingredientId: item.ingredient_id,
          show_in_dine_in: item.show_in_dine_in,
          show_in_takeaway: item.show_in_takeaway,
        })),
      );
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al cargar",
      );
    } finally {
      setIsLoading(false);
    }
  };

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

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      await fetchMenu();
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

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  return {
    // Data
    items,
    categories,
    activeCount,
    filteredItems,
    sortedItems,
    paginatedItems,
    totalPages,
    // Loading / error
    isLoading,
    isSubmitting,
    errorMessage,
    setErrorMessage,
    // Product modal
    isProductModalOpen,
    setIsProductModalOpen,
    showTranslations,
    setShowTranslations,
    formState,
    formErrors,
    isEditing,
    // Image
    imagePreview,
    fileInputRef,
    // Table
    searchQuery,
    setSearchQuery,
    categoryFilter,
    setCategoryFilter,
    availabilityFilter,
    setAvailabilityFilter,
    sortField,
    sortDirection,
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    deleteArmedItemId,
    // Actions
    fetchMenu,
    openNewProductModal,
    openEditProductModal,
    handleSubmit,
    handleDelete,
    handleFormChange,
    handleFileChange,
    handleSort,
  };
}
