"use client";

import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

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
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import {
  TableSearchInput,
  TableHeaderSortCell,
  TablePagination,
} from "@/components/ui/DataTableControls";

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  isAvailable: boolean;
};

interface DatabaseMenuItem {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  is_available: boolean;
  image_url?: string | null;
}

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
};

type RecipeFormState = {
  ingredientName: string;
  quantityRequired: string;
};

const emptyForm: MenuFormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  imageUrl: "",
  isAvailable: true,
};

const emptyRecipeForm: RecipeFormState = {
  ingredientName: "",
  quantityRequired: "",
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
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

  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Modals state
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isRecipeModalOpen, setIsRecipeModalOpen] = useState(false);

  // Form state
  const [formState, setFormState] = useState<MenuFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

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

  const fetchRecipes = async (menuItemId: string) => {
    if (!menuItemId) {
      setRecipeItems([]);
      setRecipeQuantities({});
      return;
    }
    const response = await fetch(`/api/recipes?menuItemId=${menuItemId}`);
    const data = await response.json();
    if (!response.ok) {
      throw new Error(data?.error || "Error al cargar recetas");
    }
    const recipes = data.recipeItems || [];
    setRecipeItems(recipes);
    setRecipeQuantities(
      recipes.reduce((acc: Record<string, string>, item: RecipeItem) => {
        acc[item.id] = String(item.quantityRequired);
        return acc;
      }, {}),
    );
  };

  useEffect(() => {
    fetchMenu();
  }, []);

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
    });
    setImagePreview(item.imageUrl || null);
    setFormErrors({});
    setSelectedFile(null);
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
        error instanceof Error ? error.message : "Error inesperado al eliminar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Recipe Modal & Methods
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

  useEffect(() => {
    setCurrentPage(1);
  }, [
    searchQuery,
    categoryFilter,
    availabilityFilter,
    sortField,
    sortDirection,
    pageSize,
  ]);

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
  };

  return (
    <div className="min-h-screen bg-[#121212]">
      {/* Header reutilizable */}
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

        {/* TABLA DE PRODUCTOS CON BUSQUEDA, FILTROS, ORDENAMIENTO Y PAGINACION */}
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
                onChange={setSearchQuery}
                placeholder="Buscar por nombre o descripción..."
              />
            </div>

            <div>
              <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1">
                Categoría
              </label>
              <select
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
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
                onChange={(e) =>
                  setAvailabilityFilter(
                    e.target.value as "all" | "available" | "unavailable",
                  )
                }
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
                      {isLoading
                        ? "Cargando menú..."
                        : "No se encontraron productos en el menú."}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Controls de Paginación */}
          <TablePagination
            currentPage={currentPage}
            totalPages={totalPages}
            totalItems={sortedItems.length}
            pageSize={pageSize}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
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

      {/* MODAL DE RECETAS */}
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

              {/* Lista de Ingredientes en la Receta */}
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
