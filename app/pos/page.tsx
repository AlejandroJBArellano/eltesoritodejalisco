"use client";

import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { OrderTicket } from "@/components/pos/OrderTicket";
import { OrderWithDetails, PaymentMethod } from "@/types";

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
  const [statusDrafts, setStatusDrafts] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Checkout State
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [showTicket, setShowTicket] = useState(false);

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
    state.items.forEach((item, index) => {
      if (!item.menuItemId) errors[`item-${index}-menu`] = "Selecciona un producto";
      const qty = Number(item.quantity);
      if (!Number.isFinite(qty) || qty <= 0) errors[`item-${index}-quantity`] = "Cantidad inválida";
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
      if (!response.ok) throw new Error(data?.error || "No se pudo crear la orden");
      await fetchOrders();
      resetForm();
      setErrorMessage(null);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
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
          receivedAmount: paymentMethod === "CASH" ? Number(receivedAmount) : checkoutOrder.total,
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

  const updateStatus = async (orderId: string) => {
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/orders/${orderId}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: statusDrafts[orderId] || "PENDING" }),
      });
      if (!response.ok) throw new Error("No se pudo actualizar el estado");
      await fetchOrders();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  const deleteOrder = async (orderId: string) => {
    if (!window.confirm("¿Eliminar esta orden?")) return;
    try {
      setIsSubmitting(true);
      const response = await fetch("/api/orders", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: orderId }),
      });
      if (!response.ok) throw new Error("No se pudo eliminar");
      await fetchOrders();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link href="/" className="text-sm text-blue-600 hover:text-blue-800">
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-gray-900">Punto de Venta</h1>
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
          {/* Formulario de Nueva Orden (se mantiene igual pero con estilos mejorados) */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Nueva orden</h2>
            <form onSubmit={handleSubmit} className="grid gap-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <label className="text-sm font-medium text-gray-700">Cliente</label>
                  <select
                    value={formState.customerId}
                    onChange={(e) => handleFormChange("customerId", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Sin cliente</option>
                    {customers.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-700">Fuente</label>
                  <select
                    value={formState.source}
                    onChange={(e) => handleFormChange("source", e.target.value)}
                    className="mt-1 w-full rounded-lg border border-gray-300 px-3 py-2 text-sm"
                  >
                    <option value="">Selecciona una fuente</option>
                    {SOURCE_OPTIONS.map((s) => <option key={s} value={s}>{s}</option>)}
                  </select>
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
                  <button type="button" onClick={addItemRow} className="text-sm text-blue-600 font-bold">+ Añadir</button>
                </div>
                {formState.items.map((item, index) => (
                  <div key={index} className="flex gap-2 items-start">
                    <select
                      value={item.menuItemId}
                      onChange={(e) => handleItemChange(index, "menuItemId", e.target.value)}
                      className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm"
                    >
                      <option value="">Producto</option>
                      {availableMenuItems.map((m) => <option key={m.id} value={m.id}>{m.name} (${m.price})</option>)}
                    </select>
                    <input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => handleItemChange(index, "quantity", e.target.value)}
                      className="w-16 rounded-lg border border-gray-300 px-2 py-2 text-sm text-center"
                    />
                    <button type="button" onClick={() => removeItemRow(index)} className="text-red-500">✕</button>
                  </div>
                ))}
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-lg bg-green-600 py-3 text-white font-bold hover:bg-green-700 transition-colors"
              >
                {isSubmitting ? "Procesando..." : "GUARDAR ORDEN"}
              </button>
            </form>
          </div>

          <div className="rounded-lg bg-white p-6 shadow-md h-fit">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Resumen de Hoy</h2>
            <div className="space-y-2 text-sm text-gray-600">
              <div className="flex justify-between"><span>Órdenes activas:</span><span className="font-bold text-gray-900">{orders.filter(o => o.status !== 'PAID' && o.status !== 'CANCELLED').length}</span></div>
              <div className="flex justify-between"><span>Ventas procesadas:</span><span className="font-bold text-green-600">{orders.filter(o => o.status === 'PAID').length}</span></div>
            </div>
          </div>
        </section>

        <section className="rounded-lg bg-white p-6 shadow-md overflow-hidden">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">Gestión de Cuentas</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50 text-gray-500 uppercase text-xs">
                <tr>
                  <th className="px-4 py-3">Orden</th>
                  <th className="px-4 py-3">Mesa</th>
                  <th className="px-4 py-3">Estado</th>
                  <th className="px-4 py-3">Total</th>
                  <th className="px-4 py-3">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.map((order) => (
                  <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-4 font-bold text-gray-900">#{order.orderNumber}</td>
                    <td className="px-4 py-4 text-gray-600">{order.table || "—"}</td>
                    <td className="px-4 py-4">
                      <span className={`px-2 py-1 rounded-full text-[10px] font-bold ${
                        order.status === 'PAID' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                      }`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="px-4 py-4 font-bold text-gray-900">${order.total.toFixed(2)}</td>
                    <td className="px-4 py-4 flex gap-2">
                      {order.status !== 'PAID' && order.status !== 'CANCELLED' && (
                        <button
                          onClick={() => {
                            setCheckoutOrder(order);
                            setReceivedAmount("");
                            setShowTicket(false);
                          }}
                          className="bg-blue-600 text-white px-3 py-1.5 rounded-md text-xs font-bold hover:bg-blue-700"
                        >
                          COBRAR
                        </button>
                      )}
                      <button
                        onClick={() => {
                          setCheckoutOrder(order);
                          setShowTicket(true);
                        }}
                        className="border border-gray-300 text-gray-600 px-3 py-1.5 rounded-md text-xs font-bold hover:bg-gray-100"
                      >
                        TICKET
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* Modal de Checkout */}
      {checkoutOrder && !showTicket && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-md w-full p-6 shadow-2xl">
            <div className="flex justify-between items-center mb-6">
              <h3 className="text-xl font-bold">Cobrar Orden #{checkoutOrder.orderNumber}</h3>
              <button onClick={() => setCheckoutOrder(null)} className="text-gray-400 hover:text-gray-600 text-2xl">✕</button>
            </div>

            <div className="space-y-6">
              <div className="text-center bg-blue-50 py-4 rounded-lg">
                <p className="text-gray-600 text-sm">TOTAL A PAGAR</p>
                <p className="text-4xl font-black text-blue-700">${checkoutOrder.total.toFixed(2)}</p>
              </div>

              <div>
                <label className="text-xs font-bold text-gray-500 block mb-2">MÉTODO DE PAGO</label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() => setPaymentMethod(m.value)}
                      className={`py-2 text-xs rounded-lg font-bold border-2 transition-all ${
                        paymentMethod === m.value ? 'border-blue-600 bg-blue-50 text-blue-700' : 'border-gray-100 text-gray-400'
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod === "CASH" && (
                <div className="space-y-4">
                  <div>
                    <label className="text-xs font-bold text-gray-500 block mb-2">RECIBIDO</label>
                    <input
                      type="number"
                      value={receivedAmount}
                      onChange={(e) => setReceivedAmount(e.target.value)}
                      className="w-full text-2xl font-bold p-3 border-2 border-gray-200 rounded-lg focus:border-blue-600 outline-none"
                      placeholder="0.00"
                      autoFocus
                    />
                  </div>
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg">
                    <span className="font-bold text-gray-500">CAMBIO:</span>
                    <span className="text-2xl font-black text-green-600">${change.toFixed(2)}</span>
                  </div>
                </div>
              )}

              <button
                onClick={handleProcessPayment}
                disabled={isSubmitting || (paymentMethod === 'CASH' && (!receivedAmount || Number(receivedAmount) < checkoutOrder.total))}
                className="w-full bg-blue-600 text-white py-4 rounded-xl font-black text-lg hover:bg-blue-700 disabled:opacity-50 transition-all shadow-lg"
              >
                {isSubmitting ? "PROCESANDO..." : "COMPLETAR PAGO"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Ticket / Impresión */}
      {showTicket && checkoutOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="max-w-md w-full space-y-4 py-8">
            <div className="flex justify-end gap-2 no-print">
              <button
                onClick={() => window.print()}
                className="bg-green-600 text-white px-4 py-2 rounded-lg font-bold"
              >
                🖨️ IMPRIMIR
              </button>
              <button
                onClick={() => {
                  setCheckoutOrder(null);
                  setShowTicket(false);
                }}
                className="bg-white text-black px-4 py-2 rounded-lg font-bold"
              >
                CERRAR
              </button>
            </div>
            <OrderTicket order={checkoutOrder} />
          </div>
        </div>
      )}
    </div>
  );
}
