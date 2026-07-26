"use client";

import { useState, useMemo, useEffect } from "react";
import { Order, OrderFormState, MenuItem, OrderItemDraft, ModifyItem, MixedFlavor, MIXED_ORDER_TOTAL, MIXED_ORDER_FLAVORS } from "@/types/pos";

const emptyForm: OrderFormState = {
  customerId: "",
  source: "Otro",
  table: "",
  notes: "",
  items: [],
};

const MIXED_ORDER_KEYWORD = "orden mixta";

const emptyFlavorCounts = (): Record<MixedFlavor, number> =>
  Object.fromEntries(MIXED_ORDER_FLAVORS.map((f) => [f, 0])) as Record<MixedFlavor, number>;

export const isMixedOrderItem = (name: string) =>
  name.toLowerCase().includes(MIXED_ORDER_KEYWORD);

export const formatMixedNotes = (counts: Record<MixedFlavor, number>) =>
  MIXED_ORDER_FLAVORS.filter((f) => counts[f] > 0)
    .map((f) => `${counts[f]}x ${f}`)
    .join(", ");

export function usePOSCart(availableMenuItems: MenuItem[], refreshOrders: () => Promise<Order[]>) {
  const [formState, setFormState] = useState<OrderFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [cartError, setCartError] = useState<string | null>(null);

  // Mixed Order State
  const [mixedOrderMenuItem, setMixedOrderMenuItem] = useState<MenuItem | null>(null);
  const [mixedFlavorCounts, setMixedFlavorCounts] = useState<Record<MixedFlavor, number>>(emptyFlavorCounts());

  // Edit Order State (add items)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [additionalItems, setAdditionalItems] = useState<OrderItemDraft[]>([
    { menuItemId: "", quantity: "1", notes: "" },
  ]);

  // Modify Order State (edit/remove existing items)
  const [modifyingOrder, setModifyingOrder] = useState<Order | null>(null);
  const [modifyItems, setModifyItems] = useState<ModifyItem[]>([]);
  const [isSubmittingCart, setIsSubmittingCart] = useState(false);

  // Two-step clear cart: null = idle, true = armed (waiting for confirm click)
  const [clearCartArmed, setClearCartArmed] = useState(false);

  // Initializing default empty cart
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
      const existingIndex = prev.items.findIndex((item) => item.menuItemId === menuItem.id && item.notes === "");
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

  const handleItemNoteChange = (index: number, notes: string) => {
    setFormState((prev) => {
      const nextItems = [...prev.items];
      nextItems[index] = { ...nextItems[index], notes };
      return { ...prev, items: nextItems };
    });
  };

  /**
   * Two-step clear cart.
   * First call: arms the confirmation (sets clearCartArmed = true).
   * Second call: actually clears.
   * Armed state auto-resets after 3 seconds if not confirmed.
   */
  const handleClearCart = () => {
    if (!clearCartArmed) {
      setClearCartArmed(true);
      setTimeout(() => setClearCartArmed(false), 3000);
      return;
    }
    setFormState((prev) => ({ ...prev, items: [] }));
    setClearCartArmed(false);
  };

  const validateForm = () => {
    const errors: Record<string, string> = {};
    if (!formState.source) errors.source = "Selecciona una fuente";
    if (!formState.items.length) errors.items = "Agrega al menos un producto";
    setFormErrors(errors);
    return errors;
  };

  const clearForm = () => {
    setFormState(emptyForm);
    setFormErrors({});
    setCartError(null);
  };

  const handleCheckoutSubmit = async (
    event: React.FormEvent<HTMLFormElement>,
    setCheckoutOrder: (order: Order) => void
  ) => {
    event.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) return;

    try {
      setIsSubmittingCart(true);
      setCartError(null);
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

      const orders = await refreshOrders();
      const newOrder = orders.find((o: Order) => o.id === data.order.id) || data.order;
      setCheckoutOrder(newOrder);
      clearForm();
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Error al procesar");
    } finally {
      setIsSubmittingCart(false);
    }
  };

  const handleAddItems = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingOrder) return;

    const validItems = additionalItems.filter(
      (item) => item.menuItemId && Number(item.quantity) > 0,
    );

    if (validItems.length === 0) {
      setCartError("Agrega al menos un producto válido");
      return;
    }

    try {
      setIsSubmittingCart(true);
      setCartError(null);
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

      await refreshOrders();
      setEditingOrder(null);
      setAdditionalItems([{ menuItemId: availableMenuItems[0]?.id || "", quantity: "1", notes: "" }]);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Error al actualizar orden");
    } finally {
      setIsSubmittingCart(false);
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
      setCartError("La orden debe tener al menos un producto.");
      return;
    }
    try {
      setIsSubmittingCart(true);
      setCartError(null);
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
      await refreshOrders();
      setModifyingOrder(null);
      setModifyItems([]);
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Error al modificar orden");
    } finally {
      setIsSubmittingCart(false);
    }
  };

  const handleCancelOrder = async (orderId: string, orderNumber: string) => {
    // cancelOrderArmed state is managed in the UI (page.tsx) via a separate per-row mechanism
    // This function is called only after the UI has done its two-step confirm
    try {
      setIsSubmittingCart(true);
      setCartError(null);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Error al cancelar orden");
      }
      await refreshOrders();
    } catch (error) {
      setCartError(error instanceof Error ? error.message : "Error al cancelar orden");
    } finally {
      setIsSubmittingCart(false);
    }
  };

  return {
    formState,
    formErrors,
    cartError,
    setCartError,
    handleFormChange,
    handleGridItemClick,
    handleQuantityChange,
    handleItemNoteChange,
    handleClearCart,
    clearCartArmed,

    // Mixed Order
    mixedOrderMenuItem,
    setMixedOrderMenuItem,
    mixedFlavorCounts,
    handleMixedFlavorChange,
    handleMixedOrderConfirm,

    // Additional items (editing existing order)
    additionalItems,
    setAdditionalItems,
    editingOrder,
    setEditingOrder,
    modifyingOrder,
    setModifyingOrder,
    modifyItems,
    setModifyItems,
    isSubmittingCart,
    handleCheckoutSubmit,
    handleAddItems,
    handleAdditionalItemChange,
    addAdditionalItemRow,
    removeAdditionalItemRow,
    openModifyModal,
    handleModifyQuantityChange,
    handleModifyRemoveItem,
    handleSaveModifiedOrder,
    handleCancelOrder,
  };
}
