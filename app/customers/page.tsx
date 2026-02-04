"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type Customer = {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  birthday?: string | null;
  loyaltyPoints: number;
  totalSpend: number;
  createdAt?: string;
};

type CustomerFormState = {
  id?: string;
  name: string;
  phone: string;
  email: string;
  birthday: string;
};

const emptyForm: CustomerFormState = {
  name: "",
  phone: "",
  email: "",
  birthday: "",
};

const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;
const phoneRegex = /^[0-9+\-()\s]{7,20}$/;

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [formState, setFormState] = useState<CustomerFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});

  const isEditing = Boolean(formState.id);

  const totalLoyaltyPoints = useMemo(
    () =>
      customers.reduce(
        (acc, customer) => acc + (customer.loyaltyPoints || 0),
        0,
      ),
    [customers],
  );

  const fetchCustomers = async () => {
    try {
      setIsLoading(true);
      const response = await fetch("/api/customers");
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Error al cargar clientes");
      }
      setCustomers(data.customers || []);
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
    fetchCustomers();
  }, []);

  const validateForm = (state: CustomerFormState) => {
    const errors: Record<string, string> = {};

    if (!state.name.trim()) {
      errors.name = "El nombre es obligatorio";
    }

    if (state.email && !emailRegex.test(state.email)) {
      errors.email = "El correo no es válido";
    }

    if (state.phone && !phoneRegex.test(state.phone)) {
      errors.phone = "El teléfono no es válido";
    }

    return errors;
  };

  const handleFormChange = (field: keyof CustomerFormState, value: string) => {
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
        phone: formState.phone || undefined,
        email: formState.email || undefined,
        birthday: formState.birthday || undefined,
      };

      const response = await fetch("/api/customers", {
        method: isEditing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo guardar el cliente");
      }
      await fetchCustomers();
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

  const handleEdit = (customer: Customer) => {
    setFormState({
      id: customer.id,
      name: customer.name,
      phone: customer.phone || "",
      email: customer.email || "",
      birthday: customer.birthday
        ? new Date(customer.birthday).toISOString().slice(0, 10)
        : "",
    });
    setFormErrors({});
  };

  const handleDelete = async (customerId: string) => {
    const confirmed = window.confirm(
      "¿Eliminar este cliente? Esta acción no se puede deshacer.",
    );
    if (!confirmed) {
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/customers", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: customerId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo eliminar el cliente");
      }
      await fetchCustomers();
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
            <h1 className="text-2xl font-bold text-gray-900">Clientes & CRM</h1>
            <p className="text-sm text-gray-600">
              {customers.length} clientes · {totalLoyaltyPoints} puntos totales
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
              {isEditing ? "Editar cliente" : "Registrar cliente"}
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
                  placeholder="Nombre completo"
                />
                {formErrors.name && (
                  <p className="mt-1 text-xs text-red-600">{formErrors.name}</p>
                )}
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    value={formState.phone}
                    onChange={(event) =>
                      handleFormChange("phone", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="WhatsApp"
                  />
                  {formErrors.phone && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.phone}
                    </p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formState.email}
                    onChange={(event) =>
                      handleFormChange("email", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="correo@ejemplo.com"
                  />
                  {formErrors.email && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.email}
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">
                  Cumpleaños
                </label>
                <input
                  type="date"
                  value={formState.birthday}
                  onChange={(event) =>
                    handleFormChange("birthday", event.target.value)
                  }
                  className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                />
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700 disabled:opacity-70"
              >
                {isSubmitting
                  ? "Guardando..."
                  : isEditing
                    ? "Actualizar cliente"
                    : "Crear cliente"}
              </button>
            </form>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">
              Programa de lealtad
            </h2>
            <p className="mt-2 text-sm text-gray-600">
              Se acumulan automáticamente $10 pesos por punto al registrar
              ventas.
            </p>
            <div className="mt-4 rounded-lg bg-purple-50 p-4 text-sm text-purple-800">
              Total puntos acumulados: {totalLoyaltyPoints}
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">
              Clientes registrados
            </h2>
            <button
              type="button"
              onClick={fetchCustomers}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Recargar
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-gray-600">Cargando clientes...</p>
          ) : customers.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">
              No hay clientes registrados.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2">Cliente</th>
                    <th className="py-2">Contacto</th>
                    <th className="py-2">Cumpleaños</th>
                    <th className="py-2">Puntos</th>
                    <th className="py-2">Total gastado</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {customers.map((customer) => (
                    <tr key={customer.id} className="border-b last:border-0">
                      <td className="py-3">
                        <p className="font-medium text-gray-900">
                          {customer.name}
                        </p>
                      </td>
                      <td className="py-3 text-gray-600">
                        <p>{customer.phone || "—"}</p>
                        <p className="text-xs text-gray-500">
                          {customer.email || ""}
                        </p>
                      </td>
                      <td className="py-3 text-gray-600">
                        {customer.birthday
                          ? new Date(customer.birthday).toLocaleDateString(
                              "es-MX",
                            )
                          : "—"}
                      </td>
                      <td className="py-3 text-gray-600">
                        {customer.loyaltyPoints}
                      </td>
                      <td className="py-3 text-gray-600">
                        ${customer.totalSpend.toFixed(2)}
                      </td>
                      <td className="py-3">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(customer)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Editar
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(customer.id)}
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
