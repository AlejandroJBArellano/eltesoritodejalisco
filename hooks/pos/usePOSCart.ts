"use client";

import React, { useState, useEffect, useMemo, createContext, useContext } from "react";
import {
  Order,
  OrderFormState,
  MenuItem,
  OrderItemDraft,
  ModifyItem,
  MixedFlavor,
  MIXED_ORDER_TOTAL,
  MIXED_ORDER_FLAVORS,
  OrderServiceType,
} from "@/types/pos";
import { resolveTableValue } from "@/lib/utils/serviceType";
import {
  calculateItemDiscount,
  calculateOrderDiscountTotals,
} from "@/lib/utils/discounts";
import type { DiscountData } from "@/components/pos/modals/POSDiscountModal";

const emptyForm: OrderFormState = {
  customerId: "",
  source: "Otro",
  serviceType: "COMEDOR",
  table: "",
  notes: "",
  items: [],
  discountType: null,
  discountValue: null,
  discountReason: null,
};

const MIXED_ORDER_KEYWORD = "orden mixta";

const emptyFlavorCounts = (): Record<MixedFlavor, number> =>
  Object.fromEntries(MIXED_ORDER_FLAVORS.map((f) => [f, 0])) as Record<
    MixedFlavor,
    number
  >;

export const isMixedOrderItem = (name: string) =>
  name.toLowerCase().includes(MIXED_ORDER_KEYWORD);

export const formatMixedNotes = (counts: Record<MixedFlavor, number>) =>
  MIXED_ORDER_FLAVORS.filter((f) => counts[f] > 0)
    .map((f) => `${counts[f]}x ${f}`)
    .join(", ");

type POSCartValue = ReturnType<typeof usePOSCartInternal>;
const POSCartContext = createContext<POSCartValue | null>(null);

export function POSCartProvider({
  children,
  availableMenuItems,
  refreshOrders,
}: {
  children: React.ReactNode;
  availableMenuItems: MenuItem[];
  refreshOrders: () => Promise<Order[]>;
}) {
  const value = usePOSCartInternal(availableMenuItems, refreshOrders);
  return React.createElement(POSCartContext.Provider, { value }, children);
}

export function usePOSCart(
  availableMenuItems?: MenuItem[],
  refreshOrders?: () => Promise<Order[]>,
) {
  const context = useContext(POSCartContext);
  if (context) return context;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return usePOSCartInternal(availableMenuItems || [], refreshOrders || (async () => []));
}

function usePOSCartInternal(
  availableMenuItems: MenuItem[],
  refreshOrders: () => Promise<Order[]>,
) {
  const [formState, setFormState] = useState<OrderFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [cartError, setCartError] = useState<string | null>(null);

  // Mixed Order State
  const [mixedOrderMenuItem, setMixedOrderMenuItem] = useState<MenuItem | null>(
    null,
  );
  const [mixedFlavorCounts, setMixedFlavorCounts] =
    useState<Record<MixedFlavor, number>>(emptyFlavorCounts());

  // Edit Order State (add items)
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [additionalItems, setAdditionalItems] = useState<OrderItemDraft[]>([
    { menuItemId: "", quantity: "1", notes: "" },
  ]);

  // Modify Order State (edit/remove existing items, table and customer)
  const [modifyingOrder, setModifyingOrder] = useState<Order | null>(null);
  const [modifyItems, setModifyItems] = useState<ModifyItem[]>([]);
  const [modifyTable, setModifyTable] = useState<string>("");
  const [modifyCustomerId, setModifyCustomerId] = useState<string>("");
  const [modifyOrderDiscount, setModifyOrderDiscount] = useState<DiscountData>({
    discountType: null,
    discountValue: null,
    discountReason: null,
  });
  const [isSubmittingCart, setIsSubmittingCart] = useState(false);

  // Two-step clear cart: null = idle, true = armed (waiting for confirm click)
  const [clearCartArmed, setClearCartArmed] = useState(false);
  // Ref to cancel the auto-reset timer on unmount
  const clearCartArmRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  /** Pre-computed cart totals — avoids double .reduce() in consuming components */
  const totalCartItems = useMemo(
    () => formState.items.reduce((sum, item) => sum + Number(item.quantity), 0),
    [formState.items],
  );

  const cartTotals = useMemo(() => {
    return calculateOrderDiscountTotals({
      items: formState.items.map((item) => {
        const product = availableMenuItems.find((m) => m.id === item.menuItemId);
        return {
          unitPrice: product?.price || 0,
          quantity: Number(item.quantity) || 0,
          discountType: item.discountType,
          discountValue: item.discountValue,
          discountScope: item.discountScope,
        };
      }),
      orderDiscountType: formState.discountType,
      orderDiscountValue: formState.discountValue,
    });
  }, [formState.items, formState.discountType, formState.discountValue, availableMenuItems]);

  const cartTotal = cartTotals.total;

  const modifyOrderTotals = useMemo(() => {
    return calculateOrderDiscountTotals({
      items: modifyItems.map((item) => ({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountType: item.discountType,
        discountValue: item.discountValue,
        discountScope: item.discountScope,
      })),
      orderDiscountType: modifyOrderDiscount.discountType,
      orderDiscountValue: modifyOrderDiscount.discountValue,
    });
  }, [modifyItems, modifyOrderDiscount]);

  // Initializing default empty cart
  useEffect(() => {
    if (availableMenuItems.length > 0) {
      setFormState((prev) => {
        if (prev.items.length === 1 && prev.items[0].menuItemId === "") {
          const nextItems = [...prev.items];
          nextItems[0] = {
            ...nextItems[0],
            menuItemId: availableMenuItems[0].id,
          };
          return { ...prev, items: nextItems };
        }
        return prev;
      });

      setAdditionalItems((prev) => {
        if (prev.length === 1 && prev[0].menuItemId === "") {
          const nextItems = [...prev];
          nextItems[0] = {
            ...nextItems[0],
            menuItemId: availableMenuItems[0].id,
          };
          return nextItems;
        }
        return prev;
      });
    }
  }, [availableMenuItems]);

  const handleFormChange = <K extends keyof OrderFormState>(
    field: K,
    value: OrderFormState[K],
  ) => {
    setFormState((prev) => ({ ...prev, [field]: value }));
  };

  const handleServiceTypeChange = (serviceType: OrderServiceType) => {
    setFormState((prev) => ({ ...prev, serviceType }));
  };

  const handleGridItemClick = (menuItem: MenuItem) => {
    if (isMixedOrderItem(menuItem.name)) {
      setMixedOrderMenuItem(menuItem);
      setMixedFlavorCounts(emptyFlavorCounts());
      return;
    }

    setFormState((prev) => {
      const existingIndex = prev.items.findIndex(
        (item) => item.menuItemId === menuItem.id && item.notes === "",
      );
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
        items: [
          ...prev.items,
          { menuItemId: menuItem.id, quantity: "1", notes: "" },
        ],
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
      nextItems[index] = {
        ...nextItems[index],
        quantity: newQuantity.toString(),
      };
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

  const handleApplyItemDiscount = (index: number, discount: DiscountData) => {
    setFormState((prev) => {
      const nextItems = [...prev.items];
      const product = availableMenuItems.find((m) => m.id === nextItems[index].menuItemId);
      const { discountAmount } = calculateItemDiscount({
        unitPrice: product?.price || 0,
        quantity: Number(nextItems[index].quantity) || 0,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        discountScope: discount.discountScope,
      });
      nextItems[index] = {
        ...nextItems[index],
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        discountAmount,
        discountScope: discount.discountScope,
        discountReason: discount.discountReason,
      };
      return { ...prev, items: nextItems };
    });
  };

  const handleRemoveItemDiscount = (index: number) => {
    handleApplyItemDiscount(index, {
      discountType: null,
      discountValue: null,
      discountScope: null,
      discountReason: null,
    });
  };

  const handleApplyOrderDiscount = (discount: DiscountData) => {
    setFormState((prev) => ({
      ...prev,
      discountType: discount.discountType,
      discountValue: discount.discountValue,
      discountReason: discount.discountReason,
    }));
  };

  const handleRemoveOrderDiscount = () => {
    handleApplyOrderDiscount({
      discountType: null,
      discountValue: null,
      discountReason: null,
    });
  };

  const handleApplyModifyItemDiscount = (index: number, discount: DiscountData) => {
    setModifyItems((prev) => {
      const next = [...prev];
      const { discountAmount } = calculateItemDiscount({
        unitPrice: next[index].unitPrice,
        quantity: next[index].quantity,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        discountScope: discount.discountScope,
      });
      next[index] = {
        ...next[index],
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        discountAmount,
        discountScope: discount.discountScope,
        discountReason: discount.discountReason,
      };
      return next;
    });
  };

  const handleRemoveModifyItemDiscount = (index: number) => {
    handleApplyModifyItemDiscount(index, {
      discountType: null,
      discountValue: null,
      discountScope: null,
      discountReason: null,
    });
  };

  const handleApplyModifyOrderDiscount = (discount: DiscountData) => {
    setModifyOrderDiscount(discount);
  };

  const handleRemoveModifyOrderDiscount = () => {
    setModifyOrderDiscount({
      discountType: null,
      discountValue: null,
      discountReason: null,
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
      clearCartArmRef.current = setTimeout(() => setClearCartArmed(false), 3000);
      return;
    }
    if (clearCartArmRef.current) clearTimeout(clearCartArmRef.current);
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
    setCheckoutOrder: (order: Order) => void,
  ) => {
    event.preventDefault();
    const errors = validateForm();
    if (Object.keys(errors).length > 0) return;

    try {
      setIsSubmittingCart(true);
      setCartError(null);
      const resolvedTable = resolveTableValue(
        formState.serviceType,
        formState.table,
      );
      const payload = {
        customerId: formState.customerId || undefined,
        source: formState.source,
        table: resolvedTable || undefined,
        notes: formState.notes || undefined,
        discountType: formState.discountType || undefined,
        discountValue: formState.discountValue || undefined,
        discountReason: formState.discountReason || undefined,
        orderItems: formState.items.map((item) => ({
          menuItemId: item.menuItemId,
          quantity: Number(item.quantity),
          notes: item.notes || undefined,
          discountType: item.discountType || undefined,
          discountValue: item.discountValue || undefined,
          discountScope: item.discountScope || undefined,
          discountReason: item.discountReason || undefined,
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
      const newOrder =
        orders.find((o: Order) => o.id === data.order.id) || data.order;
      setCheckoutOrder(newOrder);
      clearForm();
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "Error al procesar",
      );
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
      setAdditionalItems([
        {
          menuItemId: availableMenuItems[0]?.id || "",
          quantity: "1",
          notes: "",
        },
      ]);
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "Error al actualizar orden",
      );
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
    setModifyTable(order.table || "");
    setModifyCustomerId(order.customerId || order.customer?.id || "");
    setModifyOrderDiscount({
      discountType: order.discountType || null,
      discountValue: order.discountValue != null ? order.discountValue : null,
      discountReason: order.discountReason || null,
    });
    setModifyItems(
      (order.orderItems || []).map((item) => ({
        id: item.id,
        menuItemId: item.menuItemId,
        quantity: Number(item.quantity),
        unitPrice: item.unitPrice,
        menuItemName: item.menuItem?.name || "Producto",
        discountType: item.discountType || null,
        discountValue: item.discountValue != null ? item.discountValue : null,
        discountAmount: item.discountAmount || 0,
        discountScope: item.discountScope || "ROW",
        discountReason: item.discountReason || null,
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

  const handleSaveModifiedOrder = async (pin?: string) => {
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
            discountType: item.discountType || null,
            discountValue: item.discountValue || null,
            discountScope: item.discountScope || "ROW",
            discountReason: item.discountReason || null,
          })),
          table: modifyTable || undefined,
          customerId: modifyCustomerId || null,
          discountType: modifyOrderDiscount.discountType || null,
          discountValue: modifyOrderDiscount.discountValue || null,
          discountReason: modifyOrderDiscount.discountReason || null,
          pin,
        }),
      });
      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Error al modificar orden");
      await refreshOrders();
      setModifyingOrder(null);
      setModifyItems([]);
      setModifyTable("");
      setModifyCustomerId("");
      setModifyOrderDiscount({
        discountType: null,
        discountValue: null,
        discountReason: null,
      });
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "Error al modificar orden",
      );
    } finally {
      setIsSubmittingCart(false);
    }
  };

  const handleCancelOrder = async (orderId: string, pin?: string) => {
    try {
      setIsSubmittingCart(true);
      setCartError(null);
      const response = await fetch(`/api/orders/${orderId}`, {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin }),
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data?.error || "Error al cancelar orden");
      }
      await refreshOrders();
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "Error al cancelar orden",
      );
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
    handleServiceTypeChange,
    handleGridItemClick,
    handleQuantityChange,
    handleItemNoteChange,
    handleClearCart,
    clearCartArmed,
    totalCartItems,
    cartTotal,
    cartTotals,
    handleApplyItemDiscount,
    handleRemoveItemDiscount,
    handleApplyOrderDiscount,
    handleRemoveOrderDiscount,

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
    modifyTable,
    setModifyTable,
    modifyCustomerId,
    setModifyCustomerId,
    modifyOrderDiscount,
    modifyOrderTotals,
    handleApplyModifyItemDiscount,
    handleRemoveModifyItemDiscount,
    handleApplyModifyOrderDiscount,
    handleRemoveModifyOrderDiscount,
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
