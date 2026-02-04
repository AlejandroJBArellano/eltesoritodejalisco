"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  isAvailable: boolean;
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

const emptyForm: MenuFormState = {
  name: "",
  description: "",
  price: "",
  category: "",
  imageUrl: "",
  isAvailable: true,
};

export default function MenuPage() {
  const [items, setItems] = useState<MenuItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<MenuFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isEditing = Boolean(formState.id);

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
      setItems(data.items || []);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al cargar",
      );
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMenu();
  }, []);

  const validateForm = (state: MenuFormState) => {
    const errors: Record<string, string> = {};

    if (!state.name.trim()) {
      errors.name = "El nombre es obligatorio";
    }

    const price = Number(state.price);
    if (!Number.isFinite(price) || price < 0) {
      errors.price = "El precio debe ser un número mayor o igual a 0";
    }

    if (state.imageUrl && !/^https?:\/\//i.test(state.imageUrl)) {
      errors.imageUrl = "La URL de imagen debe iniciar con http o https";
    }

    return errors;
  };

  const handleFormChange = (
    field: keyof MenuFormState,
    value: string | boolean,
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setFormState(emptyForm);
    setFormErrors({});
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(formState);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        id: formState.id,
        name: formState.name.trim(),
        description: formState.description || undefined,
        price: Number(formState.price),
        category: formState.category || undefined,
        imageUrl: formState.imageUrl || undefined,
        isAvailable: formState.isAvailable,
      };

      const response = await fetch("/api/menu", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar el producto");
      }
      await fetchMenu();
      resetForm();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado al guardar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleEdit = (item: MenuItem) => {
    setFormState({
      id: item.id,
      name: item.name,
      description: item.description || "",
      price: String(item.price),
      category: item.category || "",
      imageUrl: item.imageUrl || "",
      isAvailable: item.isAvailable,
    });
    setFormErrors({});
  };

  const handleDelete = async (itemId: string) => {
    const confirmed = window.confirm(
      "¿Eliminar este producto del menú? Esta acción no se puede deshacer.",
    );
    if (!confirmed) {
      return;
    }

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

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Volver al Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">
              Gestión de Menú
            </h1>
            <p className="text-sm text-gray-600">
              {items.length} productos · {activeCount} disponibles
            </p>
          </div>
          <div className="flex gap-3">
            {isEditing && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
              >
                Cancelar edición
              </button>
            )}
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">
              {isEditing ? "Editar producto" : "Nuevo producto"}
            </h2>
            <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
              <div>
                <label className="text-sm font-medium text-gray-700">
                  Nombre
                </label>
                <input
                  type="text"
                  value={formState.name}
                  onChange={(event) =>
                    handleFormChange("name", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Ej. Torta Ahogada"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Descripción
                </label>
                <textarea
                  value={formState.description}
                  onChange={(event) =>
                    handleFormChange("description", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  rows={3}
                  placeholder="Descripción corta del platillo"
                />
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Precio
                  </label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.price}
                    onChange={(event) =>
                      handleFormChange("price", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ej. 95"
                  />
                  {formErrors.price && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.price}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Categoría
                  </label>
                  <input
                    type="text"
                    value={formState.category}
                    onChange={(event) =>
                      handleFormChange("category", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Entradas, Bebidas, etc."
                  />
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Imagen URL
                </label>
                <input
                  type="url"
                  value={formState.imageUrl}
                  onChange={(event) =>
                    handleFormChange("imageUrl", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="https://..."
                />
                {formErrors.imageUrl && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.imageUrl}
                  </p>
                )}
              </div>

              <label className="flex items-center gap-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={formState.isAvailable}
                  onChange={(event) =>
                    handleFormChange("isAvailable", event.target.checked)
                  }
                  className="h-4 w-4 rounded border-gray-300"
                />
                Disponible en menú
              </label>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {isSubmitting
                  ? "Guardando..."
                  : isEditing
                    ? "Actualizar producto"
                    : "Crear producto"}
              </button>
            </form>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">
              Notas de recetas
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Próximo paso: enlazar ingredientes con recetas para el descuento
              automático.
            </p>
            <div className="mt-4 rounded-lg bg-blue-50 p-4 text-sm text-blue-700">
              Cada platillo podrá registrar los ingredientes y cantidades
              requeridas.
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Productos del menú
            </h2>
            <button
              type="button"
              onClick={fetchMenu}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Recargar
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-gray-600">Cargando productos...</p>
          ) : items.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">
              No hay productos registrados.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2">Producto</th>
                    <th className="py-2">Categoría</th>
                    <th className="py-2">Precio</th>
                    <th className="py-2">Disponibilidad</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((item) => (
                    <tr key={item.id} className="border-b last:border-0">
                      <td className="py-3">
                        <p className="font-medium text-gray-900">{item.name}</p>
                        {item.description && (
                          <p className="text-xs text-gray-500">
                            {item.description}
                          </p>
                        )}
                      </td>
                      <td className="py-3 text-gray-600">
                        {item.category || "—"}
                      </td>
                      <td className="py-3 text-gray-600">
                        ${item.price.toFixed(2)}
                      </td>
                      <td className="py-3">
                        <span
                          className={`rounded-full px-2 py-1 text-xs ${
                            item.isAvailable
                              ? "bg-green-100 text-green-700"
                              : "bg-gray-200 text-gray-600"
                          }`}
                        >
                          {item.isAvailable ? "Disponible" : "No disponible"}
                        </span>
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(item)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(item.id)}
                            className="text-red-600 hover:text-red-800"
                          >
                            Eliminar
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}
