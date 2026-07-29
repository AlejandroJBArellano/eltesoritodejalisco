"use client";

import { useMemo, useRef, useState, type FormEvent } from "react";

import {
  Image as ImageIcon,
  Pencil,
  Plus,
  RefreshCw,
  Trash2,
  BookOpen,
  Utensils,
  CheckCircle2,
  XCircle,
  Filter,
  Globe,
  ChevronDown,
  ArrowUp,
  ArrowDown,
  Tag,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import {
  TableSearchInput,
  TableHeaderSortCell,
  TablePagination,
} from "@/components/ui/DataTableControls";

type Translations = Record<string, { name?: string; description?: string; category?: string }>;

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  isAvailable: boolean;
  translations?: Translations;
};

type MenuCategory = {
  id: string;
  name: string;
  translations?: Translations;
  sort_order: number;
  is_active: boolean;
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
  nameEn: string;
  descriptionEn: string;
};

type RecipeFormState = {
  ingredientName: string;
  quantityRequired: string;
};

type CategoryFormState = {
  id?: string;
  name: string;
  nameEn: string;
};

const emptyForm: MenuFormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  imageUrl: "",
  isAvailable: true,
  nameEn: "",
  descriptionEn: "",
};

const emptyCategoryForm: CategoryFormState = {
  name: "",
  nameEn: "",
};

const emptyRecipeForm: RecipeFormState = {
  ingredientName: "",
  quantityRequired: "",
};

interface DatabaseMenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  is_available: boolean;
  image_url?: string | null;
  translations?: Translations;
}

interface MenuContentProps {
  initialItems: MenuItem[];
}

export function MenuContent({ initialItems }: MenuContentProps) {
  const [items, setItems] = useState<MenuItem[]>(initialItems);
  const [recipeItems, setRecipeItems] = useState<RecipeItem[]>([]);
  const [selectedRecipeMenuItemId, setSelectedRecipeMenuItemId] = useState("");
  const [recipeForm, setRecipeForm] =
    useState<RecipeFormState>(emptyRecipeForm);
  const [recipeErrors, setRecipeErrors] = useState<Record<string, string>>({});

  const [deleteArmedItemId, setDeleteArmedItemId] = useState<string | null>(
    null,
  );
  const [deleteArmedRecipeId, setDeleteArmedRecipeId] = useState<string | null>(
    null,
  );

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [showTranslations, setShowTranslations] = useState(false);

  // Form state
  const [formState, setFormState] = useState<MenuFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Category management state
  const [menuCategories, setMenuCategories] = useState<MenuCategory[]>([]);
  const [categoryForm, setCategoryForm] = useState<CategoryFormState>(emptyCategoryForm);
  const [categoryErrors, setCategoryErrors] = useState<Record<string, string>>({});
  const [deleteArmedCategoryId, setDeleteArmedCategoryId] = useState<string | null>(null);
  const [categoriesLoaded, setCategoriesLoaded] = useState(false);

  // Table Filters, Sort & Pagination State
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "available" | "unavailable"
  >("all");

  type SortField = "name" | "price" | "category" | "isAvailable";
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

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

  const fetchMenu = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/menu");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Error al cargar el menú");
      }
      setItems(
        (data.items || []).map((item: DatabaseMenuItem) => ({
          ...item,
          isAvailable: item.is_available,
          imageUrl: item.image_url,
          translations: item.translations,
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

  const fetchRecipes = async (menuItemId: string) => {
    if (!menuItemId) {
      setRecipeItems([]);
      return;
    }
    const response = await fetch(`/api/recipes?menuItemId=${menuItemId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Error al cargar recetas");
    }
    const recipes = data.recipeItems || [];
    setRecipeItems(recipes);
  };

  const validateForm = (state: MenuFormState) => {
    const errors: Record<string, string> = {};
    if (!state.name.trim()) errors.name = "El nombre es obligatorio";
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

  const resetForm = () => {
    setFormState(emptyForm);
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
    });
    setImagePreview(item.imageUrl || null);
    setFormErrors({});
    setSelectedFile(null);
    setShowTranslations(!!(item.translations?.en?.name || item.translations?.en?.description));
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

      // Build translations JSONB — only include en if at least one field has value
      const enTranslation: Record<string, string> = {};
      if (formState.nameEn.trim()) enTranslation.name = formState.nameEn.trim();
      if (formState.descriptionEn.trim()) enTranslation.description = formState.descriptionEn.trim();
      const translations: Translations = Object.keys(enTranslation).length > 0 ? { en: enTranslation } : {};
      formData.append("translations", JSON.stringify(translations));

      if (selectedFile) {
        formData.append("image", selectedFile);
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
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo eliminar el producto");
      }
      await fetchMenu();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado al eliminar",
      );
    } finally {
      setIsSubmitting(false);
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
      setCategoryForm(emptyCategoryForm);
    }
    setCategoryErrors({});
    setIsCategoryModalOpen(true);
  };

  const handleCategorySubmit = async (event: FormEvent<HTMLFormElement>) => {
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
      await fetchMenu();
      setIsCategoryModalOpen(false);
      setCategoryForm(emptyCategoryForm);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
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
      setErrorMessage(error instanceof Error ? error.message : "Error al eliminar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleMoveCategoryOrder = async (index: number, direction: "up" | "down") => {
    const sorted = [...menuCategories].sort((a, b) => a.sort_order - b.sort_order);
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= sorted.length) return;

    const updated = [...sorted];
    const tempOrder = updated[index].sort_order;
    updated[index] = { ...updated[index], sort_order: updated[targetIndex].sort_order };
    updated[targetIndex] = { ...updated[targetIndex], sort_order: tempOrder };

    // Optimistic UI update
    setMenuCategories(updated);

    try {
      const response = await fetch("/api/menu-categories", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reorder: [
            { id: updated[index].id, sort_order: updated[index].sort_order },
            { id: updated[targetIndex].id, sort_order: updated[targetIndex].sort_order },
          ],
        }),
      });
      if (!response.ok) {
        // Revert on error
        await fetchCategories();
      }
    } catch {
      await fetchCategories();
    }
  };

  const openRecipeModal = (menuItemId?: string) => {
    const targetId = menuItemId || (items[0]?.id ?? "");
    setSelectedRecipeMenuItemId(targetId);
    setRecipeForm(emptyRecipeForm);
    setRecipeErrors({});
    if (targetId) {
      fetchRecipes(targetId);
    }
    setIsRecipeModalOpen(true);
  };

  const handleRecipeSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!selectedRecipeMenuItemId) {
      setRecipeErrors({ menuItemId: "Selecciona un producto" });
      return;
    }
    if (!recipeForm.ingredientName.trim()) {
      setRecipeErrors({ ingredientName: "Ingresa el nombre del ingrediente" });
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
          ingredientName: recipeForm.ingredientName.trim(),
          quantityRequired: qty,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Error al guardar receta");
      await fetchRecipes(selectedRecipeMenuItemId);
      setRecipeForm(emptyRecipeForm);
      setRecipeErrors({});
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al guardar",
      );
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

  // Filtered & Sorted Items
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = item.name.toLowerCase().includes(q);
        const matchDesc = (item.description || "").toLowerCase().includes(q);
        const matchCat = (item.category || "").toLowerCase().includes(q);
        if (!matchName && !matchDesc && !matchCat) return false;
      }

      if (categoryFilter !== "all" && item.category !== categoryFilter) {
        return false;
      }

      if (availabilityFilter === "available" && !item.isAvailable) return false;
      if (availabilityFilter === "unavailable" && item.isAvailable)
        return false;

      return true;
    });
  }, [items, searchQuery, categoryFilter, availabilityFilter]);

  const sortedItems = useMemo(() => {
    return [...filteredItems].sort((a, b) => {
      let comp = 0;
      if (sortField === "name") {
        comp = a.name.localeCompare(b.name);
      } else if (sortField === "price") {
        comp = a.price - b.price;
      } else if (sortField === "category") {
        comp = (a.category || "").localeCompare(b.category || "");
      } else if (sortField === "isAvailable") {
        comp = (a.isAvailable ? 1 : 0) - (b.isAvailable ? 1 : 0);
      }
      return sortDirection === "asc" ? comp : -comp;
    });
  }, [filteredItems, sortField, sortDirection]);

  const totalPages = Math.ceil(sortedItems.length / pageSize) || 1;
  const paginatedItems = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return sortedItems.slice(start, start + pageSize);
  }, [sortedItems, currentPage, pageSize]);

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
    setCurrentPage(1);
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      <PageHeader
        title="Gestión de Menú"
        subtitle="Administra productos, catálogo y recetas del restaurante"
        badgeColor="bg-primary"
        actions={
          <>
            <button
              onClick={() => openRecipeModal()}
              className="rounded-xl border border-white/10 bg-[#242424] px-4 py-2 text-xs font-bold text-[#E0E0E0] hover:bg-white/10 transition-all uppercase tracking-wider flex items-center gap-2"
            >
              <BookOpen className="h-4 w-4 text-purple-400" />
              Recetas e Ingredientes
            </button>
            <button
              onClick={() => openCategoryModal()}
              className="rounded-xl border border-white/10 bg-[#242424] px-4 py-2 text-xs font-bold text-[#E0E0E0] hover:bg-white/10 transition-all uppercase tracking-wider flex items-center gap-2"
            >
              <Tag className="h-4 w-4 text-amber-400" />
              Categorías
            </button>
            <button
              onClick={openNewProductModal}
              className="rounded-xl bg-primary px-4 py-2 text-xs font-black text-black hover:brightness-105 transition-all uppercase tracking-wider flex items-center gap-2 shadow-lg shadow-primary/20"
            >
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </button>
          </>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-400">
            {errorMessage}
          </div>
        )}

        {/* Tarjetas Informativas */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Total Platillos
              </p>
              <p className="mt-1 text-2xl font-black text-[#E0E0E0]">
                {items.length}
              </p>
            </div>
            <div className="rounded-xl bg-primary/10 p-3 text-primary">
              <Utensils className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Platillos Activos
              </p>
              <p className="mt-1 text-2xl font-black text-emerald-400">
                {activeCount}
              </p>
            </div>
            <div className="rounded-xl bg-emerald-500/10 p-3 text-emerald-400">
              <CheckCircle2 className="h-5 w-5" />
            </div>
          </div>

          <div className="rounded-2xl bg-[#242424] p-5 border border-white/5 flex items-center justify-between">
            <div>
              <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Categorías Registradas
              </p>
              <p className="mt-1 text-2xl font-black text-purple-400">
                {categories.length}
              </p>
            </div>
            <div className="rounded-xl bg-purple-500/10 p-3 text-purple-400">
              <Filter className="h-5 w-5" />
            </div>
          </div>
        </div>

        {/* PANEL DE CATEGORÍAS — se carga al hacer click en "Categorías" del header */}
        {categoriesLoaded && (
          <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-4">
              <h2 className="text-base font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Categorías ({menuCategories.length})
              </h2>
              <button
                onClick={() => openCategoryModal()}
                className="text-xs font-black text-amber-400 hover:text-amber-300 flex items-center gap-1.5"
              >
                <Plus className="h-3.5 w-3.5" />
                Nueva Categoría
              </button>
            </div>

            <div className="space-y-2">
              {menuCategories
                .slice()
                .sort((a, b) => a.sort_order - b.sort_order)
                .map((cat, index, arr) => (
                  <div
                    key={cat.id}
                    className="flex items-center justify-between bg-[#1A1A1A] border border-white/5 rounded-xl px-4 py-3"
                  >
                    <div className="flex items-center gap-3">
                      <span className="text-[10px] font-black text-[#E0E0E0]/30 tabular-nums w-5 text-right">
                        {index + 1}
                      </span>
                      <div>
                        <p className="text-sm font-black text-[#E0E0E0]">{cat.name}</p>
                        {cat.translations?.en?.name && (
                          <p className="text-[10px] text-[#E0E0E0]/40 font-bold flex items-center gap-1">
                            <Globe className="h-2.5 w-2.5" />
                            EN: {cat.translations.en.name}
                          </p>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Order buttons */}
                      <button
                        onClick={() => handleMoveCategoryOrder(index, "up")}
                        disabled={index === 0 || isSubmitting}
                        className="rounded-lg p-1.5 text-[#E0E0E0]/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Mover arriba"
                      >
                        <ArrowUp className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleMoveCategoryOrder(index, "down")}
                        disabled={index === arr.length - 1 || isSubmitting}
                        className="rounded-lg p-1.5 text-[#E0E0E0]/40 hover:text-white hover:bg-white/10 disabled:opacity-20 disabled:cursor-not-allowed transition-colors"
                        title="Mover abajo"
                      >
                        <ArrowDown className="h-3.5 w-3.5" />
                      </button>
                      {/* Edit */}
                      <button
                        onClick={() => openCategoryModal(cat)}
                        className="rounded-lg p-1.5 text-[#E0E0E0]/60 hover:text-white hover:bg-white/10 transition-colors"
                        title="Editar"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </button>
                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteCategory(cat.id)}
                        className={`rounded-lg border px-2 py-1 text-xs font-black transition-all ${
                          deleteArmedCategoryId === cat.id
                            ? "bg-red-500/30 border-red-500/50 text-red-300"
                            : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                        }`}
                        title={deleteArmedCategoryId === cat.id ? "Confirmar eliminación" : "Eliminar"}
                      >
                        {deleteArmedCategoryId === cat.id ? "¿Seguro?" : <Trash2 className="h-3.5 w-3.5" />}
                      </button>
                    </div>
                  </div>
                ))}
              {menuCategories.length === 0 && (
                <p className="text-xs text-[#E0E0E0]/30 italic text-center py-4">
                  No hay categorías registradas. Crea una para empezar.
                </p>
              )}
            </div>
          </section>
        )}

        {/* TABLA DE PRODUCTOS */}
        <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
            <h2 className="text-base font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Catálogo de Menú ({filteredItems.length})
            </h2>
            <button
              onClick={fetchMenu}
              className="text-xs text-[#E0E0E0]/60 hover:text-white flex items-center gap-1.5 font-bold"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Actualizar Lista
            </button>
          </div>

          {/* Barra de Filtros */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#1A1A1A] p-4 rounded-xl border border-white/5">
            <div>
              <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
                Buscar Producto
              </label>
              <TableSearchInput
                value={searchQuery}
                onChange={(v) => {
                  setSearchQuery(v);
                  setCurrentPage(1);
                }}
                placeholder="Buscar por nombre o descripción..."
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
                Categoría
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-[#E0E0E0] outline-none focus:border-primary"
              >
                <option value="all">Todas las Categorías</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
                Estado
              </label>
              <select
                value={availabilityFilter}
                onChange={(e) => {
                  setAvailabilityFilter(
                    e.target.value as "all" | "available" | "unavailable",
                  );
                  setCurrentPage(1);
                }}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-3 py-2 text-xs font-bold text-[#E0E0E0] outline-none focus:border-primary"
              >
                <option value="all">Todos los Estados</option>
                <option value="available">Disponibles</option>
                <option value="unavailable">No Disponibles</option>
              </select>
            </div>
          </div>

          {/* Tabla */}
          <div className="overflow-x-auto rounded-xl border border-white/5">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#181818] text-xs uppercase tracking-wider text-[#E0E0E0]/60 border-b border-white/5">
                <tr>
                  <th className="py-3 px-4 font-bold">Imagen</th>
                  <TableHeaderSortCell
                    field="name"
                    label="Nombre"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHeaderSortCell
                    field="category"
                    label="Categoría"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHeaderSortCell
                    field="price"
                    label="Precio"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <TableHeaderSortCell
                    field="isAvailable"
                    label="Estado"
                    currentSortField={sortField}
                    sortDirection={sortDirection}
                    onSort={handleSort}
                  />
                  <th className="py-3 px-4 font-bold text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {paginatedItems.map((item) => (
                  <tr
                    key={item.id}
                    className="hover:bg-white/[0.02] transition-colors"
                  >
                    <td className="py-3 px-4">
                      {item.imageUrl ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="h-10 w-10 rounded-xl object-cover border border-white/10"
                        />
                      ) : (
                        <div className="h-10 w-10 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-center text-[#E0E0E0]/30">
                          <ImageIcon className="h-5 w-5" />
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <p className="font-bold text-[#E0E0E0]">{item.name}</p>
                      {item.description && (
                        <p className="text-xs text-[#E0E0E0]/50 line-clamp-1">
                          {item.description}
                        </p>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="rounded-lg bg-white/5 border border-white/10 px-2.5 py-1 text-xs font-bold text-[#E0E0E0]/80">
                        {item.category || "Sin categoría"}
                      </span>
                    </td>
                    <td className="py-3 px-4 font-black text-primary">
                      ${Number(item.price).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-bold ${
                          item.isAvailable
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : "bg-red-500/10 text-red-400 border border-red-500/20"
                        }`}
                      >
                        {item.isAvailable ? (
                          <>
                            <CheckCircle2 className="h-3 w-3" />
                            Disponible
                          </>
                        ) : (
                          <>
                            <XCircle className="h-3 w-3" />
                            Agotado
                          </>
                        )}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => openRecipeModal(item.id)}
                          className="rounded-lg bg-purple-500/10 border border-purple-500/20 p-2 text-purple-400 hover:bg-purple-500/20 transition-colors"
                          title="Gestionar Receta"
                        >
                          <BookOpen className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => openEditProductModal(item)}
                          className="rounded-lg bg-white/5 border border-white/10 p-2 text-[#E0E0E0]/80 hover:text-white hover:bg-white/10 transition-colors"
                          title="Editar Producto"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id)}
                          className={`rounded-lg border p-2 transition-all text-xs font-black ${
                            deleteArmedItemId === item.id
                              ? "bg-red-500/30 border-red-500/50 text-red-300 px-2"
                              : "bg-red-500/10 border-red-500/20 text-red-400 hover:bg-red-500/20"
                          }`}
                          title={
                            deleteArmedItemId === item.id
                              ? "Confirmar eliminación"
                              : "Eliminar Producto"
                          }
                        >
                          {deleteArmedItemId === item.id ? (
                            "¿Seguro?"
                          ) : (
                            <Trash2 className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedItems.length === 0 && (
                  <tr>
                    <td
                      colSpan={6}
                      className="py-8 text-center text-xs text-[#E0E0E0]/40 italic"
                    >
                      No se encontraron productos en el menú.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedItems.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={(size) => {
              setPageSize(size);
              setCurrentPage(1);
            }}
          />
        </section>
      </main>

      {/* MODAL DE PRODUCTO (NUEVO / EDITAR) */}
      <Modal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        title={isEditing ? "Editar Producto" : "Nuevo Producto"}
        subtitle="Llena los datos del platillo o bebida para el catálogo"
        icon={<Utensils className="h-5 w-5 text-primary" />}
        maxWidth="lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Nombre del Platillo *
            </label>
            <input
              type="text"
              value={formState.name}
              onChange={(e) => handleFormChange("name", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] placeholder-[#666666] outline-none focus:border-primary"
              placeholder="Ej. Torta Ahogada Sencilla"
            />
            {formErrors.name && (
              <p className="mt-1 text-xs font-bold text-red-400">
                {formErrors.name}
              </p>
            )}
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
                Precio ($) *
              </label>
              <input
                type="number"
                step="0.01"
                value={formState.price}
                onChange={(e) => handleFormChange("price", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-primary"
                placeholder="0.00"
              />
              {formErrors.price && (
                <p className="mt-1 text-xs font-bold text-red-400">
                  {formErrors.price}
                </p>
              )}
            </div>

            <div>
              <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
                Categoría
              </label>
              <input
                type="text"
                list="category-suggestions"
                value={formState.category}
                onChange={(e) => handleFormChange("category", e.target.value)}
                className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-primary"
                placeholder="Ej. Platos Fuertes"
              />
              <datalist id="category-suggestions">
                {categories.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
          </div>

          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Descripción
            </label>
            <textarea
              rows={2}
              value={formState.description}
              onChange={(e) => handleFormChange("description", e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-primary"
              placeholder="Ingredientes principales, preparación, etc."
            />
          </div>

          {/* SECCIÓN DE TRADUCCIONES — colapsable */}
          <div className="rounded-xl border border-blue-500/20 bg-blue-500/5 overflow-hidden">
            <button
              type="button"
              onClick={() => setShowTranslations((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-left"
            >
              <span className="text-xs font-extrabold text-blue-400 uppercase tracking-wider flex items-center gap-2">
                <Globe className="h-3.5 w-3.5" />
                Traducción al Inglés (EN)
                {(formState.nameEn || formState.descriptionEn) && (
                  <span className="rounded-full bg-blue-500 h-1.5 w-1.5" />
                )}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-blue-400 transition-transform ${showTranslations ? "rotate-180" : ""}`}
              />
            </button>
            {showTranslations && (
              <div className="px-4 pb-4 space-y-3 border-t border-blue-500/10">
                <div className="pt-3">
                  <label className="text-[10px] font-extrabold text-[#E0E0E0]/40 uppercase tracking-wider block mb-1">
                    Nombre en Inglés
                  </label>
                  <input
                    type="text"
                    value={formState.nameEn}
                    onChange={(e) => handleFormChange("nameEn", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] placeholder-[#444] outline-none focus:border-blue-500"
                    placeholder="e.g. Drowned Sandwich"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-extrabold text-[#E0E0E0]/40 uppercase tracking-wider block mb-1">
                    Descripción en Inglés
                  </label>
                  <textarea
                    rows={2}
                    value={formState.descriptionEn}
                    onChange={(e) => handleFormChange("descriptionEn", e.target.value)}
                    className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] placeholder-[#444] outline-none focus:border-blue-500"
                    placeholder="e.g. Slow-cooked pork, chipotle sauce..."
                  />
                </div>
              </div>
            )}
          </div>

          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Imagen del Producto
            </label>
            <div className="flex items-center gap-4">
              {imagePreview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="h-16 w-16 rounded-xl object-cover border border-white/10"
                />
              ) : (
                <div className="h-16 w-16 rounded-xl bg-[#181818] border border-white/10 flex items-center justify-center text-[#E0E0E0]/30">
                  <ImageIcon className="h-6 w-6" />
                </div>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                className="text-xs text-[#E0E0E0]/60 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-white/10 file:text-white hover:file:bg-white/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 pt-2">
            <input
              type="checkbox"
              id="isAvailable"
              checked={formState.isAvailable}
              onChange={(e) =>
                handleFormChange("isAvailable", e.target.checked)
              }
              className="h-4 w-4 rounded border-white/10 bg-[#181818] text-primary focus:ring-primary"
            />
            <label
              htmlFor="isAvailable"
              className="text-xs font-bold text-[#E0E0E0]"
            >
              Disponible para venta activa
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsProductModalOpen(false)}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-[#E0E0E0]/70 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-primary px-5 py-2.5 text-xs font-black text-black hover:brightness-105 disabled:opacity-50"
            >
              {isSubmitting
                ? "Guardando..."
                : isEditing
                  ? "Actualizar Producto"
                  : "Guardar Producto"}
            </button>
          </div>
        </form>
      </Modal>

      {/* MODAL DE CATEGORÍA (NUEVA / EDITAR) */}
      <Modal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        title={categoryForm.id ? "Editar Categoría" : "Nueva Categoría"}
        subtitle="Define el nombre y su traducción al inglés"
        icon={<Tag className="h-5 w-5 text-amber-400" />}
        maxWidth="sm"
      >
        <form onSubmit={handleCategorySubmit} className="space-y-4">
          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Nombre de la Categoría (ES) *
            </label>
            <input
              type="text"
              value={categoryForm.name}
              onChange={(e) => setCategoryForm((p) => ({ ...p, name: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] placeholder-[#666] outline-none focus:border-primary"
              placeholder="Ej. ANTOJITOS"
            />
            {categoryErrors.name && (
              <p className="mt-1 text-xs font-bold text-red-400">{categoryErrors.name}</p>
            )}
          </div>
          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/40 uppercase tracking-wider block mb-1 flex items-center gap-1.5">
              <Globe className="h-3 w-3 text-blue-400" />
              Nombre en Inglés (EN)
            </label>
            <input
              type="text"
              value={categoryForm.nameEn}
              onChange={(e) => setCategoryForm((p) => ({ ...p, nameEn: e.target.value }))}
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] placeholder-[#444] outline-none focus:border-blue-500"
              placeholder="e.g. Snacks"
            />
          </div>
          <div className="flex justify-end gap-3 pt-4 border-t border-white/10">
            <button
              type="button"
              onClick={() => setIsCategoryModalOpen(false)}
              className="rounded-xl border border-white/10 px-4 py-2.5 text-xs font-bold text-[#E0E0E0]/70 hover:bg-white/5"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="rounded-xl bg-amber-500 px-5 py-2.5 text-xs font-black text-black hover:brightness-105 disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : categoryForm.id ? "Actualizar" : "Crear Categoría"}
            </button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        title="Gestión de Recetas e Ingredientes"
        subtitle="Asigna ingredientes a cada platillo para control de inventario"
        icon={<BookOpen className="h-5 w-5 text-purple-400" />}
        maxWidth="xl"
      >
        <div className="space-y-6">
          <div>
            <label className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
              Selecciona Producto del Menú
            </label>
            <select
              value={selectedRecipeMenuItemId}
              onChange={(e) => {
                setSelectedRecipeMenuItemId(e.target.value);
                if (e.target.value) fetchRecipes(e.target.value);
              }}
              className="w-full rounded-xl border border-white/10 bg-[#181818] px-4 py-2.5 text-sm text-[#E0E0E0] outline-none focus:border-primary font-bold"
            >
              <option value="">-- Seleccionar Producto --</option>
              {items.map((i) => (
                <option key={i.id} value={i.id}>
                  {i.name} (${Number(i.price).toFixed(2)})
                </option>
              ))}
            </select>
          </div>

          {selectedRecipeMenuItemId ? (
            <>
              <form
                onSubmit={handleRecipeSubmit}
                className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-[#181818] p-4 rounded-xl border border-white/5"
              >
                <div className="sm:col-span-2">
                  <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
                    Nombre del Ingrediente
                  </label>
                  <input
                    type="text"
                    value={recipeForm.ingredientName}
                    onChange={(e) =>
                      setRecipeForm((prev) => ({
                        ...prev,
                        ingredientName: e.target.value,
                      }))
                    }
                    className="w-full rounded-xl border border-white/10 bg-[#242424] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary"
                    placeholder="Ej. Carne de Cerdo (g), Bolillo, etc."
                  />
                  {recipeErrors.ingredientName && (
                    <p className="text-[10px] font-bold text-red-400 mt-0.5">
                      {recipeErrors.ingredientName}
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider block mb-1">
                    Cantidad Requerida
                  </label>
                  <div className="flex gap-2">
                    <input
                      type="number"
                      step="0.01"
                      value={recipeForm.quantityRequired}
                      onChange={(e) =>
                        setRecipeForm((prev) => ({
                          ...prev,
                          quantityRequired: e.target.value,
                        }))
                      }
                      className="w-full rounded-xl border border-white/10 bg-[#242424] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary"
                      placeholder="1"
                    />
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="rounded-xl bg-purple-500 px-3 py-2 text-xs font-bold text-white hover:bg-purple-600 shrink-0"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </div>
                  {recipeErrors.quantityRequired && (
                    <p className="text-[10px] font-bold text-red-400 mt-0.5">
                      {recipeErrors.quantityRequired}
                    </p>
                  )}
                </div>
              </form>

              <div>
                <h4 className="text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-wider mb-2">
                  Ingredientes Configurados ({recipeItems.length})
                </h4>
                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {recipeItems.map((rec) => (
                    <div
                      key={rec.id}
                      className="flex items-center justify-between bg-[#181818] p-3 rounded-xl border border-white/5 text-xs"
                    >
                      <span className="font-bold text-[#E0E0E0]">
                        {rec.ingredientName}
                      </span>
                      <div className="flex items-center gap-3">
                        <span className="text-[#E0E0E0]/60 font-mono font-bold">
                          {rec.quantityRequired} unidad(es)
                        </span>
                        <button
                          type="button"
                          onClick={() => deleteRecipe(rec.id)}
                          className={`text-xs font-black transition-all p-1 rounded ${
                            deleteArmedRecipeId === rec.id
                              ? "text-red-300 bg-red-500/30 px-2"
                              : "text-red-400 hover:text-red-300"
                          }`}
                          title={
                            deleteArmedRecipeId === rec.id
                              ? "Confirmar"
                              : "Quitar de receta"
                          }
                        >
                          {deleteArmedRecipeId === rec.id ? (
                            "¿Quitar?"
                          ) : (
                            <Trash2 className="h-3.5 w-3.5" />
                          )}
                        </button>
                      </div>
                    </div>
                  ))}
                  {recipeItems.length === 0 && (
                    <p className="text-xs text-[#E0E0E0]/40 italic text-center py-4">
                      No hay ingredientes registrados para este platillo.
                    </p>
                  )}
                </div>
              </div>
            </>
          ) : (
            <p className="text-xs text-[#E0E0E0]/40 italic text-center py-8">
              Selecciona un producto arriba para ver o agregar sus ingredientes.
            </p>
          )}
        </div>
      </Modal>
    </div>
  );
}
