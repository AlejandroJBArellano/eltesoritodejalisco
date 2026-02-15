"use client";

import { KitchenTicket } from "@/components/pos/KitchenTicket";
import { OrderTicket } from "@/components/pos/OrderTicket";
import { OrderWithDetails } from "@/types";
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

type Order = OrderWithDetails;

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

const SOURCE_OPTIONS = [
  "TikTok",
  "Instagram",
  "Pasaba por ahí",
  "Recomendación",
  "Google Maps",
  "Otro",
];

const PAYMENT_METHODS = [
  { label: "Efectivo", value: "CASH" },
  { label: "Tarjeta", value: "CARD" },
  { label: "Transferencia", value: "TRANSFER" },
];

export default function POSPage() {
  const [menuItems, setMenuItems] = useState<MenuItem[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [formState, setFormState] = useState<OrderFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Checkout & Print State
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [showTicket, setShowTicket] = useState(false);
  const [showKitchenTicket, setShowKitchenTicket] = useState(false);
  // Edit Order State
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [additionalItems, setAdditionalItems] = useState<OrderItemDraft[]>([
    { menuItemId: "", quantity: "1", notes: "" },
  ]);

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
  };

  useEffect(() => {
    const load = async () => {
      try {
        setIsLoading(true);
        await Promise.all([fetchMenu(), fetchCustomers(), fetchOrders()]);
        setErrorMessage(null);
      } catch (error) {
        setErrorMessage(
          error instanceof Error ? error.message : "Error al cargar",
        );
      } finally {
        setIsLoading(false);
      }
    };
    load();
  }, []);

  const change = useMemo(() => {
    if (!checkoutOrder || !receivedAmount) return 0;
    const diff = Number(receivedAmount) - checkoutOrder.total;
    return diff > 0 ? diff : 0;
  }, [checkoutOrder, receivedAmount]);

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
    if (!state.source) errors.source = "Selecciona una fuente";
    if (!state.items.length) errors.items = "Agrega al menos un producto";
    return errors;
  };

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const errors = validateForm(formState);
    setFormErrors(errors);
    if (Object.keys(errors).length > 0) return;

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
      if (!response.ok) throw new Error(data?.error || "Error al crear orden");

      // Actualizar órdenes y preparar comanda para imprimir
      await fetchOrders();
      setCheckoutOrder(data.order);
      setShowKitchenTicket(true);
      setFormState(emptyForm);
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcessPayment = async () => {
    if (!checkoutOrder) return;
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: checkoutOrder.id,
          method: paymentMethod,
          amount: checkoutOrder.total,
          receivedAmount:
            paymentMethod === "CASH"
              ? Number(receivedAmount)
              : checkoutOrder.total,
          change: paymentMethod === "CASH" ? change : 0,
        }),
      });
      if (!response.ok) throw new Error("Error al procesar el pago");
      await fetchOrders();
      setShowTicket(true);
    } catch (error) {
      alert("Error al procesar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAddItems = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    // Validate items
    const validItems = additionalItems.filter(
      (item) => item.menuItemId && Number(item.quantity) > 0,
    );

    if (validItems.length === 0) {
      alert("Agrega al menos un producto válido");
      return;
    }

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/orders/${editingOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderItems: validItems.map((item) => ({
            menuItemId: item.menuItemId,
            quantity: Number(item.quantity),
            notes: item.notes || undefined,
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Error al agregar productos");

      await fetchOrders();
      setEditingOrder(null);
      setAdditionalItems([{ menuItemId: "", quantity: "1", notes: "" }]);
      
      // Optionally show updated ticket or kitchen ticket
      // For now, just close modal
    } catch (error) {
       alert(error instanceof Error ? error.message : "Error al actualizar orden");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleAdditionalItemChange = (
    index: number,
    field: keyof OrderItemDraft,
    value: string,
  ) => {
    setAdditionalItems((prev) => {
      const nextItems = [...prev];
      nextItems[index] = { ...nextItems[index], [field]: value };
      return nextItems;
    });
  };

  const addAdditionalItemRow = () => {
    setAdditionalItems((prev) => [
      ...prev,
      { menuItemId: "", quantity: "1", notes: "" },
    ]);
  };

  const removeAdditionalItemRow = (index: number) => {
    setAdditionalItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 no-print">
        {errorMessage && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <section className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Nueva orden
            </h2>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Cliente
                  </label>
                  <select
                    value={formState.customerId}
                    onChange={(e) =>
                      handleFormChange("customerId", e.target.value)
                    }
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Sin cliente</option>
                    {customers.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
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
                    onChange={(e) => handleFormChange("source", e.target.value)}
                    className={`mt-1 w-full rounded-lg border ${formErrors.source ? "border-red-500" : "border-gray-300"} px-3 py-2 text-sm`}
                  >
                    <option value="">Selecciona una fuente</option>
                    {SOURCE_OPTIONS.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                  {formErrors.source && (
                    <p className="mt-1 text-xs text-red-600 font-bold">
                      {formErrors.source}
                    </p>
                  )}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <input
                  type="text"
                  value={formState.table}
                  onChange={(e) => handleFormChange("table", e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Mesa"
                />
                <input
                  type="text"
                  value={formState.notes}
                  onChange={(e) => handleFormChange("notes", e.target.value)}
                  className="rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  placeholder="Notas generales"
                />
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Productos</span>
                  <button
                    type="button"
                    onClick={addItemRow}
                    className="text-sm text-blue-600 font-bold"
                  >
                    + Añadir
                  </button>
                </div>
                {formErrors.items && (
                  <p className="text-xs text-red-600 font-bold">
                    {formErrors.items}
                  </p>
                )}
                {formState.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <select
                      value={item.menuItemId}
                      onChange={(e) =>
                        handleItemChange(index, "menuItemId", e.target.value)
                      }
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Producto</option>
                      {availableMenuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (${m.price})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleItemChange(index, "quantity", e.target.value)
                      }
                      className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm text-center"
                    />
                    <button
                      type="button"
                      onClick={() => removeItemRow(index)}
                      className="text-red-500 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-green-600 py-3 text-white font-bold hover:bg-green-700 transition-colors"
              >
                {isSubmitting
                  ? "GUARDANDO..."
                  : "GUARDAR ORDEN E IMPRIMIR COMANDA"}
              </button>
            </form>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">
              Resumen de Hoy
            </h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between">
                <span>Órdenes activas:</span>
                <span className="font-bold text-gray-900">
                  {orders.filter((o) => o.status !== "PAID").length}
                </span>
              </div>
              <div className="flex justify-between">
                <span>Ventas hoy:</span>
                <span className="font-bold text-green-600">
                  $
                  {orders
                    .filter((o) => o.status === "PAID")
                    .reduce((acc, o) => acc + o.total, 0)
                    .toFixed(2)}
                </span>
              </div>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">
            Órdenes Recientes
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs font-bold">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Mesa</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id}>
                    <td className="px-4 py-4 font-bold text-gray-900">
                      #{order.orderNumber}
                    </td>
                    <td className="px-4 py-4">{order.table || "Llevar"}</td>
                    <td className="px-4 py-4 font-bold">
                      ${order.total.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 flex gap-2">
                      {order.status !== "PAID" && (
                        <button
                          onClick={() => {
                            setCheckoutOrder(order);
                            setShowTicket(false);
                            setShowKitchenTicket(false);
                          }}
                          className="bg-blue-600 text-white px-2 py-1.5 rounded text-[10px] font-bold"
                        >
                          COBRAR
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setCheckoutOrder(order);
                          setShowKitchenTicket(true);
                   AGREGAR PRODUCTOS */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Agregar Productos a Orden #{editingOrder.orderNumber}
              </h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            
            <form onSubmit={handleAddItems} className="space-y-6">
               <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-sm font-bold">Nuevos Productos</span>
                  <button
                    type="button"
                    onClick={addAdditionalItemRow}
                    className="text-sm text-blue-600 font-bold"
                  >
                    + Añadir
                  </button>
                </div>
                
                {additionalItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <select
                      value={item.menuItemId}
                      onChange={(e) =>
                        handleAdditionalItemChange(index, "menuItemId", e.target.value)
                      }
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                      required
                    >
                      <option value="">Producto</option>
                      {availableMenuItems.map((m) => (
                        <option key={m.id} value={m.id}>
                          {m.name} (${m.price})
                        </option>
                      ))}
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) =>
                        handleAdditionalItemChange(index, "quantity", e.target.value)
                      }
                      className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm text-center"
                      min="1"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalItemRow(index)}
                      className="text-red-500 font-bold"
                    >
                      ✕
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-4">
                 <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="w-full bg-gray-200 text-gray-800 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-purple-600 text-white py-3 rounded-lg font-bold hover:bg-purple-700 transition-colors"
                >
                  {isSubmitting ? "GUARDANDO..." : "AGREGAR"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE        setShowTicket(false);
                        }}
                        className="bg-orange-500 text-white px-2 py-1.5 rounded text-[10px] font-bold"
                      >
                        COMANDA
                      </button>
                      <button
                        onClick={() => {
                          setCheckoutOrder(order);
                          setShowTicket(true);
                          setShowKitchenTicket(false);
                        }}
                        className="border border-gray-300 px-2 py-1.5 rounded text-[10px] font-bold"
                      >
                        TICKET
                      </button>

                        <button
                          onClick={() => {
                            setEditingOrder(order);
                            setAdditionalItems([
                              { menuItemId: "", quantity: "1", notes: "" },
                            ]);
                          }}
                          className="bg-purple-600 text-white px-2 py-1.5 rounded text-[10px] font-bold"
                        >
                          AGREGAR
                        </button>
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODALES DE IMPRESIÓN */}
      {(showTicket || showKitchenTicket) && checkoutOrder && (
        <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="max-w-md w-full py-10">
            <div className="flex justify-center gap-4 mb-6 no-print">
              <button
                onClick={() => window.print()}
                className="bg-green-600 text-white px-6 py-3 rounded-xl font-black shadow-lg"
              >
                🖨️ IMPRIMIR AHORA
              </button>
              <button
                onClick={() => {
                  setCheckoutOrder(null);
                  setShowTicket(false);
                  setShowKitchenTicket(false);
                }}
                className="bg-white text-black px-6 py-3 rounded-xl font-black shadow-lg"
              >
                CERRAR
              </button>
            </div>
            {showTicket ? (
              <OrderTicket order={checkoutOrder} />
            ) : (
              <KitchenTicket order={checkoutOrder} />
            )}
          </div>
        </div>
      )}

      {/* MODAL DE CHECKOUT */}
      {checkoutOrder && !showTicket && !showKitchenTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold text-gray-900">
                Cerrar Cuenta #{checkoutOrder.orderNumber}
              </h3>
              <button
                onClick={() => setCheckoutOrder(null)}
                className="text-gray-400 hover:text-gray-600"
              >
                ✕
              </button>
            </div>
            <div className="space-y-6">
              <div className="text-center bg-blue-50 py-6 rounded-2xl">
                <p className="text-blue-600 text-sm font-bold">TOTAL A PAGAR</p>
                <p className="text-5xl font-black text-blue-700">
                  ${checkoutOrder.total.toFixed(2)}
                </p>
              </div>
              <div>
                <label className="text-xs font-bold text-gray-400 block mb-2 uppercase">
                  Método
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      className={`py-3 text-xs rounded-xl font-black border-2 transition-all ${
                        paymentMethod === m.value
                          ? "border-blue-600 bg-blue-50 text-blue-700"
                          : "border-gray-100 text-gray-400"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>
              {paymentMethod === "CASH" && (
                <div className="space-y-4">
                  <input
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="w-full text-3xl font-black p-4 border-2 border-gray-100 rounded-xl focus:border-blue-600 outline-none text-center"
                    placeholder="EFECTIVO RECIBIDO"
                    autoFocus
                  />
                  <div className="flex justify-between items-center bg-gray-50 p-4 rounded-xl">
                    <span className="font-bold text-gray-400">CAMBIO:</span>
                    <span className="text-3xl font-black text-green-600">
                      ${change.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}
              <button
                onClick={handleProcessPayment}
                disabled={
                  isSubmitting ||
                  (paymentMethod === "CASH" &&
                    (!receivedAmount ||
                      Number(receivedAmount) < checkoutOrder.total))
                }
                className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-xl disabled:opacity-50 transition-all"
              >
                {isSubmitting ? "PROCESANDO..." : "REGISTRAR PAGO E IMPRIMIR"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
