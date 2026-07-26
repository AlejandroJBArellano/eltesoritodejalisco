"use client";

import { FacturacionModal } from "@/components/pos/FacturacionModal";
import { KitchenTicket } from "@/components/pos/KitchenTicket";
import { OrderTicket } from "@/components/pos/OrderTicket";
import { getOrderTipAmount } from "@/components/pos/paymentUtils";
import { SplitBillModal, type SplitPayment } from "@/components/pos/SplitBillModal";
import { OrderWithDetails } from "@/types";
import { PageHeader } from "@/components/PageHeader";
import Link from "next/link";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import {
  Receipt,
  ClipboardList,
  DollarSign,
  BarChart3,
  Search,
  Plus,
  Minus,
  Trash2,
  Edit3,
  Printer,
  MessageCircle,
  ChefHat,
  ArrowLeft,
  X,
  ChevronRight,
  ShoppingBag,
  Undo2,
  HandCoins,
  Bike,
  Users,
  UtensilsCrossed,
  FileText,
  CreditCard,
  Wallet,
  AlertTriangle,
  Send,
  Ban,
  Tag,
  CheckSquare,
} from "lucide-react";

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

// ── Orden Mixta ──────────────────────────────────────────────────
const MIXED_ORDER_KEYWORD = "orden mixta";
const MIXED_ORDER_TOTAL = 3;
const MIXED_ORDER_FLAVORS = ["Carnitas", "Birria", "Pastor", "Jamaica"] as const;
type MixedFlavor = (typeof MIXED_ORDER_FLAVORS)[number];

const isMixedOrderItem = (name: string) =>
  name.toLowerCase().includes(MIXED_ORDER_KEYWORD);

/** Serialize flavor counts to notes string: "1x Birria, 2x Pastor" */
const formatMixedNotes = (counts: Record<MixedFlavor, number>) =>
  MIXED_ORDER_FLAVORS.filter((f) => counts[f] > 0)
    .map((f) => `${counts[f]}x ${f}`)
    .join(", ");

const emptyFlavorCounts = (): Record<MixedFlavor, number> =>
  Object.fromEntries(MIXED_ORDER_FLAVORS.map((f) => [f, 0])) as Record<
    MixedFlavor,
    number
  >;
// ─────────────────────────────────────────────────────────────────

const SOURCE_OPTIONS = [
  "TikTok",
  "Instagram",
  "Pasaba por ahí",
  "Recomendación",
  "Google Maps",
  "Otro",
];

const PAYMENT_METHODS = [
  { label: "Efectivo", value: "CASH", icon: Wallet },
  { label: "Tarjeta", value: "CARD", icon: CreditCard },
  { label: "Transferencia", value: "TRANSFER", icon: DollarSign },
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

  // Category & Search State
  const [activeCategory, setActiveCategory] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

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

  // Tip Modification State for Paid Orders
  const [editingTipOrder, setEditingTipOrder] = useState<Order | null>(null);
  const [editTipType, setEditTipType] = useState<"NONE" | "PERCENTAGE" | "FIXED">("NONE");
  const [editTipInput, setEditTipInput] = useState<string>("");

  // Edit Order State (add items)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [additionalItems, setAdditionalItems] = useState<OrderItemDraft[]>([
    { menuItemId: "", quantity: "1", notes: "" },
  ]);

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

  // Billing (Facturación) State
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);

  // Split bill State
  const [showSplitBill, setShowSplitBill] = useState(false);

  // Orden Mixta Modal State
  const [mixedOrderMenuItem, setMixedOrderMenuItem] = useState<MenuItem | null>(null);
  const [mixedFlavorCounts, setMixedFlavorCounts] = useState<Record<MixedFlavor, number>>(emptyFlavorCounts());

  const availableMenuItems = useMemo(
    () => menuItems.filter((item) => item.isAvailable),
    [menuItems],
  );

  const CATEGORY_CONFIG: Record<string, { label: string; color: string; badgeBg: string; text: string }> = {
    ANTOJITOS: { label: "Antojitos", color: "#FFB7CE", badgeBg: "bg-primary/10 text-primary border-primary/20", text: "#FFB7CE" },
    TACOS: { label: "Tacos", color: "#B2FBA5", badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20", text: "#34D399" },
    "PLATILLOS FUERTES": { label: "Platillos Fuertes", color: "#E6E6FA", badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/20", text: "#C084FC" },
    BEBIDAS: { label: "Bebidas", color: "#89CFF0", badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20", text: "#60A5FA" },
    EXTRAS: { label: "Extras", color: "#FDFD96", badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20", text: "#FBBF24" },
    POSTRES: { label: "Postres", color: "#FFDAB9", badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20", text: "#FB923C" },
    OTROS: { label: "Otros", color: "#E0E0E0", badgeBg: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20", text: "#E4E4E7" },
  };

  const CATEGORY_ORDER = ["ANTOJITOS", "TACOS", "PLATILLOS FUERTES", "BEBIDAS", "EXTRAS", "POSTRES", "OTROS"];

  const categories = useMemo(() => CATEGORY_ORDER, []);

  // Calculate next folio for display
  const nextFolioDisplay = useMemo(() => {
    const todayDateStr = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());

    const sortedOrders = [...orders].filter((o) => {
      const orderDate = new Intl.DateTimeFormat("en-CA", {
        timeZone: "America/Mexico_City",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(new Date(o.createdAt));
      return orderDate === todayDateStr;
    });

    if (sortedOrders.length === 0) return "001";
    const lastNum = Math.max(
      ...sortedOrders.map((o) => {
        const parts = (o.orderNumber || "0").split("-");
        return parseInt(parts[parts.length - 1], 10) || 0;
      }),
    );
    return (lastNum + 1).toString().padStart(3, "0");
  }, [orders]);

  // Today metrics summary
  const todayStats = useMemo(() => {
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

    const paidOrders = todayOrders.filter((o) => o.status === "PAID" || o.status === "DELIVERED");
    const salesTotal = paidOrders.reduce((acc, o) => acc + o.total, 0);
    const avgTicket = paidOrders.length > 0 ? salesTotal / paidOrders.length : 0;

    return {
      count: todayOrders.length,
      sales: salesTotal,
      avgTicket,
    };
  }, [orders]);

  useEffect(() => {
    if (categories.length > 0 && (!activeCategory || !categories.includes(activeCategory))) {
      setActiveCategory(categories[0]);
    }
  }, [categories, activeCategory]);

  useEffect(() => {
    if (!formState.source) {
      setFormState((prev) => ({ ...prev, source: "Otro" }));
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
      })),
    );
  };

  const fetchCustomers = async () => {
    const response = await fetch("/api/customers");
    const data = await response.json();
    if (!response.ok) throw new Error(data?.error || "Error al cargar clientes");
    setCustomers(data.customers || []);
  };

  const mapOrderData = (dbOrder: any): Order => {
    return {
      ...dbOrder,
      orderNumber: dbOrder.order_number,
      customerId: dbOrder.customer_id,
      createdAt: dbOrder.created_at
        ? dbOrder.created_at.includes("Z") || dbOrder.created_at.includes("+")
          ? dbOrder.created_at
          : `${dbOrder.created_at.replace(" ", "T")}Z`
        : dbOrder.created_at,
      updatedAt: dbOrder.updated_at
        ? dbOrder.updated_at.includes("Z") || dbOrder.updated_at.includes("+")
          ? dbOrder.updated_at
          : `${dbOrder.updated_at.replace(" ", "T")}Z`
        : dbOrder.updated_at,
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
            tipAmount: p.tip_amount,
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

  const editTipAmountCalculated = useMemo(() => {
    if (!editingTipOrder) return 0;
    if (editTipType === "PERCENTAGE") {
      return (editingTipOrder.total * (Number(editTipInput) || 0)) / 100;
    }
    if (editTipType === "FIXED") {
      return Number(editTipInput) || 0;
    }
    return 0;
  }, [editingTipOrder, editTipType, editTipInput]);

  const change = useMemo(() => {
    if (!checkoutOrder || !receivedAmount) return 0;
    const diff = Number(receivedAmount) - (checkoutOrder.total + tipAmountCalculated);
    return diff > 0 ? diff : 0;
  }, [checkoutOrder, receivedAmount, tipAmountCalculated]);

  const filteredMenuItems = useMemo(() => {
    return availableMenuItems.filter((m) => {
      const matchCategory = (m.category || "OTROS").toUpperCase() === activeCategory;
      const matchSearch = searchQuery.trim() === "" || m.name.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCategory && matchSearch;
    });
  }, [availableMenuItems, activeCategory, searchQuery]);

  const handleFormChange = (field: keyof OrderFormState, value: string) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleGridItemClick = (menuItem: MenuItem) => {
    if (isMixedOrderItem(menuItem.name)) {
      setMixedOrderMenuItem(menuItem);
      setMixedFlavorCounts(emptyFlavorCounts());
      return;
    }

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

  const handleMixedFlavorChange = (flavor: MixedFlavor, delta: number) => {
    setMixedFlavorCounts((prev) => {
      const next = { ...prev };
      const newVal = (next[flavor] || 0) + delta;
      const total = Object.values(next).reduce((s, v) => s + v, 0) + delta;
      if (newVal < 0 || total > MIXED_ORDER_TOTAL) return prev;
      next[flavor] = newVal;
      return next;
    });
  };

  const handleMixedOrderConfirm = () => {
    if (!mixedOrderMenuItem) return;
    const notes = formatMixedNotes(mixedFlavorCounts);
    setFormState((prev) => ({
      ...prev,
      items: [
        ...prev.items,
        { menuItemId: mixedOrderMenuItem.id, quantity: "1", notes },
      ],
    }));
    setMixedOrderMenuItem(null);
  };

  const handleQuantityChange = (index: number, delta: number) => {
    setFormState((prev) => {
      const nextItems = [...prev.items];
      const newQuantity = Number(nextItems[index].quantity) + delta;
      if (newQuantity <= 0) {
        return { ...prev, items: nextItems.filter((_, idx) => idx !== index) };
      }
      nextItems[index] = { ...nextItems[index], quantity: newQuantity.toString() };
      return { ...prev, items: nextItems };
    });
  };

  const handleClearCart = () => {
    if (window.confirm("¿Seguro que deseas vaciar el carrito?")) {
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
    let msg = `¡Gracias por tu visita a ${process.env.NEXT_PUBLIC_APP_NAME || "El Tesorito de Jalisco"}! 🌮🤩\n\n`;
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

    const tipAmount = getOrderTipAmount(checkoutOrder);
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

    const percentage = (tipAmountCalculated / checkoutOrder.total) * 100;
    const isUnusual = tipAmountCalculated > 0 && (percentage > 30 || tipAmountCalculated > 500);
    if (isUnusual) {
      if (!window.confirm(`La propina es de $${tipAmountCalculated.toFixed(2)} (${percentage.toFixed(1)}%). ¿Confirmar cantidad?`)) {
        return;
      }
    }

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

  const handleSplitPayment = async (splits: SplitPayment[]) => {
    if (!checkoutOrder) return;

    const totalTip = splits.reduce((sum, s) => sum + s.tipAmount, 0);
    const percentage = totalTip > 0 ? (totalTip / checkoutOrder.total) * 100 : 0;
    const isUnusual = totalTip > 0 && (percentage > 30 || totalTip > 500);
    if (isUnusual) {
      if (!window.confirm(`La propina total es de $${totalTip.toFixed(2)} (${percentage.toFixed(1)}%). ¿Confirmar?`)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: checkoutOrder.id, splits }),
      });
      if (!response.ok) throw new Error("Error al procesar el pago dividido");
      const updatedOrders = await fetchOrders();
      const updatedOrder = updatedOrders.find((o: Order) => o.id === checkoutOrder.id) || checkoutOrder;
      setCheckoutOrder(updatedOrder);
      setShowSplitBill(false);
      setShowTicket(true);
    } catch (error) {
      alert("Error al procesar el pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTip = async () => {
    if (!editingTipOrder) return;

    const percentage = (editTipAmountCalculated / editingTipOrder.total) * 100;
    const isUnusual = editTipAmountCalculated > 0 && (percentage > 30 || editTipAmountCalculated > 500);
    if (isUnusual) {
      if (!window.confirm(`La nueva propina es de $${editTipAmountCalculated.toFixed(2)} (${percentage.toFixed(1)}%). ¿Confirmar cantidad?`)) {
        return;
      }
    }

    try {
      setIsSubmitting(true);
      const response = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: editingTipOrder.id,
          tipAmount: editTipAmountCalculated,
        }),
      });
      if (!response.ok) throw new Error("Error al actualizar propina");
      await fetchOrders();
      setEditingTipOrder(null);
    } catch (error) {
      alert("Error al actualizar propina");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoPayment = async (orderId: string, orderNumber: string) => {
    if (!window.confirm(`¿Seguro que deseas deshacer el pago de la orden #${orderNumber}? La orden volverá a estar pendiente para edición.`)) return;

    try {
      setIsSubmitting(true);
      const response = await fetch(`/api/orders/${orderId}/undo-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: "Corrección post-cobro (3 min window)" }),
      });

      if (!response.ok) throw new Error("Error al deshacer el pago");

      await fetchOrders();
      alert("Pago revertido exitosamente. La orden ahora puede ser editada.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al deshacer pago");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFailedPayment = async (orderToProcess?: Order) => {
    const order = orderToProcess || checkoutOrder;
    if (!order) return;

    if (!window.confirm(`¿Seguro que deseas marcar la orden #${order.orderNumber} como PAGO FALLIDO? Esto la quitará de ventas exitosas.`)) return;

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
        return next.filter((_, idx) => idx !== index);
      }
      next[index] = { ...next[index], quantity: newQty };
      return next;
    });
  };

  const handleModifyRemoveItem = (index: number) => {
    setModifyItems((prev) => prev.filter((_, idx) => idx !== index));
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
    <div className="min-h-screen bg-[#121212] text-[#E0E0E0]">
      {/* Header reutilizable */}
      <PageHeader
        title="Punto de Venta"
        subtitle="Registro de órdenes, comandas y cobranza en caja"
        badgeColor="bg-[#34D399]"
        actions={
          <div className="flex items-center gap-2.5 rounded-xl bg-[#242424] px-4 py-1.5 border border-white/5 shadow-sm">
            <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-widest">
              Próximo Folio
            </span>
            <span className="font-mono font-black text-emerald-400 text-sm">
              #{nextFolioDisplay}
            </span>
          </div>
        }
      />

      <main className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8 no-print space-y-8">
        {errorMessage && (
          <div className="rounded-2xl border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-400 flex items-center gap-3">
            <AlertTriangle className="h-5 w-5 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Resumen del Día (Metric Cards in app/page.tsx Style) */}
        <div>
          <h2 className="mb-4 text-xs font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
            Resumen del POS
          </h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Próximo Folio */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Próximo Folio
                </span>
                <div className="rounded-xl bg-secondary/10 p-2.5 text-secondary">
                  <Receipt className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight font-mono">
                #{nextFolioDisplay}
              </p>
            </div>

            {/* Órdenes Hoy */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Órdenes Hoy
                </span>
                <div className="rounded-xl bg-primary/10 p-2.5 text-primary">
                  <ClipboardList className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight">
                {todayStats.count}
              </p>
            </div>

            {/* Ventas Hoy */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Ventas del Día
                </span>
                <div className="rounded-xl bg-success/10 p-2.5 text-success">
                  <DollarSign className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight">
                {new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: "MXN",
                }).format(todayStats.sales)}
              </p>
            </div>

            {/* Ticket Promedio */}
            <div className="rounded-2xl bg-[#242424] p-5 shadow-sm border border-white/5 transition-all hover:border-white/10">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Ticket Promedio
                </span>
                <div className="rounded-xl bg-blue-500/10 p-2.5 text-blue-400">
                  <BarChart3 className="h-5 w-5" />
                </div>
              </div>
              <p className="mt-2 text-2xl font-black text-[#E0E0E0] tracking-tight">
                {new Intl.NumberFormat("es-MX", {
                  style: "currency",
                  currency: "MXN",
                }).format(todayStats.avgTicket)}
              </p>
            </div>
          </div>
        </div>

        {/* Main POS Interface Grid */}
        <form onSubmit={handleSubmit}>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* COLUMNA IZQUIERDA: Catálogo de Productos */}
            <div className="lg:col-span-7 xl:col-span-8 space-y-6">
              {/* Sección de Catálogo */}
              <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-5">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/5 pb-4">
                  <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-primary"></span>
                    Catálogo de Productos
                  </h2>

                  {/* Buscador Rápido */}
                  <div className="relative min-w-[220px]">
                    <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-[#E0E0E0]/40" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Buscar producto..."
                      className="w-full rounded-xl border border-white/5 bg-white/5 pl-9 pr-4 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-all placeholder:text-[#E0E0E0]/30"
                    />
                    {searchQuery && (
                      <button
                        type="button"
                        onClick={() => setSearchQuery("")}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-[#E0E0E0]/40 hover:text-[#E0E0E0]"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Categorías en Tabs Estilo app/page.tsx */}
                <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
                  {categories.map((cat) => {
                    const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTROS;
                    const isActive = activeCategory === cat;
                    return (
                      <button
                        key={cat}
                        type="button"
                        onClick={() => setActiveCategory(cat)}
                        className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap border ${
                          isActive
                            ? `${config.badgeBg} shadow-sm scale-105`
                            : "bg-white/5 text-[#E0E0E0]/50 border-transparent hover:border-white/10 hover:text-[#E0E0E0]"
                        }`}
                      >
                        {config.label}
                      </button>
                    );
                  })}
                </div>

                {/* Grid de Productos */}
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-1">
                  {filteredMenuItems.length === 0 ? (
                    <div className="col-span-full py-12 text-center text-[#E0E0E0]/40 italic text-xs">
                      No se encontraron productos en esta sección.
                    </div>
                  ) : (
                    filteredMenuItems.map((m) => {
                      const isMixed = isMixedOrderItem(m.name);
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => handleGridItemClick(m)}
                          className="group relative rounded-2xl bg-[#1A1A1A] p-4 border border-white/5 hover:border-primary/40 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between text-left h-28 overflow-hidden active:scale-95"
                        >
                          <div className="flex items-start justify-between gap-1 w-full">
                            <span className="font-black text-xs text-[#E0E0E0] uppercase tracking-tight leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                              {m.name}
                            </span>
                            {isMixed && (
                              <span className="rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-black px-1.5 py-0.5 uppercase tracking-widest shrink-0 border border-amber-500/20">
                                Mixto
                              </span>
                            )}
                          </div>
                          <div className="mt-2 flex items-center justify-between w-full">
                            <span className="rounded-xl bg-white/5 border border-white/5 px-2.5 py-1 text-xs font-black text-[#E0E0E0] tabular-nums">
                              ${m.price.toFixed(2)}
                            </span>
                            <span className="rounded-lg bg-primary/10 p-1.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
                              <Plus className="h-3.5 w-3.5" />
                            </span>
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>
              </section>

              {/* Detalles Adicionales de la Orden */}
              <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h2 className="text-xs font-black text-[#E0E0E0]/50 tracking-widest uppercase flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-secondary"></span>
                    Detalles Adicionales de la Orden
                  </h2>
                  <button
                    type="button"
                    onClick={() =>
                      handleFormChange(
                        "table",
                        formState.table === "Domicilio" ? "" : "Domicilio",
                      )
                    }
                    className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all border ${
                      formState.table === "Domicilio"
                        ? "bg-secondary/20 border-secondary text-secondary"
                        : "bg-white/5 border-transparent text-[#E0E0E0]/60 hover:border-white/10 hover:text-[#E0E0E0]"
                    }`}
                  >
                    <Bike className="h-3.5 w-3.5" />
                    DOMICILIO
                  </button>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <div>
                    <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                      Cliente
                    </label>
                    <select
                      value={formState.customerId}
                      onChange={(e) => handleFormChange("customerId", e.target.value)}
                      className="w-full rounded-xl border border-white/5 bg-[#181818] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors"
                    >
                      <option value="">General</option>
                      {customers.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                      Origen
                    </label>
                    <select
                      value={formState.source}
                      onChange={(e) => handleFormChange("source", e.target.value)}
                      className="w-full rounded-xl border border-white/5 bg-[#181818] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors"
                    >
                      {SOURCE_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
                      Mesa / Notas Especiales
                    </label>
                    <input
                      type="text"
                      value={formState.notes}
                      onChange={(e) => handleFormChange("notes", e.target.value)}
                      className="w-full rounded-xl border border-white/5 bg-[#181818] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30"
                      placeholder="Ej. Mesa 4, Sin picante..."
                    />
                  </div>
                </div>
              </section>
            </div>

            {/* COLUMNA DERECHA: Carrito y Resumen */}
            <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
              <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-3">
                  <h3 className="text-sm font-black uppercase text-[#E0E0E0] tracking-wider flex items-center gap-2">
                    <span className="h-2 w-2 rounded-full bg-success"></span>
                    Tu Pedido
                  </h3>
                  {formState.items.length > 0 && (
                    <button
                      type="button"
                      onClick={handleClearCart}
                      className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors"
                    >
                      Vaciar Carrito
                    </button>
                  )}
                </div>

                {formErrors.items && (
                  <div className="rounded-xl bg-red-500/10 p-3 border border-red-500/20 text-xs font-bold text-red-400 text-center">
                    ⚠️ {formErrors.items}
                  </div>
                )}

                {/* Listado del Carrito */}
                <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1 custom-scrollbar">
                  {formState.items.length === 0 ? (
                    <div className="text-center py-12 text-[#E0E0E0]/40 space-y-2">
                      <ShoppingBag className="h-10 w-10 mx-auto opacity-30 text-primary" />
                      <p className="text-xs font-extrabold uppercase tracking-widest">
                        El carrito está vacío
                      </p>
                      <p className="text-[11px] font-medium text-[#E0E0E0]/30">
                        Selecciona productos del catálogo a la izquierda
                      </p>
                    </div>
                  ) : (
                    formState.items.map((item, index) => {
                      const product = availableMenuItems.find((m) => m.id === item.menuItemId);
                      const isMixed = product && isMixedOrderItem(product.name);
                      return (
                        <div
                          key={index}
                          className="flex items-center justify-between bg-[#1A1A1A] p-3 rounded-xl border border-white/5 gap-3"
                        >
                          <div className="flex-1 min-w-0">
                            <p className="font-black text-xs text-[#E0E0E0] uppercase tracking-tight truncate">
                              {product?.name || "Producto"}
                            </p>
                            {isMixed && item.notes ? (
                              <p className="text-[10px] font-extrabold text-amber-400 mt-0.5">
                                {item.notes}
                              </p>
                            ) : (
                              <p className="text-[10px] font-bold text-[#E0E0E0]/50 mt-0.5">
                                ${product?.price.toFixed(2)} c/u
                              </p>
                            )}
                          </div>

                          <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(index, -1)}
                              className="h-6 w-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-[#E0E0E0] hover:text-red-400 flex items-center justify-center font-bold text-xs transition-colors"
                            >
                              <Minus className="h-3 w-3" />
                            </button>
                            <span className="w-5 text-center font-black text-xs text-[#E0E0E0]">
                              {item.quantity}
                            </span>
                            <button
                              type="button"
                              onClick={() => handleQuantityChange(index, 1)}
                              className="h-6 w-6 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-[#E0E0E0] hover:text-emerald-400 flex items-center justify-center font-bold text-xs transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                            </button>
                          </div>

                          <div className="text-right min-w-[55px]">
                            <p className="font-black text-xs text-[#E0E0E0] tabular-nums">
                              ${((product?.price || 0) * Number(item.quantity)).toFixed(2)}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>

                {/* Total y Acción */}
                {formState.items.length > 0 && (
                  <div className="pt-4 border-t border-white/5 space-y-4">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-widest">
                        Total a Pagar
                      </span>
                      <span className="text-3xl font-black text-[#E0E0E0] tracking-tight tabular-nums">
                        ${formState.items
                          .reduce((total, item) => {
                            const product = availableMenuItems.find((m) => m.id === item.menuItemId);
                            return total + (product?.price || 0) * Number(item.quantity);
                          }, 0)
                          .toFixed(2)}
                      </span>
                    </div>

                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full rounded-xl bg-primary py-3.5 text-black font-black text-sm hover:brightness-105 active:scale-[0.98] transition-all uppercase tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
                    >
                      <Printer className="h-4 w-4" />
                      {isSubmitting ? "GUARDANDO..." : "GUARDAR E IMPRIMIR"}
                    </button>
                  </div>
                )}
              </section>
            </div>
          </div>
        </form>

        {/* SECCIÓN: Últimas Órdenes */}
        <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 overflow-hidden">
          <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-4">
            <h2 className="text-lg font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-500"></span>
              Últimas Órdenes
            </h2>
            <Link
              href="/history"
              className="text-xs font-bold text-primary hover:underline uppercase tracking-wider flex items-center gap-1"
            >
              Ver Historial Completo
              <ChevronRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-white/5">
                  <th className="pb-3 px-3 text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                    Folio
                  </th>
                  <th className="pb-3 px-3 text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                    Mesa / Tipo
                  </th>
                  <th className="pb-3 px-3 text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                    Estado
                  </th>
                  <th className="pb-3 px-3 text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest">
                    Total
                  </th>
                  <th className="pb-3 px-3 text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest text-right">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.slice(0, 10).map((order) => {
                  const tipAmt = getOrderTipAmount(order);
                  return (
                    <tr key={order.id} className="hover:bg-white/5 transition-colors">
                      <td className="py-3.5 px-3">
                        <span className="font-mono font-black text-sm text-[#E0E0E0]">
                          #{order.orderNumber}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        <span className="rounded-full bg-white/5 px-2.5 py-1 text-[10px] font-black text-[#E0E0E0]/70 uppercase tracking-wider">
                          {order.table || "Para Llevar"}
                        </span>
                      </td>
                      <td className="py-3.5 px-3">
                        {order.status === "PAID" ? (
                          <span className="rounded-full bg-success/10 px-2.5 py-1 text-[10px] font-black text-success uppercase tracking-widest">
                            Pagado
                          </span>
                        ) : order.status === "UNCOLLECTED" ? (
                          <span className="rounded-full bg-red-500/10 px-2.5 py-1 text-[10px] font-black text-red-400 uppercase tracking-widest">
                            No Cobrada
                          </span>
                        ) : (
                          <span className="rounded-full bg-amber-500/10 px-2.5 py-1 text-[10px] font-black text-amber-400 uppercase tracking-widest">
                            Pendiente
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex flex-col">
                          <span className="font-black text-sm text-[#E0E0E0] tabular-nums">
                            ${order.total.toFixed(2)}
                          </span>
                          {tipAmt > 0 && (
                            <span className="text-[10px] font-bold text-blue-400/80">
                              +${tipAmt.toFixed(2)} propina
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3.5 px-3">
                        <div className="flex justify-end items-center gap-1.5 flex-wrap">
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
                              className="rounded-xl bg-success/10 hover:bg-success/20 text-success border border-success/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                              <DollarSign className="h-3 w-3" />
                              Cobrar
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setCheckoutOrder(order);
                              setShowKitchenTicket(true);
                              setShowTicket(false);
                            }}
                            className="rounded-xl bg-primary/10 hover:bg-primary/20 text-primary border border-primary/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                          >
                            <ChefHat className="h-3 w-3" />
                            Comanda
                          </button>
                          {order.status !== "PAID" && (
                            <button
                              onClick={() => setEditingOrder(order)}
                              className="rounded-xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                              <Plus className="h-3 w-3" />
                              Agregar
                            </button>
                          )}
                          {order.status !== "PAID" && (
                            <button
                              onClick={() => openModifyModal(order)}
                              className="rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                              <Edit3 className="h-3 w-3" />
                              Editar
                            </button>
                          )}
                          {order.status === "PAID" && (
                            <button
                              onClick={() => {
                                setEditingTipOrder(order);
                                setEditTipType("FIXED");
                                setEditTipInput(order.payments?.[0]?.tipAmount?.toString() || "0");
                              }}
                              className="rounded-xl bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 border border-blue-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                              <HandCoins className="h-3 w-3" />
                              Propina
                            </button>
                          )}
                          {order.status === "PAID" &&
                            (() => {
                              const lastUpdate = new Date(order.updatedAt || order.createdAt).getTime();
                              const now = new Date().getTime();
                              const isWithin3Min = now - lastUpdate < 3 * 60 * 1000;

                              if (isWithin3Min) {
                                return (
                                  <button
                                    onClick={() => handleUndoPayment(order.id, order.orderNumber)}
                                    className="rounded-xl bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/30 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors animate-pulse"
                                  >
                                    <Undo2 className="h-3 w-3" />
                                    Deshacer
                                  </button>
                                );
                              }
                              return null;
                            })()}
                          {order.status === "PAID" && (
                            <button
                              onClick={() => setBillingOrder(order)}
                              className="rounded-xl bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/20 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                            >
                              <FileText className="h-3 w-3" />
                              Factura
                            </button>
                          )}
                          <button
                            onClick={() => {
                              setCheckoutOrder(order);
                              setShowTicket(true);
                              setShowKitchenTicket(false);
                            }}
                            className="rounded-xl bg-white/5 hover:bg-white/10 text-[#E0E0E0]/70 border border-white/5 px-2.5 py-1 text-[10px] font-black uppercase tracking-wider flex items-center gap-1 transition-colors"
                          >
                            <Printer className="h-3 w-3" />
                            Ticket
                          </button>
                          {order.status !== "PAID" && order.status !== "UNCOLLECTED" && (
                            <button
                              onClick={() => handleCancelOrder(order.id, order.orderNumber)}
                              disabled={isSubmitting}
                              className="rounded-xl bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/20 p-1 text-[10px] font-black uppercase transition-colors"
                              title="Cancelar orden"
                            >
                              <Ban className="h-3.5 w-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {/* MODAL DE AGREGAR PRODUCTOS */}
      {editingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#242424] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-purple-500"></span>
                Agregar Productos a Orden #{editingOrder.orderNumber}
              </h3>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-[#E0E0E0]/40 hover:text-[#E0E0E0] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleAddItems} className="space-y-5">
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                    Nuevos Productos
                  </span>
                  <button
                    type="button"
                    onClick={addAdditionalItemRow}
                    className="text-xs text-primary font-black uppercase tracking-wider flex items-center gap-1 hover:underline"
                  >
                    <Plus className="h-3.5 w-3.5" /> Fila
                  </button>
                </div>

                {additionalItems.map((item, index) => (
                  <div key={index} className="flex gap-2 items-center">
                    <select
                      value={item.menuItemId}
                      onChange={(e) =>
                        handleAdditionalItemChange(index, "menuItemId", e.target.value)
                      }
                      className="flex-1 rounded-xl border border-white/5 bg-[#181818] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors"
                      required
                    >
                      <option value="" className="bg-[#242424]">
                        Seleccionar Producto
                      </option>
                      {availableMenuItems.map((m) => (
                        <option key={m.id} value={m.id} className="bg-[#242424]">
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
                      className="w-16 rounded-xl border border-white/5 bg-[#181818] px-2 py-2 text-xs text-center font-black text-[#E0E0E0] outline-none focus:border-primary transition-colors"
                      min="1"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => removeAdditionalItemRow(index)}
                      className="text-red-400/60 hover:text-red-400 p-1.5 transition-colors"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="w-full bg-white/5 text-[#E0E0E0]/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full bg-purple-500 text-white py-3 rounded-xl font-black hover:brightness-110 transition-all uppercase text-xs tracking-wider shadow-lg shadow-purple-500/20"
                >
                  {isSubmitting ? "Guardando..." : "Agregar Productos"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL DE MODIFICAR ORDEN */}
      {modifyingOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#242424] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-orange-400"></span>
                Modificar Orden #{modifyingOrder.orderNumber}
              </h3>
              <button
                onClick={() => {
                  setModifyingOrder(null);
                  setModifyItems([]);
                }}
                className="text-[#E0E0E0]/40 hover:text-[#E0E0E0] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-3">
              {modifyItems.length === 0 && (
                <p className="text-center text-[#E0E0E0]/40 py-6 text-xs italic">
                  No quedan productos en la orden.
                </p>
              )}
              {modifyItems.map((item, index) => (
                <div
                  key={item.id}
                  className="flex gap-3 items-center bg-[#1A1A1A] p-3 rounded-xl border border-white/5"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs text-[#E0E0E0] uppercase tracking-tight truncate">
                      {item.menuItemName}
                    </p>
                    <p className="text-[10px] font-bold text-[#E0E0E0]/50 mt-0.5">
                      ${item.unitPrice.toFixed(2)} c/u
                    </p>
                  </div>

                  <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                    <button
                      type="button"
                      onClick={() => handleModifyQuantityChange(index, -1)}
                      className="h-6 w-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-[#E0E0E0] hover:text-red-400 flex items-center justify-center font-bold text-xs transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-black text-xs text-[#E0E0E0]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleModifyQuantityChange(index, 1)}
                      className="h-6 w-6 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-[#E0E0E0] hover:text-emerald-400 flex items-center justify-center font-bold text-xs transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="flex items-center gap-2 min-w-[70px] justify-end">
                    <p className="font-black text-xs text-[#E0E0E0] tabular-nums">
                      ${(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                    <button
                      type="button"
                      onClick={() => handleModifyRemoveItem(index)}
                      className="text-red-400/50 hover:text-red-400 transition-colors p-1"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {modifyItems.length > 0 && (
              <div className="border-t border-white/5 pt-4 flex justify-between items-center">
                <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-widest">
                  Nuevo Total
                </span>
                <span className="text-2xl font-black text-[#E0E0E0] tabular-nums">
                  $
                  {modifyItems
                    .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
                    .toFixed(2)}
                </span>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => {
                  setModifyingOrder(null);
                  setModifyItems([]);
                }}
                className="w-full bg-white/5 text-[#E0E0E0]/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveModifiedOrder}
                disabled={isSubmitting || modifyItems.length === 0}
                className="w-full bg-primary text-black py-3 rounded-xl font-black hover:brightness-105 transition-all uppercase text-xs tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50"
              >
                {isSubmitting ? "Guardando..." : "Guardar Cambios"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL ORDEN MIXTA */}
      {mixedOrderMenuItem && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#242424] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-white/10 space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2">
                <UtensilsCrossed className="h-4 w-4 text-amber-400" />
                {mixedOrderMenuItem.name}
              </h3>
              <button
                onClick={() => setMixedOrderMenuItem(null)}
                className="text-[#E0E0E0]/40 hover:text-[#E0E0E0] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider text-center">
              Selecciona {MIXED_ORDER_TOTAL} piezas en total
            </p>

            <div className="space-y-2.5">
              {MIXED_ORDER_FLAVORS.map((flavor) => (
                <div
                  key={flavor}
                  className="flex items-center justify-between bg-[#1A1A1A] px-4 py-2.5 rounded-xl border border-white/5"
                >
                  <span className="font-black text-xs text-[#E0E0E0] uppercase tracking-wider">
                    {flavor}
                  </span>
                  <div className="flex items-center gap-1.5 bg-white/5 rounded-xl p-1 border border-white/5">
                    <button
                      type="button"
                      onClick={() => handleMixedFlavorChange(flavor, -1)}
                      disabled={mixedFlavorCounts[flavor] === 0}
                      className="h-6 w-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-[#E0E0E0] flex items-center justify-center font-bold text-xs transition-colors disabled:opacity-30"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-black text-xs text-[#E0E0E0]">
                      {mixedFlavorCounts[flavor]}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleMixedFlavorChange(flavor, 1)}
                      disabled={
                        Object.values(mixedFlavorCounts).reduce((s, v) => s + v, 0) >=
                        MIXED_ORDER_TOTAL
                      }
                      className="h-6 w-6 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-[#E0E0E0] flex items-center justify-center font-bold text-xs transition-colors disabled:opacity-30"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-center gap-2 pt-2">
              {Array.from({ length: MIXED_ORDER_TOTAL }).map((_, i) => {
                const filled =
                  i < Object.values(mixedFlavorCounts).reduce((s, v) => s + v, 0);
                return (
                  <div
                    key={i}
                    className={`w-3.5 h-3.5 rounded-full border transition-all ${
                      filled
                        ? "bg-primary border-primary shadow-sm shadow-primary/50"
                        : "border-white/20 bg-transparent"
                    }`}
                  />
                );
              })}
              <span className="text-xs font-bold text-[#E0E0E0]/50 ml-2 uppercase tracking-wider">
                {Object.values(mixedFlavorCounts).reduce((s, v) => s + v, 0)}/{MIXED_ORDER_TOTAL} pzas
              </span>
            </div>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMixedOrderMenuItem(null)}
                className="w-full bg-white/5 text-[#E0E0E0]/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleMixedOrderConfirm}
                disabled={
                  Object.values(mixedFlavorCounts).reduce((s, v) => s + v, 0) !==
                  MIXED_ORDER_TOTAL
                }
                className="w-full bg-primary text-black py-3 rounded-xl font-black hover:brightness-105 transition-all uppercase text-xs tracking-wider shadow-lg shadow-primary/10 disabled:opacity-30"
              >
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODALES DE IMPRESIÓN */}
      {(showTicket || showKitchenTicket) && checkoutOrder && (
        <div className="fixed inset-0 bg-black/80 flex items-center justify-center p-4 z-50 overflow-y-auto backdrop-blur-md">
          <div className="max-w-md w-full py-10 space-y-6">
            <div className="flex justify-center gap-3 no-print">
              <button
                onClick={() => window.print()}
                className="bg-success text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5"
              >
                <Printer className="h-4 w-4" /> Imprimir Ticket
              </button>
              {showTicket && (
                <button
                  onClick={() => setShowWhatsAppModal(true)}
                  className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:bg-emerald-500 active:scale-95 transition-all flex items-center gap-1.5"
                >
                  <MessageCircle className="h-4 w-4" /> WhatsApp
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
                className="bg-white/10 text-[#E0E0E0] px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider hover:bg-white/20 active:scale-95 transition-all"
              >
                Cerrar
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
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#242424] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-success"></span>
                Cobrar Orden #{checkoutOrder.orderNumber}
              </h3>
              <button
                onClick={() => setCheckoutOrder(null)}
                className="text-[#E0E0E0]/40 hover:text-[#E0E0E0] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="text-center bg-[#1A1A1A] py-6 rounded-2xl border border-white/5 space-y-1">
                <p className="text-[#E0E0E0]/50 text-[10px] font-extrabold uppercase tracking-widest">
                  Total a Pagar
                </p>
                <p className="text-4xl font-black text-[#E0E0E0] tabular-nums">
                  ${(checkoutOrder.total + tipAmountCalculated).toFixed(2)}
                </p>
                {tipAmountCalculated > 0 && (
                  <p className="text-xs font-bold text-blue-400">
                    Incluye ${tipAmountCalculated.toFixed(2)} de propina
                  </p>
                )}
              </div>

              {/* Selector de Propina */}
              <div>
                <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-2">
                  Propina
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setTipType("NONE");
                      setTipInput("");
                    }}
                    className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border transition-all ${
                      tipType === "NONE"
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-white/5 text-[#E0E0E0]/60 bg-white/5 hover:border-white/10"
                    }`}
                  >
                    Sin Propina
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipType("PERCENTAGE")}
                    className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border transition-all ${
                      tipType === "PERCENTAGE"
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-white/5 text-[#E0E0E0]/60 bg-white/5 hover:border-white/10"
                    }`}
                  >
                    Porcentaje (%)
                  </button>
                  <button
                    type="button"
                    onClick={() => setTipType("FIXED")}
                    className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border transition-all ${
                      tipType === "FIXED"
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-white/5 text-[#E0E0E0]/60 bg-white/5 hover:border-white/10"
                    }`}
                  >
                    Fijo ($)
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  {["10", "15", "20"].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setTipType("PERCENTAGE");
                        setTipInput(pct);
                      }}
                      className={`py-2 text-xs rounded-xl font-black uppercase border transition-all ${
                        tipType === "PERCENTAGE" && tipInput === pct
                          ? "bg-primary text-black border-primary"
                          : "border-white/5 text-[#E0E0E0]/60 bg-white/5 hover:border-white/10"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {tipType !== "NONE" && (
                  <input
                    type="number"
                    value={tipInput}
                    onChange={(e) => setTipInput(e.target.value)}
                    placeholder={tipType === "PERCENTAGE" ? "% Ej. 10" : "$ Monto propina"}
                    className="w-full text-base font-black p-3 border border-white/5 bg-[#181818] rounded-xl focus:border-primary outline-none text-center text-[#E0E0E0] transition-colors placeholder:text-[#E0E0E0]/30"
                  />
                )}
              </div>

              {/* Método de Pago */}
              <div>
                <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-2">
                  Método de Pago
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {PAYMENT_METHODS.map((m) => {
                    const IconComp = m.icon;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setPaymentMethod(m.value)}
                        className={`py-3 text-xs rounded-xl font-black uppercase border flex flex-col items-center gap-1.5 transition-all ${
                          paymentMethod === m.value
                            ? "border-blue-400 bg-blue-500/10 text-blue-400"
                            : "border-white/5 text-[#E0E0E0]/60 bg-white/5 hover:border-white/10"
                        }`}
                      >
                        <IconComp className="h-4 w-4" />
                        {m.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Pago en Efectivo */}
              {paymentMethod === "CASH" && (
                <div className="space-y-3">
                  <input
                    type="number"
                    value={receivedAmount}
                    onChange={(e) => setReceivedAmount(e.target.value)}
                    className="w-full text-3xl font-black p-4 border border-white/5 bg-[#181818] rounded-xl focus:border-success outline-none text-center text-[#E0E0E0] transition-colors placeholder:text-[#E0E0E0]/20"
                    placeholder="Monto recibido ($)..."
                    autoFocus
                  />
                  <div className="flex justify-between items-center bg-[#1A1A1A] p-3.5 rounded-xl border border-white/5">
                    <span className="font-extrabold text-[#E0E0E0]/50 text-xs uppercase tracking-widest">
                      Cambio a Entregar
                    </span>
                    <span className="text-2xl font-black text-success tabular-nums">
                      ${change.toFixed(2)}
                    </span>
                  </div>
                </div>
              )}

              {/* Botones de Acción de Cobro */}
              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleProcessPayment}
                  disabled={
                    isSubmitting ||
                    (paymentMethod === "CASH" &&
                      (!receivedAmount ||
                        Number(receivedAmount) < checkoutOrder.total + tipAmountCalculated))
                  }
                  className="w-full bg-success text-white py-4 rounded-xl font-black text-base hover:brightness-110 shadow-lg shadow-success/20 disabled:opacity-30 transition-all uppercase tracking-wider"
                >
                  {isSubmitting ? "Procesando..." : "Registrar Pago"}
                </button>

                <button
                  type="button"
                  onClick={() => setShowSplitBill(true)}
                  disabled={isSubmitting}
                  className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 py-2.5 rounded-xl font-black text-xs hover:bg-blue-500/20 transition-all uppercase tracking-wider"
                >
                  ✂️ Dividir Cuenta
                </button>

                <button
                  type="button"
                  onClick={() => {
                    openModifyModal(checkoutOrder);
                    setCheckoutOrder(null);
                  }}
                  className="w-full bg-white/5 text-[#E0E0E0]/60 py-2.5 rounded-xl font-black text-xs hover:bg-white/10 transition-all uppercase tracking-wider border border-white/5"
                >
                  Regresar a Editar
                </button>

                <button
                  type="button"
                  onClick={() => handleFailedPayment()}
                  disabled={isSubmitting}
                  className="w-full bg-red-500/10 text-red-400 py-2.5 rounded-xl font-black text-xs hover:bg-red-500/20 transition-all uppercase tracking-wider"
                >
                  Marca como Pago Fallido
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL DE WHATSAPP */}
      {showWhatsAppModal && checkoutOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#242424] rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-white/10 space-y-5">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-black flex items-center gap-2 text-[#E0E0E0] uppercase tracking-tight">
                <MessageCircle className="h-5 w-5 text-emerald-400" />
                Enviar Ticket por WhatsApp
              </h3>
              <button
                onClick={() => setShowWhatsAppModal(false)}
                className="text-[#E0E0E0]/40 hover:text-[#E0E0E0] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <p className="text-xs font-bold text-[#E0E0E0]/50 text-center uppercase tracking-wider">
              Ingresa los 10 dígitos del número celular
            </p>

            <input
              type="tel"
              maxLength={10}
              value={whatsappNumber}
              onChange={(e) => setWhatsappNumber(e.target.value.replace(/\D/g, ""))}
              placeholder="3312345678"
              autoFocus
              className="w-full text-2xl font-black p-4 border border-white/5 bg-[#181818] rounded-xl focus:border-emerald-400 outline-none text-center text-[#E0E0E0] tracking-[0.2em] transition-colors placeholder:text-[#E0E0E0]/20"
            />

            <button
              disabled={whatsappNumber.length !== 10}
              onClick={() => {
                const url = `https://wa.me/52${whatsappNumber}?text=${generateWhatsAppMessage()}`;
                window.open(url, "_blank");
                setShowWhatsAppModal(false);
                setCheckoutOrder(null);
                setShowTicket(false);
                setShowKitchenTicket(false);
                setWhatsappNumber("");
              }}
              className="w-full bg-emerald-500 text-white py-3.5 rounded-xl font-black text-sm hover:brightness-110 disabled:opacity-30 transition-all shadow-lg shadow-emerald-500/20 uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Send className="h-4 w-4" /> Enviar Ticket
            </button>
          </div>
        </div>
      )}

      {/* MODAL DE FACTURACIÓN */}
      {billingOrder && (
        <FacturacionModal
          order={billingOrder}
          onClose={() => setBillingOrder(null)}
        />
      )}

      {/* MODAL DE DIVIDIR CUENTA */}
      {showSplitBill && checkoutOrder && (
        <SplitBillModal
          order={checkoutOrder}
          onConfirm={handleSplitPayment}
          onClose={() => setShowSplitBill(false)}
          isSubmitting={isSubmitting}
        />
      )}

      {/* MODAL DE EDITAR PROPINA */}
      {editingTipOrder && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
          <div className="bg-[#242424] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 space-y-6">
            <div className="flex justify-between items-center border-b border-white/5 pb-3">
              <h3 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2">
                <HandCoins className="h-4 w-4 text-blue-400" />
                Editar Propina - Orden #{editingTipOrder.orderNumber}
              </h3>
              <button
                onClick={() => setEditingTipOrder(null)}
                className="text-[#E0E0E0]/40 hover:text-[#E0E0E0] transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="text-center bg-[#1A1A1A] py-4 rounded-xl border border-white/5 space-y-1">
                <p className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                  Total de la orden: ${editingTipOrder.total.toFixed(2)}
                </p>
                <p className="text-xl font-black text-blue-400">
                  Nueva Propina: ${editTipAmountCalculated.toFixed(2)}
                </p>
              </div>

              <div>
                <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-2">
                  Ajustar Propina
                </label>
                <div className="flex gap-2 mb-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditTipType("NONE");
                      setEditTipInput("");
                    }}
                    className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border transition-all ${
                      editTipType === "NONE"
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-white/5 text-[#E0E0E0]/60 bg-white/5 hover:border-white/10"
                    }`}
                  >
                    Sin Propina
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTipType("PERCENTAGE")}
                    className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border transition-all ${
                      editTipType === "PERCENTAGE"
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-white/5 text-[#E0E0E0]/60 bg-white/5 hover:border-white/10"
                    }`}
                  >
                    %
                  </button>
                  <button
                    type="button"
                    onClick={() => setEditTipType("FIXED")}
                    className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border transition-all ${
                      editTipType === "FIXED"
                        ? "bg-primary/20 border-primary text-primary"
                        : "border-white/5 text-[#E0E0E0]/60 bg-white/5 hover:border-white/10"
                    }`}
                  >
                    $ Fijo
                  </button>
                </div>

                <div className="grid grid-cols-3 gap-2 mb-2">
                  {["10", "15", "20"].map((pct) => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        setEditTipType("PERCENTAGE");
                        setEditTipInput(pct);
                      }}
                      className={`py-2 text-xs rounded-xl font-black uppercase border transition-all ${
                        editTipType === "PERCENTAGE" && editTipInput === pct
                          ? "bg-primary text-black border-primary"
                          : "border-white/5 text-[#E0E0E0]/60 bg-white/5 hover:border-white/10"
                      }`}
                    >
                      {pct}%
                    </button>
                  ))}
                </div>

                {editTipType !== "NONE" && (
                  <input
                    type="number"
                    value={editTipInput}
                    onChange={(e) => setEditTipInput(e.target.value)}
                    placeholder={editTipType === "PERCENTAGE" ? "% Ej. 10" : "$ Monto"}
                    className="w-full text-base font-black p-3 border border-white/5 bg-[#181818] rounded-xl focus:border-primary outline-none text-center text-[#E0E0E0] transition-colors placeholder:text-[#E0E0E0]/30"
                  />
                )}
              </div>

              <div className="flex flex-col gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={handleUpdateTip}
                  disabled={isSubmitting}
                  className="w-full bg-primary text-black py-3.5 rounded-xl font-black text-sm hover:brightness-105 shadow-lg shadow-primary/10 disabled:opacity-30 transition-all uppercase tracking-wider"
                >
                  {isSubmitting ? "Actualizando..." : "Actualizar Propina"}
                </button>
                <button
                  type="button"
                  onClick={() => setEditingTipOrder(null)}
                  className="w-full bg-white/5 text-[#E0E0E0]/60 py-2.5 rounded-xl font-black text-xs hover:bg-white/10 transition-all uppercase tracking-wider border border-white/5"
                >
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
