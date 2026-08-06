"use client";

import { useState, useEffect, useMemo, FormEvent } from "react";
import { BookOpen, Plus, RefreshCw, Tag } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";

import { useMenuItems } from "./hooks/useMenuItems";
import { useMenuCategories } from "./hooks/useMenuCategories";
import { useRecipes } from "./hooks/useRecipes";

import { MenuStatsCards } from "./components/MenuStatsCards";
import { CategoriesPanel } from "./components/CategoriesPanel";
import { MenuFilters } from "./components/MenuFilters";
import { MenuTable } from "./components/MenuTable";
import { ProductModal } from "./components/ProductModal";
import { CategoryModal } from "./components/CategoryModal";
import { RecipeModal } from "./components/RecipeModal";
import { IngredientModal } from "./components/IngredientModal";

import { MenuItem, IngredientFormState, EMPTY_INGREDIENT_FORM, Ingredient } from "./types";

interface MenuContentProps {
  initialItems: MenuItem[];
}

export function MenuContent({ initialItems }: MenuContentProps) {
  const {
    items,
    categories,
    activeCount,
    filteredItems,
    sortedItems,
    paginatedItems,
    totalPages,
    isLoading,
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
    fetchMenu,
    openNewProductModal,
    openEditProductModal,
    handleSubmit: handleProductSubmit,
    handleDelete: handleProductDelete,
    handleFormChange,
    handleFileChange,
    handleSort,
  } = useMenuItems(initialItems);

  const {
    menuCategories,
    categoriesLoaded,
    isSubmitting: isCategorySubmitting,
    errorMessage: categoryErrorMessage,
    setErrorMessage: setCategoryErrorMessage,
    isCategoryModalOpen,
    setIsCategoryModalOpen,
    categoryForm,
    setCategoryForm,
    categoryErrors,
    deleteArmedCategoryId,
    fetchCategories,
    openCategoryModal,
    handleCategorySubmit,
    handleDeleteCategory,
    handleMoveCategoryOrder,
  } = useMenuCategories();

  const {
    recipeItems,
    selectedRecipeMenuItemId,
    setSelectedRecipeMenuItemId,
    recipeForm,
    setRecipeForm,
    recipeErrors,
    isRecipeModalOpen,
    setIsRecipeModalOpen,
    isSubmitting: isRecipeSubmitting,
    deleteArmedRecipeId,
    fetchRecipes,
    openRecipeModal,
    handleRecipeSubmit,
    deleteRecipe,
  } = useRecipes(items);

  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  // Ingredient modal state
  const [isIngredientModalOpen, setIsIngredientModalOpen] = useState(false);
  const [ingredientForm, setIngredientForm] = useState<IngredientFormState>(EMPTY_INGREDIENT_FORM);
  const [ingredientErrors, setIngredientErrors] = useState<Record<string, string>>({});
  const [isIngredientSubmitting, setIsIngredientSubmitting] = useState(false);

  const fetchIngredients = async () => {
    try {
      const response = await fetch("/api/inventory");
      const data = await response.json();
      if (response.ok) {
        setIngredients(data.ingredients || []);
      }
    } catch (error) {
      console.error("Error fetching ingredients:", error);
    }
  };

  const handleIngredientFormChange = (field: keyof IngredientFormState, value: string) => {
    setIngredientForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleIngredientSubmit = async (e: FormEvent<HTMLFormElement>) => {
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

      await fetchIngredients();

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

  useEffect(() => {
    fetchIngredients();
    fetchCategories();
  }, []);

  const dbCategories = useMemo(() => {
    const set = new Set<string>();
    menuCategories.forEach((c) => set.add(c.name));
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [menuCategories, items]);

  // Sync category submit with menu item refresh (in case category rename cascades or needs update)
  const onCategorySubmitSuccess = async (newName?: string) => {
    await fetchMenu();
    if (newName) {
      handleFormChange("category", newName);
    }
  };

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

        {/* Tarjetas Informativas */}
        <MenuStatsCards
          totalItems={items.length}
          activeCount={activeCount}
          categoriesCount={categories.length}
        />

        {/* PANEL DE CATEGORÍAS */}
        {categoriesLoaded && (
          <CategoriesPanel
            menuCategories={menuCategories}
            isSubmitting={isCategorySubmitting}
            deleteArmedCategoryId={deleteArmedCategoryId}
            onOpenCreate={() => openCategoryModal()}
            onOpenEdit={(cat) => openCategoryModal(cat)}
            onDelete={handleDeleteCategory}
            onMoveOrder={handleMoveCategoryOrder}
          />
        )}

        {/* TABLA DE PRODUCTOS */}
        <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
            <h2 className="text-base font-black text-text-light tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-primary" />
              Catálogo de Menú ({filteredItems.length})
            </h2>
            <button
              onClick={fetchMenu}
              className="text-xs text-text-light/60 hover:text-text-light flex items-center gap-1.5 font-bold cursor-pointer transition-colors duration-200 ease-out"
            >
              <RefreshCw
                className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
              />
              Actualizar Lista
            </button>
          </div>

          <MenuFilters
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            availabilityFilter={availabilityFilter}
            categories={dbCategories}
            onSearchChange={(v) => {
              setSearchQuery(v);
              setCurrentPage(1);
            }}
            onCategoryChange={(v) => {
              setCategoryFilter(v);
              setCurrentPage(1);
            }}
            onAvailabilityChange={(v) => {
              setAvailabilityFilter(v);
              setCurrentPage(1);
            }}
          />

          <MenuTable
            paginatedItems={paginatedItems}
            sortField={sortField}
            sortDirection={sortDirection}
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedItems.length}
            pageSize={pageSize}
            deleteArmedItemId={deleteArmedItemId}
            onSort={handleSort}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
            onOpenRecipe={openRecipeModal}
            onEdit={openEditProductModal}
            onDelete={handleProductDelete}
          />
        </section>
      </main>

      {/* MODAL DE PRODUCTO */}
      <ProductModal
        isOpen={isProductModalOpen}
        onClose={() => setIsProductModalOpen(false)}
        onSubmit={handleProductSubmit}
        formState={formState}
        formErrors={formErrors}
        isEditing={isEditing}
        isSubmitting={isSubmitting}
        categories={dbCategories}
        ingredients={ingredients}
        showTranslations={showTranslations}
        onToggleTranslations={() => setShowTranslations((v) => !v)}
        onFormChange={handleFormChange}
        imagePreview={imagePreview}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
        onAddCategory={() => openCategoryModal()}
        onAddIngredient={() => setIsIngredientModalOpen(true)}
      />

      {/* MODAL DE CATEGORÍA */}
      <CategoryModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
        onSubmit={(e) => handleCategorySubmit(e, onCategorySubmitSuccess)}
        categoryForm={categoryForm}
        categoryErrors={categoryErrors}
        isSubmitting={isCategorySubmitting}
        onNameChange={(name) => setCategoryForm((p) => ({ ...p, name }))}
        onNameEnChange={(nameEn) => setCategoryForm((p) => ({ ...p, nameEn }))}
        onShowInPickupChange={(showInPickup) =>
          setCategoryForm((p) => ({ ...p, showInPickup }))
        }
      />

      {/* MODAL DE RECETAS */}
      <RecipeModal
        isOpen={isRecipeModalOpen}
        onClose={() => setIsRecipeModalOpen(false)}
        onSubmit={handleRecipeSubmit}
        items={items}
        recipeItems={recipeItems}
        ingredients={ingredients}
        selectedRecipeMenuItemId={selectedRecipeMenuItemId}
        onSelectedRecipeMenuItemIdChange={(id) => {
          setSelectedRecipeMenuItemId(id);
          if (id) fetchRecipes(id);
        }}
        recipeForm={recipeForm}
        onRecipeFormChange={setRecipeForm}
        recipeErrors={recipeErrors}
        isSubmitting={isRecipeSubmitting}
        deleteArmedRecipeId={deleteArmedRecipeId}
        onDeleteRecipe={deleteRecipe}
        onAddIngredient={() => setIsIngredientModalOpen(true)}
      />

      {/* MODAL DE INGREDIENTE */}
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
