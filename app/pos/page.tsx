"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";

type MenuItem = {
  id: string;
  name: string;
  price: number;
  isAvailable: boolean;
};

type Customer = {
  id: string;
  name: string;
};

type OrderItemDraft = {
  menuItemId: string;
  quantity: string;
  notes: string;
};

type Order = {
  id: string;
  orderNumber: string;
  status: string;
  table?: string | null;
  source: string;
  total: number;
  createdAt: string;
  orderItems: { id: string }[];
};

type OrderFormState = {
  customerId: string;
  source: string;
  table: string;
  notes: string;
  items: OrderItemDraft[];
};

const emptyForm: OrderFormState = {
  customerId: "",
  source: "",
  table: "",
  notes: "",
  items: [{ menuItemId: "", quantity: "1", notes: "" }],
};

const STATUS_OPTIONS = [
  "PENDING",
  "PREPARING",
  "READY",
  "DELIVERED",
  "PAID",
  "CANCELLED",
] as const;

const SOURCE_OPTIONS = [
  "TikTok",
  "Instagram",
  "Pasaba por ahí",
  "Recomendación",
  "Otro",
];

export default function POSPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [formState, setFormState] = useState<OrderFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const availableMenuItems = useMemo(
    () => menuItems.filter((item) => item.isAvailable),
    [menuItems],
  );

  const fetchMenu = async () => {
    const response = await fetch("/api/menu");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar menú");
    setMenuItems(data.items || []);
  };

  const fetchCustomers = async () => {
    const response = await fetch("/api/customers");
    const data = await response.json();
    if (!response.ok)
      throw new Error(data?.error || "Error al cargar clientes");
    setCustomers(data.customers || []);
  };

  const fetchOrders = async () => {
    const response = await fetch("/api/orders");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar órdenes");
    setOrders(data.orders || []);
    setStatusDrafts((prev) => {
      const next = { ...prev };
      (data.orders || []).forEach((order: Order) => {
        if (!next[order.id]) {
          next[order.id] = order.status;
        }
      });
      return next;
    });
  };

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        await Promise.all([fetchMenu(), fetchCustomers(), fetchOrders()]);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Error inesperado al cargar",
        );
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const handleFormChange = (field: keyof OrderFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleItemChange = (
    index: number,
    field: keyof OrderItemDraft,
    value: string,
  ) => {
    setFormState((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return { ...prev, items: nextItems };
    });
  };

  const addItemRow = () => {
    setFormState((prev) => ({
      ...prev,
      items: [...prev.items, { menuItemId: "", quantity: "1", notes: "" }],
    }));
  };

  const removeItemRow = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const validateForm = (state: OrderFormState) => {
    const errors: Record<string, string> = {};

    if (!state.source) {
      errors.source = "Selecciona una fuente";
    }

    if (!state.items.length) {
      errors.items = "Agrega al menos un producto";
    }

    state.items.forEach((item, index) => {
      if (!item.menuItemId) {
        errors[`item-${index}-menu`] = "Selecciona un producto";
      }
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) {
        errors[`item-${index}-quantity`] = "Cantidad inválida";
      }
    });

    return errors;
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
        customerId: formState.customerId || undefined,
        source: formState.source,
        table: formState.table || undefined,
        notes: formState.notes || undefined,
        orderItems: formState.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: Number(item.quantity),
          notes: item.notes || undefined,
        })),
      };

      const response = await fetch("/api/orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo crear la orden");
      }
      await fetchOrders();
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

  const handleStatusChange = (orderId: string, value: string) => {
    setStatusDrafts((prev) => ({ ...prev, [orderId]: value }));
  };

  const updateStatus = async (orderId: string) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDrafts[orderId] || "PENDING" }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo actualizar el estado");
      }
      await fetchOrders();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error
          ? error.message
          : "Error inesperado al actualizar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    const confirmed = window.confirm("¿Eliminar esta orden?");
    if (!confirmed) return;

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId }),
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "No se pudo eliminar la orden");
      }
      await fetchOrders();
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
            <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
            <p className="text-sm text-gray-600">
              {orders.length} órdenes registradas
            </p>
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
            <h2 className="text-lg font-semibold text-gray-900">Nueva orden</h2>
            <form onSubmit={handleSubmit} className="mt-4 grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Cliente
                  </label>
                  <select
                    value={formState.customerId}
                    onChange={(event) =>
                      handleFormChange("customerId", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Sin cliente</option>
                    {customers.map((customer) => (
                      <option key={customer.id} value={customer.id}>
                        {customer.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Fuente
                  </label>
                  <select
                    value={formState.source}
                    onChange={(event) =>
                      handleFormChange("source", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona una fuente</option>
                    {SOURCE_OPTIONS.map((source) => (
                      <option key={source} value={source}>
                        {source}
                      </option>
                    ))}
                  </select>
                  {formErrors.source && (
                    <p className="mt-1 text-xs text-red-600">
                      {formErrors.source}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Mesa
                  </label>
                  <input
                    type="text"
                    value={formState.table}
                    onChange={(event) =>
                      handleFormChange("table", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Ej. Mesa 5"
                  />
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Notas
                  </label>
                  <input
                    type="text"
                    value={formState.notes}
                    onChange={(event) =>
                      handleFormChange("notes", event.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    placeholder="Indicaciones especiales"
                  />
                </div>
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700">
                    Productos
                  </label>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-sm text-blue-600 hover:text-blue-800"
                  >
                    + Agregar producto
                  </button>
                </div>
                {formErrors.items && (
                  <p className="mt-1 text-xs text-red-600">
                    {formErrors.items}
                  </p>
                )}
                <div className="mt-3 space-y-3">
                  {formState.items.map((item, index) => (
                    <div
                      key={`item-${index}`}
                      className="grid gap-3 rounded-lg border border-gray-200 p-3 sm:grid-cols-[2fr_1fr_2fr_auto]"
                    >
                      <div>
                        <select
                          value={item.menuItemId}
                          onChange={(event) =>
                            handleItemChange(
                              index,
                              "menuItemId",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        >
                          <option value="">Selecciona un producto</option>
                          {availableMenuItems.map((menuItem) => (
                            <option key={menuItem.id} value={menuItem.id}>
                              {menuItem.name} (${menuItem.price.toFixed(2)})
                            </option>
                          ))}
                        </select>
                        {formErrors[`item-${index}-menu`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {formErrors[`item-${index}-menu`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(event) =>
                            handleItemChange(
                              index,
                              "quantity",
                              event.target.value,
                            )
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                        />
                        {formErrors[`item-${index}-quantity`] && (
                          <p className="mt-1 text-xs text-red-600">
                            {formErrors[`item-${index}-quantity`]}
                          </p>
                        )}
                      </div>
                      <div>
                        <input
                          type="text"
                          value={item.notes}
                          onChange={(event) =>
                            handleItemChange(index, "notes", event.target.value)
                          }
                          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                          placeholder="Notas"
                        />
                      </div>
                      <div className="flex items-center">
                        {formState.items.length > 1 && (
                          <button
                            type="button"
                            onClick={() => removeItemRow(index)}
                            className="text-sm text-red-600 hover:text-red-800"
                          >
                            Eliminar
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700 disabled:opacity-70"
              >
                {isSubmitting ? "Creando..." : "Crear orden"}
              </button>
            </form>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900">Resumen</h2>
            {isLoading ? (
              <p className="mt-3 text-sm text-gray-600">Cargando datos...</p>
            ) : (
              <div className="mt-4 space-y-3 text-sm text-gray-600">
                <p>Productos disponibles: {availableMenuItems.length}</p>
                <p>Clientes registrados: {customers.length}</p>
                <p>Órdenes totales: {orders.length}</p>
              </div>
            )}
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Órdenes</h2>
            <button
              type="button"
              onClick={fetchOrders}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              Recargar
            </button>
          </div>

          {isLoading ? (
            <p className="mt-4 text-sm text-gray-600">Cargando órdenes...</p>
          ) : orders.length === 0 ? (
            <p className="mt-4 text-sm text-gray-600">
              No hay órdenes registradas.
            </p>
          ) : (
            <div className="mt-4 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b text-gray-500">
                    <th className="py-2">Orden</th>
                    <th className="py-2">Mesa</th>
                    <th className="py-2">Estado</th>
                    <th className="py-2">Total</th>
                    <th className="py-2">Items</th>
                    <th className="py-2">Acciones</th>
                  </tr>
                </thead>
                <tbody>
                  {orders.map((order) => (
                    <tr key={order.id} className="border-b last:border-0">
                      <td className="py-3">
                        <p className="font-medium text-gray-900">
                          #{order.orderNumber}
                        </p>
                        <p className="text-xs text-gray-500">
                          {new Date(order.createdAt).toLocaleString("es-MX")}
                        </p>
                      </td>
                      <td className="py-3 text-gray-600">
                        {order.table || "—"}
                      </td>
                      <td className="py-3">
                        <select
                          value={statusDrafts[order.id] || order.status}
                          onChange={(event) =>
                            handleStatusChange(order.id, event.target.value)
                          }
                          className="rounded-lg border border-gray-300 px-2 py-1 text-xs"
                        >
                          {STATUS_OPTIONS.map((status) => (
                            <option key={status} value={status}>
                              {status}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="py-3 text-gray-600">
                        ${order.total.toFixed(2)}
                      </td>
                      <td className="py-3 text-gray-600">
                        {order.orderItems.length}
                      </td>
                      <td className="py-3">
                        <div className="flex flex-col gap-2">
                          <button
                            type="button"
                            onClick={() => updateStatus(order.id)}
                            className="text-blue-600 hover:text-blue-800"
                          >
                            Actualizar estado
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteOrder(order.id)}
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
