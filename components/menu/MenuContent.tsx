"use client";

import { PageHeader } from "@/components/PageHeader";
import { BookOpen, Plus, RefreshCw, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { SubmitEvent, useMemo, useState, useTransition } from "react";

import {
  MenuCategoriesProvider,
  useMenuCategories,
} from "./hooks/useMenuCategories";
import { MenuItemsProvider, useMenuItems } from "./hooks/useMenuItems";
import { RecipesProvider, useRecipes } from "./hooks/useRecipes";

import { CategoriesPanel } from "./components/CategoriesPanel";
import { CategoryModal } from "./components/CategoryModal";
import { IngredientModal } from "./components/IngredientModal";
import { MenuFilters } from "./components/MenuFilters";
import { MenuTable } from "./components/MenuTable";
import { ProductModal } from "./components/ProductModal";
import { RecipeModal } from "./components/RecipeModal";
import { CustomizationEditorModal } from "./components/CustomizationEditorModal";
import { useOptionalUser } from "@/components/UserProvider";

import {
  EMPTY_INGREDIENT_FORM,
  Ingredient,
  IngredientFormState,
  MenuCategory,
  MenuItem,
  SortField,
} from "./types";

interface MenuContentProps {
  items: MenuItem[];
  categories: string[];
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

function syncMenuUrlParams(params: {
  q: string;
  category: string;
  availability: string;
  sort: SortField;
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
}) {
  if (typeof window === "undefined") return;
  const search = new URLSearchParams();
  if (params.q) search.set("q", params.q);
  if (params.category && params.category !== "all") {
    search.set("category", params.category);
  }
  if (params.availability && params.availability !== "all") {
    search.set("availability", params.availability);
  }
  if (params.sort !== "name") search.set("sort", params.sort);
  if (params.direction !== "asc") search.set("direction", params.direction);
  if (params.page > 1) search.set("page", String(params.page));
  if (params.pageSize !== 10) search.set("pageSize", String(params.pageSize));
  const qs = search.toString();
  const nextUrl = qs
    ? `${window.location.pathname}?${qs}`
    : window.location.pathname;
  window.history.replaceState(null, "", nextUrl);
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
  initialIngredients,
  searchParams,
}: MenuContentProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const user = useOptionalUser();
  const canCustomize =
    user?.hasPermission?.("menu.manage_customization") ?? false;
  const [customizingItem, setCustomizingItem] = useState<MenuItem | null>(null);

  const [searchQuery, setSearchQuery] = useState(searchParams.q || "");
  const [categoryFilter, setCategoryFilter] = useState(
    searchParams.category || "all",
  );
  const [availabilityFilter, setAvailabilityFilter] = useState<
    "all" | "available" | "unavailable"
  >(
    (searchParams.availability as "all" | "available" | "unavailable") ||
      "all",
  );
  const [sortField, setSortField] = useState<SortField>(
    searchParams.sort || "name",
  );
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">(
    searchParams.direction || "asc",
  );
  const [page, setPage] = useState(searchParams.page || 1);
  const [pageSize, setPageSize] = useState(searchParams.pageSize || 10);

  const filteredAndSortedItems = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    const cat = categoryFilter.trim().toLowerCase();

    const filtered = items.filter((item) => {
      if (q) {
        const matchesName = item.name.toLowerCase().includes(q);
        const matchesDesc = (item.description || "").toLowerCase().includes(q);
        const matchesCat = (item.category || "").toLowerCase().includes(q);
        if (!matchesName && !matchesDesc && !matchesCat) return false;
      }

      if (cat === "uncategorized") {
        if (item.category && item.category.trim() !== "") return false;
      } else if (cat !== "all") {
        if ((item.category || "").trim().toLowerCase() !== cat) return false;
      }

      if (availabilityFilter === "available" && !item.isAvailable) {
        return false;
      }
      if (availabilityFilter === "unavailable" && item.isAvailable) {
        return false;
      }

      return true;
    });

    const factor = sortDirection === "desc" ? -1 : 1;
    return filtered.slice().sort((a, b) => {
      if (sortField === "price") {
        return (Number(a.price) - Number(b.price)) * factor;
      }
      if (sortField === "isAvailable") {
        return (Number(a.isAvailable) - Number(b.isAvailable)) * factor;
      }
      const aVal = sortField === "category" ? a.category || "" : a.name;
      const bVal = sortField === "category" ? b.category || "" : b.name;
      return aVal.localeCompare(bVal, "es", { sensitivity: "base" }) * factor;
    });
  }, [
    items,
    searchQuery,
    categoryFilter,
    availabilityFilter,
    sortField,
    sortDirection,
  ]);

  const totalItems = filteredAndSortedItems.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const safePage = Math.min(page, totalPages);
  const paginatedItems = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return filteredAndSortedItems.slice(start, start + pageSize);
  }, [filteredAndSortedItems, safePage, pageSize]);

  const updateFilterState = (updates: {
    q?: string;
    category?: string;
    availability?: "all" | "available" | "unavailable";
    sort?: SortField;
    direction?: "asc" | "desc";
    page?: number;
    pageSize?: number;
  }) => {
    const nextQ = updates.q !== undefined ? updates.q : searchQuery;
    const nextCategory =
      updates.category !== undefined ? updates.category : categoryFilter;
    const nextAvailability =
      updates.availability !== undefined
        ? updates.availability
        : availabilityFilter;
    const nextSort = updates.sort !== undefined ? updates.sort : sortField;
    const nextDirection =
      updates.direction !== undefined ? updates.direction : sortDirection;
    const nextPageSize =
      updates.pageSize !== undefined ? updates.pageSize : pageSize;
    const nextPage = updates.page !== undefined ? updates.page : 1;

    setSearchQuery(nextQ);
    setCategoryFilter(nextCategory);
    setAvailabilityFilter(nextAvailability);
    setSortField(nextSort);
    setSortDirection(nextDirection);
    setPageSize(nextPageSize);
    setPage(nextPage);

    syncMenuUrlParams({
      q: nextQ,
      category: nextCategory,
      availability: nextAvailability,
      sort: nextSort,
      direction: nextDirection,
      page: nextPage,
      pageSize: nextPageSize,
    });
  };

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

  const { openRecipeModal, isRecipeModalOpen, setRecipeForm } = useRecipes();

  // Ingredient modal state
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [ingredientForm, setIngredientForm] = useState<IngredientFormState>(
    EMPTY_INGREDIENT_FORM,
  );
  const [ingredientErrors, setIngredientErrors] = useState<
    Record<string, string>
  >({});
  const [isIngredientSubmitting, setIsIngredientSubmitting] = useState(false);

  const handleIngredientFormChange = (
    field: keyof IngredientFormState,
    value: string,
  ) => {
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
          costPerUnit: ingredientForm.costPerUnit
            ? Number(ingredientForm.costPerUnit)
            : null,
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
      setErrorMessage(
        err instanceof Error ? err.message : "Error al guardar el ingrediente",
      );
    } finally {
      setIsIngredientSubmitting(false);
    }
  };

  const dbCategories = useMemo(() => {
    return menuCategories
      .filter((c) => c.is_active !== false)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => c.name);
  }, [menuCategories]);

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
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold text-text-light hover:bg-dark/40 transition-all duration-200 ease-out uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              <Plus className="h-4 w-4 text-emerald-400" />
              Nuevo Ingrediente
            </button>
            <button
              onClick={() => openRecipeModal()}
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold text-text-light hover:bg-dark/40 transition-all duration-200 ease-out uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              <BookOpen className="h-4 w-4 text-primary" />
              Recetas e Ingredientes
            </button>
            <button
              onClick={() => openCategoryModal()}
              className="rounded-lg border border-border bg-card px-4 py-2 text-xs font-bold text-text-light hover:bg-dark/40 transition-all duration-200 ease-out uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              <Tag className="h-4 w-4 text-amber-400" />
              Categorías
            </button>
            <button
              onClick={openNewProductModal}
              className="rounded-lg bg-primary px-4 py-2 text-xs font-black text-dark hover:opacity-90 active:scale-[0.98] transition-all duration-200 ease-out uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm focus-visible:ring-2 focus-visible:ring-primary outline-none"
            >
              <Plus className="h-4 w-4" />
              Nuevo Producto
            </button>
          </>
        }
      />

      <main className="mx-auto max-w-7xl space-y-6 px-4 py-8 sm:px-6 lg:px-8">
        {activeErrors && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 text-xs font-bold text-red-400">
            {activeErrors}
          </div>
        )}

        {categoriesLoaded && <CategoriesPanel />}

        <section className="rounded-xl bg-card p-6 shadow-sm border border-border space-y-4">
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

          <MenuFilters
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            availabilityFilter={availabilityFilter}
            onSearchChange={(q) => updateFilterState({ q })}
            onCategoryChange={(category) => updateFilterState({ category })}
            onAvailabilityChange={(availability) =>
              updateFilterState({ availability })
            }
          />

          <MenuTable
            paginatedItems={paginatedItems}
            totalPages={totalPages}
            totalItems={totalItems}
            currentPage={safePage}
            pageSize={pageSize}
            sortField={sortField}
            sortDirection={sortDirection}
            onSortChange={(sort, direction) =>
              updateFilterState({ sort, direction })
            }
            onPageChange={(nextPage) => updateFilterState({ page: nextPage })}
            onPageSizeChange={(size) =>
              updateFilterState({ pageSize: size, page: 1 })
            }
            onCustomize={canCustomize ? setCustomizingItem : undefined}
          />
        </section>
      </main>

      <ProductModal
        categories={dbCategories}
        ingredients={initialIngredients}
        onAddIngredient={() => setIsIngredientModalOpen(true)}
      />

      <CategoryModal />

      {customizingItem && (
        <CustomizationEditorModal
          menuItem={{
            id: customizingItem.id,
            name: customizingItem.name,
            price: Number(customizingItem.price) || 0,
          }}
          menuItems={items.map((m) => ({
            id: m.id,
            name: m.name,
            price: Number(m.price) || 0,
          }))}
          ingredients={initialIngredients}
          onClose={() => setCustomizingItem(null)}
          onSaved={() => router.refresh()}
        />
      )}

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
