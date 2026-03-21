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
  category?: string;
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
  items: [],
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

  // Category tab state
  const [activeCategory, setActiveCategory] = useState<string>("");

  // Checkout & Print State
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [showTicket, setShowTicket] = useState(false);
  const [showKitchenTicket, setShowKitchenTicket] = useState(false);
  const [tipType, setTipType] = useState<"NONE" | "PERCENTAGE" | "FIXED">("NONE");
  const [tipInput, setTipInput] = useState<string>("");
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");
  // Edit Order State (add items)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [additionalItems, setAdditionalItems] = useState<OrderItemDraft[]>([
    { menuItemId: "", quantity: "1", notes: "" },
  ]);
  const [showNotesInput, setShowNotesInput] = useState(false);

  // Modify Order State (edit/remove existing items)
  type ModifyItem = {
    id: string;
    menuItemId: string;
    quantity: number;
    unitPrice: number;
    menuItemName: string;
  };
  const [modifyingOrder, setModifyingOrder] = useState<Order | null>(null);
  const [modifyItems, setModifyItems] = useState<ModifyItem[]>([]);

  const availableMenuItems = useMemo(
    () => menuItems.filter((item) => item.isAvailable),
    [menuItems],
  );

  const categories = useMemo(() => {
    const cats = new Set(availableMenuItems.map(m => (m.category || "OTROS").toUpperCase()));
    return Array.from(cats);
  }, [availableMenuItems]);

  // NEW: Calculate next folio for display
  const nextFolioDisplay = useMemo(() => {
    const todayDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const sortedOrders = [...orders].filter(o => {
      const orderDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(o.createdAt));
      return orderDate === todayDateStr;
    });

    if (sortedOrders.length === 0) return "001";
    const lastNum = Math.max(...sortedOrders.map(o => parseInt(o.orderNumber || "0")));
    return (lastNum + 1).toString().padStart(3, "0");
  }, [orders]);

  useEffect(() => {
    if (categories.length > 0 && (!activeCategory || !categories.includes(activeCategory))) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  // Default source to avoid friction
  useEffect(() => {
    if (!formState.source) {
      setFormState(prev => ({ ...prev, source: "Otro" }));
    }
  }, []);

  const fetchMenu = async () => {
    const response = await fetch("/api/menu");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar menú");
    setMenuItems(
      (data.items || []).map((item: any) => ({
        ...item,
        category: item.category,
        isAvailable: item.is_available,
      }))
    );
  };

  const fetchCustomers = async () => {
    const response = await fetch("/api/customers");
    const data = await response.json();
    if (!response.ok)
      throw new Error(data?.error || "Error al cargar clientes");
    setCustomers(data.customers || []);
  };

  const mapOrderData = (dbOrder: any): Order => {
    return {
      ...dbOrder,
      orderNumber: dbOrder.order_number,
      customerId: dbOrder.customer_id,
      createdAt: dbOrder.created_at ? (dbOrder.created_at.includes('Z') || dbOrder.created_at.includes('+') ? dbOrder.created_at : `${dbOrder.created_at.replace(' ', 'T')}Z`) : dbOrder.created_at,
      updatedAt: dbOrder.updated_at ? (dbOrder.updated_at.includes('Z') || dbOrder.updated_at.includes('+') ? dbOrder.updated_at : `${dbOrder.updated_at.replace(' ', 'T')}Z`) : dbOrder.updated_at,
      orderItems: Array.isArray(dbOrder.order_items)
        ? dbOrder.order_items.map((item: any) => ({
          ...item,
          orderId: item.order_id,
          menuItemId: item.menu_item_id,
          unitPrice: item.unit_price,
          menuItem: item.menu_items
            ? {
              ...item.menu_items,
              imageUrl: item.menu_items?.image_url,
              isAvailable: item.menu_items?.is_available,
            }
            : { name: "Producto", price: item.unit_price || 0 },
        }))
        : [],
      payments: Array.isArray(dbOrder.payments)
        ? dbOrder.payments.map((p: any) => ({
          ...p,
          orderId: p.order_id,
          tipAmount: p.tip_amount
        }))
        : [],
      customer: dbOrder.customers || dbOrder.customer || undefined,
    } as Order;
  };

  const fetchOrders = async () => {
    const response = await fetch("/api/orders");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar órdenes");
    const mappedOrders = (data.orders || []).map(mapOrderData);
    setOrders(mappedOrders);
    return mappedOrders;
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

  useEffect(() => {
    if (availableMenuItems.length > 0) {
      setFormState((prev) => {
        if (prev.items.length === 1 && prev.items[0].menuItemId === "") {
          const nextItems = [...prev.items];
          nextItems[0] = { ...nextItems[0], menuItemId: availableMenuItems[0].id };
          return { ...prev, items: nextItems };
        }
        return prev;
      });

      setAdditionalItems((prev) => {
        if (prev.length === 1 && prev[0].menuItemId === "") {
          const nextItems = [...prev];
          nextItems[0] = { ...nextItems[0], menuItemId: availableMenuItems[0].id };
          return nextItems;
        }
        return prev;
      });
    }
  }, [availableMenuItems]);

  const tipAmountCalculated = useMemo(() => {
    if (!checkoutOrder) return 0;
    if (tipType === "PERCENTAGE") {
      return (checkoutOrder.total * (Number(tipInput) || 0)) / 100;
    }
    if (tipType === "FIXED") {
      return Number(tipInput) || 0;
    }
    return 0;
  }, [checkoutOrder, tipType, tipInput]);

  const change = useMemo(() => {
    if (!checkoutOrder || !receivedAmount) return 0;
    const diff = Number(receivedAmount) - (checkoutOrder.total + tipAmountCalculated);
    return diff > 0 ? diff : 0;
  }, [checkoutOrder, receivedAmount, tipAmountCalculated]);

  const handleFormChange = (field: keyof OrderFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleGridItemClick = (menuItem: MenuItem) => {
    setFormState((prev) => {
      const existingIndex = prev.items.findIndex((item) => item.menuItemId === menuItem.id);
      if (existingIndex >= 0) {
        const nextItems = [...prev.items];
        nextItems[existingIndex] = {
          ...nextItems[existingIndex],
          quantity: (Number(nextItems[existingIndex].quantity) + 1).toString(),
        };
        return { ...prev, items: nextItems };
      }
      return {
        ...prev,
        items: [...prev.items, { menuItemId: menuItem.id, quantity: "1", notes: "" }],
      };
    });
  };

  const handleQuantityChange = (index: number, delta: number) => {
    setFormState((prev) => {
      const nextItems = [...prev.items];
      const newQuantity = Number(nextItems[index].quantity) + delta;
      if (newQuantity <= 0) {
        if (window.confirm("¿Seguro que deseas eliminar el producto?")) {
          return { ...prev, items: nextItems.filter((_, idx) => idx !== index) };
        } else {
          return prev;
        }
      }
      nextItems[index] = { ...nextItems[index], quantity: newQuantity.toString() };
      return { ...prev, items: nextItems };
    });
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

  const removeItemRow = (index: number) => {
    setFormState((prev) => ({
      ...prev,
      items: prev.items.filter((_, idx) => idx !== index),
    }));
  };

  const handleClearCart = () => {
    if (window.confirm("¿Seguro que deseas vaciar todo el carrito?")) {
      setFormState((prev) => ({ ...prev, items: [] }));
    }
  };

  const validateForm = (state: OrderFormState) => {
    const errors: Record<string, string> = {};
    if (!state.source) errors.source = "Selecciona una fuente";
    if (!state.items.length) errors.items = "Agrega al menos un producto";
    return errors;
  };

  const generateWhatsAppMessage = () => {
    if (!checkoutOrder) return "";
    let msg = `¡Gracias por tu visita a El Tesorito de Jalisco! 🌮🤩\n\n`;
    msg += `🧾 *Ticket #${checkoutOrder.orderNumber}*\n`;
    if (checkoutOrder.table) {
      msg += `📍 Mesa: ${checkoutOrder.table}\n`;
    }
    msg += `\n*Resumen de tu orden:*\n`;
    checkoutOrder.orderItems?.forEach((item: any) => {
      const quantity = item.quantity || 1;
      const itemName = item.menuItem?.name || "Producto";
      const itemPrice = item.unitPrice || 0;
      msg += `▪ ${quantity}x ${itemName} - $${(itemPrice * quantity).toFixed(2)}\n`;
    });

    // Add tips if available
    const tipAmount = checkoutOrder.payments && checkoutOrder.payments.length > 0 && checkoutOrder.payments[0].tipAmount ? checkoutOrder.payments[0].tipAmount : 0;

    msg += `\n*Total Pagado: $${(checkoutOrder.total + tipAmount).toFixed(2)}*\n`;
    if (tipAmount > 0) {
      msg += `(Incluye propina: $${tipAmount.toFixed(2)})\n`;
    }
    msg += `\n¡Esperamos verte pronto! 🌶️`;
    return encodeURIComponent(msg);
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
      setCheckoutOrder(mapOrderData(data.order));
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
              : checkoutOrder.total + tipAmountCalculated,
          change: paymentMethod === "CASH" ? change : 0,
          tipAmount: tipAmountCalculated,
        }),
      });
      if (!response.ok) throw new Error("Error al procesar el pago");
      const updatedOrders = await fetchOrders();
      const updatedOrder = updatedOrders.find((o: Order) => o.id === checkoutOrder.id) || checkoutOrder;
      setCheckoutOrder(updatedOrder);
      setShowTicket(true);
    } catch (error) {
      alert("Error al procesar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFailedPayment = async (orderToProcess?: Order) => {
    const order = orderToProcess || checkoutOrder;
    if (!order) return;

    if (!window.confirm(`¿Seguro que deseas marcar la orden #${order.orderNumber} como PAGO FALLIDO? Esto la quitará de ventas exitosas y la mandará a pérdidas.`)) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "UNCOLLECTED",
        }),
      });

      if (!response.ok) throw new Error("Error al marcar como pago fallido");

      await fetchOrders();
      if (!orderToProcess) setCheckoutOrder(null);
      alert("Orden marcada como 'No Cobrada' exitosamente.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al procesar");
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
      setAdditionalItems([{ menuItemId: availableMenuItems[0]?.id || "", quantity: "1", notes: "" }]);

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
      { menuItemId: availableMenuItems[0]?.id || "", quantity: "1", notes: "" },
    ]);
  };

  const removeAdditionalItemRow = (index: number) => {
    setAdditionalItems((prev) => prev.filter((_, idx) => idx !== index));
  };

  const openModifyModal = (order: Order) => {
    setModifyingOrder(order);
    setModifyItems(
      (order.orderItems || []).map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice,
        menuItemName: item.menuItem?.name || "Producto",
      })),
    );
  };

  const handleModifyQuantityChange = (index: number, delta: number) => {
    setModifyItems((prev) => {
      const next = [...prev];
      const newQty = next[index].quantity + delta;
      if (newQty <= 0) {
        if (window.confirm("¿Seguro que deseas eliminar este producto?")) {
          return next.filter((_, idx) => idx !== index);
        }
        return prev;
      }
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
  };

  const handleModifyRemoveItem = (index: number) => {
    if (window.confirm("¿Seguro que deseas eliminar este producto?")) {
      setModifyItems((prev) => prev.filter((_, idx) => idx !== index));
    }
  };

  const handleSaveModifiedOrder = async () => {
    if (!modifyingOrder) return;
    if (modifyItems.length === 0) {
      alert("La orden debe tener al menos un producto.");
      return;
    }
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/orders/${modifyingOrder.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: modifyItems.map((item) => ({
            id: item.id,
            quantity: item.quantity,
          })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.error || "Error al modificar orden");
      await fetchOrders();
      setModifyingOrder(null);
      setModifyItems([]);
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al modificar orden");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    if (
      !window.confirm(
        `¿Seguro que deseas cancelar la orden #${orderNumber}? Esta acción no se puede deshacer.`,
      )
    )
      return;
    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Error al cancelar orden");
      }
      await fetchOrders();
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al cancelar orden");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-dark">
      <header className="bg-[#242424] shadow-sm no-print">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <div>
            <Link
              href="/"
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              ← Dashboard
            </Link>
            <h1 className="text-2xl font-bold text-text-light">Punto de Venta</h1>
          </div>
          <div className="flex items-center gap-4">
             <div className="bg-[#181818] px-6 py-2 rounded-2xl border-2 border-primary shadow-lg shadow-primary/20">
                <span className="text-[10px] font-black text-primary uppercase block tracking-widest leading-none mb-1">Próximo Folio</span>
                <span className="text-2xl font-black text-white font-mono">#{nextFolioDisplay}</span>
             </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8 no-print">
        {errorMessage && (
          <div className="mb-6 rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">

            {/* COLUMNA IZQUIERDA: Menú (PRIODIDAD) */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">

              {/* Selector de Productos */}
              <section className="rounded-2xl bg-[#242424] p-5 shadow-md border border-white/5">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-black text-text-light flex items-center gap-2 uppercase tracking-tighter">
                    <span className="text-primary">🌮</span> Seleccionar Productos
                  </h2>
                </div>

                <div className="flex gap-2 overflow-x-auto pb-4 no-scrollbar">
                  {categories.map(cat => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setActiveCategory(cat)}
                      className={`px-5 py-2.5 rounded-xl font-black whitespace-nowrap transition-all text-xs border-2 ${activeCategory === cat
                        ? "bg-primary text-dark border-primary shadow-lg shadow-primary/10"
                        : "bg-[#181818] text-gray-500 border-gray-800 hover:border-gray-600"
                        }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                  {availableMenuItems
                    .filter(m => (m.category || "OTROS").toUpperCase() === activeCategory)
                    .map(m => {
                      let colorClass = "bg-[#FFB7CE] hover:bg-[#FFD1DC] text-[#121212] border-[#FFD1DC]";
                      if (activeCategory === "BEBIDAS") colorClass = "bg-rose-400 hover:bg-rose-300 text-white border-rose-500";
                      else if (activeCategory === "POSTRES" || activeCategory === "EXTRAS") colorClass = "bg-fuchsia-400 hover:bg-fuchsia-300 text-white border-fuchsia-500";

                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleGridItemClick(m)}
                          className={`p-3 rounded-2xl flex flex-col items-center justify-center text-center h-28 border-b-4 active:border-b-0 active:translate-y-1 transition-all shadow-lg ${colorClass}`}
                        >
                          <span className="font-extrabold text-[12px] leading-tight line-clamp-2 uppercase">{m.name}</span>
                          <span className="font-black mt-1 text-base">${m.price.toFixed(2)}</span>
                        </button>
                      );
                    })}
                </div>
              </section>

              {/* Configuración de la Orden (Secundaria / Opcional) */}
              <section className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 opacity-80 hover:opacity-100 transition-opacity">
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-bold text-gray-400 uppercase tracking-widest flex items-center gap-2">
                    <span className="grayscale">📋</span> Detalles Adicionales
                    </h2>
                    <div className="flex items-center gap-4">
                        <button 
                            type="button"
                            onClick={() => handleFormChange("table", formState.table === "Domicilio" ? "" : "Domicilio")}
                            className={`px-4 py-1.5 rounded-lg text-xs font-black transition-all border-2 ${formState.table === "Domicilio" 
                                ? "bg-amber-500 border-amber-500 text-dark" 
                                : "bg-[#181818] border-gray-800 text-gray-500 hover:border-gray-600"}`}
                        >
                            🛵 DOMICILIO
                        </button>
                    </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3 mb-4">
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Cliente</label>
                    <select
                      value={formState.customerId}
                      onChange={(e) => handleFormChange("customerId", e.target.value)}
                      className="w-full rounded-xl border border-gray-800 bg-[#181818] px-3 py-2 text-xs text-gray-300 outline-none focus:border-primary transition-all"
                    >
                      <option value="">General</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>{c.name}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Origen</label>
                    <select
                      value={formState.source}
                      onChange={(e) => handleFormChange("source", e.target.value)}
                      className="w-full rounded-xl border border-gray-800 bg-[#181818] px-3 py-2 text-xs text-gray-300 outline-none focus:border-primary transition-all"
                    >
                      {SOURCE_OPTIONS.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-gray-500 uppercase tracking-wider mb-1 block">Notas / Mesa Esp.</label>
                    <input
                      type="text"
                      value={formState.notes}
                      onChange={(e) => handleFormChange("notes", e.target.value)}
                      className="rounded-xl border border-gray-800 bg-[#181818] px-3 py-2 text-xs text-gray-300 w-full focus:border-primary outline-none transition-all"
                      placeholder="Ej. Mesa 7, Ventana..."
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* COLUMNA DERECHA: Carrito y Resumen (Sticky en Desktop) */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-6">

              {/* Detalle del Pedido */}
              <section className="rounded-2xl bg-[#181818] border border-gray-800 p-5 shadow-xl">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-base font-black uppercase text-gray-400 tracking-widest">Tu Pedido</h3>
                  {formState.items.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-[10px] font-bold text-red-500 uppercase hover:underline"
                    >
                      Vaciar
                    </button>
                  )}
                </div>

                {formErrors.items && (
                  <p className="text-xs text-red-500 font-bold mb-4 bg-red-500/10 p-2 rounded-lg border border-red-500/20 text-center">
                    ⚠️ {formErrors.items}
                  </p>
                )}

                <div className="space-y-3 max-h-[40vh] overflow-y-auto pr-1 custom-scrollbar">
                  {formState.items.length === 0 ? (
                    <div className="text-center py-12 text-gray-500">
                      <p className="text-4xl mb-3 opacity-20">🛒</p>
                      <p className="text-sm font-bold opacity-40 uppercase tracking-tighter">El carrito está vacío</p>
                    </div>
                  ) : (
                    formState.items.map((item, index) => {
                      const product = availableMenuItems.find(m => m.id === item.menuItemId);
                      return (
                        <div key={index} className="flex gap-3 items-center bg-[#242424] p-3 rounded-xl border border-white/5 shadow-sm group">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-gray-200 text-sm leading-tight truncate uppercase">{product?.name || "Producto"}</p>
                            <p className="text-[10px] font-bold text-gray-500 mt-0.5">${product?.price.toFixed(2)} c/u</p>
                          </div>
                          <div className="flex items-center gap-1.5 bg-dark rounded-lg p-1 border border-white/5">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(index, -1)}
                              className="w-7 h-7 rounded-md hover:bg-red-500/20 text-gray-400 hover:text-red-500 flex items-center justify-center font-black transition-all"
                            >
                              -
                            </button>
                            <span className="w-5 text-center font-black text-text-light text-sm">{item.quantity}</span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(index, 1)}
                              className="w-7 h-7 rounded-md hover:bg-green-500/20 text-gray-400 hover:text-green-500 flex items-center justify-center font-black transition-all"
                            >
                              +
                            </button>
                          </div>
                          <div className="text-right flex flex-col items-end min-w-[60px]">
                            <p className="font-black text-primary text-sm">
                              ${((product?.price || 0) * Number(item.quantity)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {formState.items.length > 0 && (
                  <div className="mt-6 pt-5 border-t border-dashed border-gray-700 space-y-4">
                    <div className="flex justify-between items-end">
                      <span className="font-bold text-gray-500 uppercase tracking-widest text-[10px]">Total a pagar</span>
                      <span className="text-4xl font-black text-primary tabular-nums">
                        ${formState.items.reduce((total, item) => {
                          const product = availableMenuItems.find(m => m.id === item.menuItemId);
                          return total + (product?.price || 0) * Number(item.quantity);
                        }, 0).toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-2xl bg-success py-4 text-white font-black text-lg hover:brightness-110 active:scale-[0.98] transition-all shadow-lg shadow-success/20 disabled:opacity-50 uppercase"
                    >
                      {isSubmitting ? "GUARDANDO..." : "GUARDAR E IMPRIMIR"}
                    </button>
                  </div>
                )}
              </section>
              {/* Resumen Diario (También a la derecha) */}
              <section className="rounded-2xl bg-[#242424] p-5 border border-white/5">
                <h3 className="text-xs font-black uppercase text-gray-500 mb-4 tracking-widest">Estadísticas de Hoy</h3>
                {(() => {
                  const todayDateStr = new Intl.DateTimeFormat("en-CA", {
                    timeZone: "America/Mexico_City",
                    year: "numeric",
                    month: "2-digit",
                    day: "2-digit",
                  }).format(new Date());

                  const todayOrders = orders.filter((o) => {
                    const orderDate = new Intl.DateTimeFormat("en-CA", {
                      timeZone: "America/Mexico_City",
                      year: "numeric",
                      month: "2-digit",
                      day: "2-digit",
                    }).format(new Date(o.createdAt));
                    return orderDate === todayDateStr;
                  });

                  return (
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-[#181818] p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Órdenes</p>
                        <p className="text-xl font-black text-text-light">{todayOrders.length}</p>
                      </div>
                      <div className="bg-[#181818] p-3 rounded-xl border border-white/5">
                        <p className="text-[10px] font-bold text-gray-500 uppercase">Ventas</p>
                        <p className="text-xl font-black text-success">
                          ${todayOrders.filter((o) => o.status === "PAID" || o.status === "DELIVERED").reduce((acc, o) => acc + o.total, 0).toFixed(2)}
                        </p>
                      </div>
                    </div>
                  );
                })()}
              </section>
            </div>
          </div>
        </form>

        {/* Listado de Órdenes Recientes */}
        <section className="mt-12 rounded-2xl bg-[#242424] p-5 shadow-md border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between mb-6 px-1">
            <h2 className="text-lg font-bold text-text-light flex items-center gap-2">
              <span className="text-primary">🕒</span> Últimas Órdenes
            </h2>
            <Link href="/history" className="text-xs font-bold text-primary hover:underline uppercase tracking-tighter">Ver todo</Link>
          </div>

          <div className="overflow-x-auto -mx-5 px-5 no-scrollbar">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-800">
                  <th className="pb-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">#</th>
                  <th className="pb-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Mesa</th>
                  <th className="pb-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest">Total</th>
                  <th className="pb-4 px-2 text-[10px] font-black text-gray-500 uppercase tracking-widest text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800/50">
                {orders.slice(0, 10).map((order) => (
                  <tr key={order.id} className="hover:bg-white/5 transition-colors">
                    <td className="py-4 px-2">
                      <span className="font-bold text-text-light text-sm">#{order.orderNumber}</span>
                    </td>
                    <td className="py-4 px-2">
                      <span className="text-xs bg-gray-800 px-2 py-1 rounded-md text-gray-300 font-bold">{order.table || "Llevar"}</span>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex flex-col">
                        <span className="font-black text-sm text-text-light">${order.total.toFixed(2)}</span>
                        {order.payments?.[0]?.tipAmount ? (
                          <span className="text-[9px] font-bold text-blue-400">
                            +${order.payments[0].tipAmount.toFixed(2)} propina
                          </span>
                        ) : null}
                      </div>
                    </td>
                    <td className="py-4 px-2">
                      <div className="flex justify-end gap-1.5 flex-wrap max-w-[240px] ml-auto">
                        {order.status !== "PAID" && (
                          <button
                            onClick={() => {
                              setCheckoutOrder(order);
                              setShowTicket(false);
                              setShowKitchenTicket(false);
                              setTipType("NONE");
                              setTipInput("");
                              setPaymentMethod("CASH");
                              setReceivedAmount("");
                            }}
                            className="bg-blue-600 hover:bg-blue-500 text-white p-2 rounded-lg text-[10px] font-black uppercase shadow-sm"
                            title="COBRAR"
                          >
                            💰 Cobrar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setCheckoutOrder(order);
                            setShowKitchenTicket(true);
                            setShowTicket(false);
                          }}
                          className="bg-orange-500 hover:bg-orange-400 text-white p-2 rounded-lg text-[10px] font-black uppercase"
                          title="COMANDA"
                        >
                          👨‍🍳 Comanda
                        </button>
                        {order.status !== "PAID" && (
                          <button
                            onClick={() => setEditingOrder(order)}
                            className="bg-purple-600 hover:bg-purple-500 text-white p-2 rounded-lg text-[10px] font-black uppercase"
                            title="AGREGAR"
                          >
                            ➕ Agregar
                          </button>
                        )}
                        {order.status !== "PAID" && (
                          <button
                            onClick={() => openModifyModal(order)}
                            className="bg-amber-500 hover:bg-amber-400 text-dark p-2 rounded-lg text-[10px] font-black uppercase"
                            title="MODIFICAR"
                          >
                            ✏️ Modificar
                          </button>
                        )}
                        <button
                          onClick={() => {
                            setCheckoutOrder(order);
                            setShowTicket(true);
                            setShowKitchenTicket(false);
                          }}
                          className="bg-gray-700 hover:bg-gray-600 text-white p-2 rounded-lg text-[10px] font-black uppercase"
                          title="TICKET"
                        >
                          📄 Ticket
                        </button>
                        {order.status !== "PAID" && order.status !== "UNCOLLECTED" && (
                          <button
                            onClick={() => handleCancelOrder(order.id, order.orderNumber)}
                            disabled={isSubmitting}
                            className="bg-red-600/20 hover:bg-red-600/40 text-red-500 p-2 rounded-lg text-[10px] font-black uppercase border border-red-500/20"
                            title="CANCELAR"
                          >
                            🚫
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODAL DE AGREGAR PRODUCTOS */}
      {
        editingOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
            <div className="bg-[#242424] rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-text-light">
                  Agregar Productos a Orden #{editingOrder.orderNumber}
                </h3>
                <button
                  onClick={() => setEditingOrder(null)}
                  className="text-gray-400 hover:text-gray-400"
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
                    className="w-full bg-gray-200 text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-300 transition-colors"
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
        )
      }

      {/* MODAL DE MODIFICAR ORDEN */}
      {
        modifyingOrder && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
            <div className="bg-[#242424] rounded-2xl max-w-md w-full p-6 shadow-2xl max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-text-light">
                  ✏️ Modificar Orden #{modifyingOrder.orderNumber}
                </h3>
                <button
                  onClick={() => { setModifyingOrder(null); setModifyItems([]); }}
                  className="text-gray-400 hover:text-gray-200"
                >
                  ✕
                </button>
              </div>

              <div className="space-y-3 mb-6">
                {modifyItems.length === 0 && (
                  <p className="text-center text-gray-400 py-4">
                    No quedan productos. Cancela esta orden desde la lista o agrega más productos con el botón AGREGAR.
                  </p>
                )}
                {modifyItems.map((item, index) => (
                  <div
                    key={item.id}
                    className="flex gap-3 items-center bg-[#181818] p-3 rounded-2xl border border-gray-700"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-gray-300 text-base leading-tight truncate">
                        {item.menuItemName}
                      </p>
                      <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                        ${item.unitPrice.toFixed(2)} c/u
                      </p>
                    </div>
                    <div className="flex items-center gap-1 bg-[#242424] rounded-xl p-1">
                      <button
                        type="button"
                        onClick={() => handleModifyQuantityChange(index, -1)}
                        className="w-8 h-8 rounded-lg hover:bg-[#181818] flex items-center justify-center font-black text-gray-400 text-lg transition-all"
                      >
                        -
                      </button>
                      <span className="w-6 text-center font-black text-text-light text-lg">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleModifyQuantityChange(index, 1)}
                        className="w-8 h-8 rounded-lg hover:bg-[#181818] flex items-center justify-center font-black text-gray-400 text-lg transition-all"
                      >
                        +
                      </button>
                    </div>
                    <div className="flex flex-col items-end gap-1 w-20">
                      <p className="font-black text-blue-500 text-lg">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </p>
                      <button
                        type="button"
                        onClick={() => handleModifyRemoveItem(index)}
                        className="text-red-500 hover:text-red-400 text-base"
                        title="Eliminar producto"
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {modifyItems.length > 0 && (
                <div className="border-t-2 border-dashed border-gray-700 pt-4 mb-6 flex justify-between items-center">
                  <span className="font-black text-gray-400 uppercase tracking-widest text-sm">
                    Nuevo Total
                  </span>
                  <span className="text-3xl font-black text-blue-500">
                    $
                    {modifyItems
                      .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
                      .toFixed(2)}
                  </span>
                </div>
              )}

              <div className="flex gap-4">
                <button
                  type="button"
                  onClick={() => { setModifyingOrder(null); setModifyItems([]); }}
                  className="w-full bg-gray-700 text-gray-300 py-3 rounded-lg font-bold hover:bg-gray-600 transition-colors"
                >
                  CANCELAR
                </button>
                <button
                  type="button"
                  onClick={handleSaveModifiedOrder}
                  disabled={isSubmitting || modifyItems.length === 0}
                  className="w-full bg-yellow-500 text-dark py-3 rounded-lg font-bold hover:bg-yellow-400 transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? "GUARDANDO..." : "GUARDAR CAMBIOS"}
                </button>
              </div>
            </div>
          </div>
        )
      }

      {/* MODALES DE IMPRESIÓN */}
      {
        (showTicket || showKitchenTicket) && checkoutOrder && (
          <div className="fixed inset-0 bg-black/90 flex items-center justify-center p-4 z-50 overflow-y-auto">
            <div className="max-w-md w-full py-10">
              <div className="flex justify-center gap-4 mb-6 no-print">
                <button
                  onClick={() => window.print()}
                  className="bg-green-600 text-white px-6 py-3 rounded-xl font-black shadow-lg"
                >
                  🖨️ IMPRIMIR AHORA
                </button>
                {showTicket && (
                  <button
                    onClick={() => setShowWhatsAppModal(true)}
                    className="bg-green-500 text-white px-6 py-3 rounded-xl font-black shadow-lg flex items-center gap-2 hover:bg-green-400"
                  >
                    <span className="text-xl">📱</span> ENVIAR POR WHATSAPP
                  </button>
                )}
                <button
                  onClick={() => {
                    setCheckoutOrder(null);
                    setShowTicket(false);
                    setShowKitchenTicket(false);
                    setWhatsappNumber("");
                    setShowWhatsAppModal(false);
                  }}
                  className="bg-[#242424] text-white border-2 border-white/10 px-6 py-3 rounded-xl font-black shadow-lg hover:bg-gray-800"
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
        )
      }

      {/* MODAL DE CHECKOUT */}
      {
        checkoutOrder && !showTicket && !showKitchenTicket && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 no-print">
            <div className="bg-[#242424] rounded-2xl max-w-md w-full p-6 shadow-2xl">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-text-light">
                  Cerrar Cuenta #{checkoutOrder.orderNumber}
                </h3>
                <button
                  onClick={() => setCheckoutOrder(null)}
                  className="text-gray-400 hover:text-gray-400"
                >
                  ✕
                </button>
              </div>
              <div className="space-y-6">
                <div className="text-center bg-blue-50 py-6 rounded-2xl">
                  <p className="text-blue-600 text-sm font-bold">TOTAL A PAGAR</p>
                  <p className="text-5xl font-black text-blue-700">
                    ${(checkoutOrder.total + tipAmountCalculated).toFixed(2)}
                  </p>
                  {tipAmountCalculated > 0 && (
                    <p className="text-sm font-bold text-gray-400 mt-2">
                      Incluye ${(tipAmountCalculated).toFixed(2)} de propina
                    </p>
                  )}
                </div>

                <div>
                  <label className="text-xs font-bold text-gray-400 block mb-2 uppercase">
                    Propina
                  </label>
                  <div className="grid grid-cols-3 gap-2 mb-2">
                    <button onClick={() => { setTipType("NONE"); setTipInput(""); }} className={`py-2 text-xs rounded-xl font-bold border-2 transition-all ${tipType === "NONE" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-100 text-gray-400"}`}>Sin propina</button>
                    <button onClick={() => setTipType("PERCENTAGE")} className={`py-2 text-xs rounded-xl font-bold border-2 transition-all ${tipType === "PERCENTAGE" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-100 text-gray-400"}`}>Porcentaje %</button>
                    <button onClick={() => setTipType("FIXED")} className={`py-2 text-xs rounded-xl font-bold border-2 transition-all ${tipType === "FIXED" ? "border-blue-600 bg-blue-50 text-blue-700" : "border-gray-100 text-gray-400"}`}>Monto fijo $</button>
                  </div>
                  {tipType !== "NONE" && (
                    <input
                      type="number"
                      value={tipInput}
                      onChange={(e) => setTipInput(e.target.value)}
                      placeholder={tipType === "PERCENTAGE" ? "% Ej. 10" : "$ Monto"}
                      className="w-full text-lg font-bold p-3 border-2 border-gray-100 rounded-xl focus:border-blue-600 outline-none text-center"
                    />
                  )}
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
                        className={`py-3 text-xs rounded-xl font-black border-2 transition-all ${paymentMethod === m.value
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
                    <div className="flex justify-between items-center bg-[#181818] p-4 rounded-xl">
                      <span className="font-bold text-gray-400">CAMBIO:</span>
                      <span className="text-3xl font-black text-green-600">
                        ${change.toFixed(2)}
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleProcessPayment}
                    disabled={
                      isSubmitting ||
                      (paymentMethod === "CASH" &&
                        (!receivedAmount ||
                          Number(receivedAmount) < (checkoutOrder.total + tipAmountCalculated)))
                    }
                    className="w-full bg-blue-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-blue-700 shadow-xl disabled:opacity-50 transition-all"
                  >
                    {isSubmitting ? "PROCESANDO..." : "REGISTRAR PAGO E IMPRIMIR"}
                  </button>

                  <button
                    onClick={() => handleFailedPayment()}
                    disabled={isSubmitting}
                    className="w-full bg-red-900/20 border-2 border-red-500/30 text-red-500 py-3 rounded-2xl font-black text-sm hover:bg-red-900/40 transition-all uppercase tracking-widest"
                  >
                    ❌ Pago Fallido (Cliente se fue)
                  </button>
                </div>
              </div>
            </div>
          </div>
        )
      }

      {/* MODAL DE WHATSAPP */}
      {
        showWhatsAppModal && checkoutOrder && (
          <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-60 no-print">
            <div className="bg-[#242424] rounded-2xl max-w-sm w-full p-8 shadow-2xl border border-green-500/20">
              <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                  <span className="text-2xl">📱</span> WhatsApp
                </h3>
                <button onClick={() => setShowWhatsAppModal(false)} className="text-gray-400 hover:text-white transition-colors">✕</button>
              </div>
              <p className="text-sm font-medium text-gray-400 mb-6 text-center leading-relaxed">
                Ingresa los 10 dígitos del número (sin código de país).
              </p>
              <input
                type="tel"
                maxLength={10}
                value={whatsappNumber}
                onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ''))}
                placeholder="Ej. 3312345678"
                autoFocus
                className="w-full text-3xl font-black p-4 border-2 border-gray-600 rounded-xl focus:border-green-500 outline-none text-center bg-[#181818] text-white tracking-widest mb-8 transition-all"
              />
              <button
                disabled={whatsappNumber.length !== 10}
                onClick={() => {
                  const url = `https://wa.me/52${whatsappNumber}?text=${generateWhatsAppMessage()}`;

                  // Open WA link
                  window.open(url, "_blank");

                  // Close flow
                  setShowWhatsAppModal(false);
                  setCheckoutOrder(null);
                  setShowTicket(false);
                  setShowKitchenTicket(false);
                  setWhatsappNumber("");
                }}
                className="w-full bg-green-500 text-white py-4 rounded-xl font-black text-xl hover:bg-green-600 disabled:opacity-30 disabled:hover:bg-green-500 transition-all shadow-lg shadow-green-500/20 cursor-pointer"
              >
                ENVIAR TICKET
              </button>
            </div>
          </div>
        )
      }
    </div >
  );
}
