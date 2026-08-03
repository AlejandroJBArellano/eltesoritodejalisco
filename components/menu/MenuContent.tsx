"use client";

import { useState, useEffect } from "react";
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

import { MenuItem } from "./types";

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

  const [ingredients, setIngredients] = useState<any[]>([]);

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

  useEffect(() => {
    fetchIngredients();
  }, []);

  // Sync category submit with menu item refresh (in case category rename cascades or needs update)
  const onCategorySubmitSuccess = async () => {
    await fetchMenu();
  };

  const activeErrors = errorMessage || categoryErrorMessage;

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

          <MenuFilters
            searchQuery={searchQuery}
            categoryFilter={categoryFilter}
            availabilityFilter={availabilityFilter}
            categories={categories}
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
        categories={categories}
        ingredients={ingredients}
        showTranslations={showTranslations}
        onToggleTranslations={() => setShowTranslations((v) => !v)}
        onFormChange={handleFormChange}
        imagePreview={imagePreview}
        fileInputRef={fileInputRef}
        onFileChange={handleFileChange}
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
      />
    </div>
  );
}
