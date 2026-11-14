"use client";

import React, {
  useState,
  useEffect,
  useMemo,
  createContext,
  useContext,
} from "react";
import {
  Order,
  OrderFormState,
  MenuItem,
  OrderItemDraft,
  ModifyItem,
  OrderServiceType,
} from "@/types/pos";
import {
  buildSelectionSnapshot,
  hasCustomization,
  normalizeSelections,
  priceSelection,
  selectionKey,
  selectionsEqual,
  type Selection,
  type SelectionSnapshotLine,
} from "@/lib/customization";
import { useOptionalTenant } from "@/components/TenantProvider";
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

/** ¿El producto abre el modal de personalización? */
export const isCustomizableMenuItem = (
  menuItem: Pick<MenuItem, "customization"> | null | undefined,
) => hasCustomization(menuItem?.customization);

export interface DraftPricing {
  /** Precio unitario final (base + niveles + opciones). */
  unitPrice: number;
  /** Base del descuento por artículo (null = unitPrice). */
  discountBasePrice: number | null;
  lines: SelectionSnapshotLine[];
  customizable: boolean;
}

/** Precio y líneas de un renglón del carrito según la personalización. */
export function priceDraftItem(
  product: MenuItem | undefined,
  selections: Selection[] | undefined,
  discountIncludesModifiers: boolean,
): DraftPricing {
  if (!product) {
    return { unitPrice: 0, discountBasePrice: null, lines: [], customizable: false };
  }
  if (!hasCustomization(product.customization)) {
    return {
      unitPrice: product.price,
      discountBasePrice: null,
      lines: [],
      customizable: false,
    };
  }
  const price = priceSelection(product.price, product.customization, selections);
  return {
    unitPrice: price.unitPrice,
    discountBasePrice: discountIncludesModifiers ? null : price.basePrice,
    lines: buildSelectionSnapshot(product.customization, selections),
    customizable: true,
  };
}

/** Agrega un renglón o suma 1 al renglón idéntico (producto+selección+nota, sin descuento). */
export function addOrMergeDraft(
  items: OrderItemDraft[],
  menuItemId: string,
  selections: Selection[] = [],
): OrderItemDraft[] {
  const key = selectionKey(menuItemId, selections, "");
  const existingIndex = items.findIndex(
    (item) =>
      !item.discountType &&
      selectionKey(item.menuItemId, item.selections, item.notes) === key,
  );
  if (existingIndex >= 0) {
    const next = [...items];
    next[existingIndex] = {
      ...next[existingIndex],
      quantity: (Number(next[existingIndex].quantity) + 1).toString(),
    };
    return next;
  }
  const normalized = normalizeSelections(selections);
  return [
    ...items,
    {
      menuItemId,
      quantity: "1",
      notes: "",
      ...(normalized.length > 0 ? { selections: normalized } : {}),
    },
  ];
}

export type CustomizationRequest = {
  menuItem: MenuItem;
  initialSelections: Selection[];
} & (
  | { kind: "cart-new" }
  | { kind: "cart-edit"; index: number }
  | { kind: "additional-new" }
  | { kind: "additional-edit"; index: number }
  | { kind: "modify-edit"; index: number }
);

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
  return usePOSCartInternal(
    availableMenuItems || [],
    refreshOrders || (async () => []),
  );
}

function usePOSCartInternal(
  availableMenuItems: MenuItem[],
  refreshOrders: () => Promise<Order[]>,
) {
  const [formState, setFormState] = useState<OrderFormState>(emptyForm);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [cartError, setCartError] = useState<string | null>(null);

  const tenant = useOptionalTenant();
  const discountIncludesModifiers = tenant?.discount_includes_modifiers !== false;

  // Personalización: modal abierto para un producto/renglón
  const [customizationRequest, setCustomizationRequest] =
    useState<CustomizationRequest | null>(null);
  // Reimpresión de comanda tras editar personalización
  const [reprintRequest, setReprintRequest] = useState<{
    orderId: string;
    itemIds: string[];
  } | null>(null);

  // Edit Order State (add items)
  const [editingOrder, setEditingOrderState] = useState<Order | null>(null);
  const [additionalItems, setAdditionalItems] = useState<OrderItemDraft[]>([]);
  const [addItemsSuccessNotification, setAddItemsSuccessNotification] =
    useState<{
      order: Order;
      orderNumber: string;
    } | null>(null);

  const setEditingOrder = React.useCallback((order: Order | null) => {
    setEditingOrderState(order);
    if (order) {
      setAdditionalItems([]);
    }
  }, []);

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
  const clearCartArmRef = React.useRef<ReturnType<typeof setTimeout> | null>(
    null,
  );

  /** Pre-computed cart totals — avoids double .reduce() in consuming components */
  const totalCartItems = useMemo(
    () => formState.items.reduce((sum, item) => sum + Number(item.quantity), 0),
    [formState.items],
  );

  const availableMenuItemMap = useMemo(() => {
    const map = new Map<string, MenuItem>();
    for (let i = 0; i < availableMenuItems.length; i++) {
      map.set(availableMenuItems[i].id, availableMenuItems[i]);
    }
    return map;
  }, [availableMenuItems]);

  const getDraftPricing = React.useCallback(
    (item: Pick<OrderItemDraft, "menuItemId" | "selections">): DraftPricing =>
      priceDraftItem(
        availableMenuItemMap.get(item.menuItemId),
        item.selections,
        discountIncludesModifiers,
      ),
    [availableMenuItemMap, discountIncludesModifiers],
  );

  const cartTotals = useMemo(() => {
    return calculateOrderDiscountTotals({
      items: formState.items.map((item) => {
        const pricing = getDraftPricing(item);
        return {
          unitPrice: pricing.unitPrice,
          quantity: Number(item.quantity) || 0,
          discountType: item.discountType,
          discountValue: item.discountValue,
          discountScope: item.discountScope,
          discountBasePrice: pricing.discountBasePrice,
        };
      }),
      orderDiscountType: formState.discountType,
      orderDiscountValue: formState.discountValue,
    });
  }, [
    formState.items,
    formState.discountType,
    formState.discountValue,
    getDraftPricing,
  ]);

  const cartTotal = cartTotals.total;

  const modifyOrderTotals = useMemo(() => {
    return calculateOrderDiscountTotals({
      items: modifyItems.map((item) => ({
        unitPrice: item.unitPrice,
        quantity: item.quantity,
        discountType: item.discountType,
        discountValue: item.discountValue,
        discountScope: item.discountScope,
        discountBasePrice: item.discountBasePrice ?? null,
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
    if (isCustomizableMenuItem(menuItem)) {
      setCustomizationRequest({
        kind: "cart-new",
        menuItem,
        initialSelections: [],
      });
      return;
    }

    setFormState((prev) => ({
      ...prev,
      items: addOrMergeDraft(prev.items, menuItem.id),
    }));
  };

  /** Reabre el modal para cambiar la selección de un renglón del carrito. */
  const openCartItemCustomization = (index: number) => {
    const item = formState.items[index];
    const menuItem = item && availableMenuItemMap.get(item.menuItemId);
    if (!item || !menuItem || !isCustomizableMenuItem(menuItem)) return;
    setCustomizationRequest({
      kind: "cart-edit",
      index,
      menuItem,
      initialSelections: item.selections || [],
    });
  };

  const openAdditionalItemCustomization = (index: number) => {
    const item = additionalItems[index];
    const menuItem = item && availableMenuItemMap.get(item.menuItemId);
    if (!item || !menuItem || !isCustomizableMenuItem(menuItem)) return;
    setCustomizationRequest({
      kind: "additional-edit",
      index,
      menuItem,
      initialSelections: item.selections || [],
    });
  };

  const openModifyItemCustomization = (index: number) => {
    const item = modifyItems[index];
    const menuItem = item && availableMenuItemMap.get(item.menuItemId);
    if (!item || !menuItem || !isCustomizableMenuItem(menuItem)) return;
    setCustomizationRequest({
      kind: "modify-edit",
      index,
      menuItem,
      initialSelections: item.selections || [],
    });
  };

  const cancelCustomization = () => setCustomizationRequest(null);

  const confirmCustomization = (selections: Selection[]) => {
    const request = customizationRequest;
    if (!request) return;
    const normalized = normalizeSelections(selections);
    switch (request.kind) {
      case "cart-new":
        setFormState((prev) => ({
          ...prev,
          items: addOrMergeDraft(prev.items, request.menuItem.id, normalized),
        }));
        break;
      case "cart-edit":
        setFormState((prev) => {
          const nextItems = [...prev.items];
          if (!nextItems[request.index]) return prev;
          nextItems[request.index] = {
            ...nextItems[request.index],
            selections: normalized,
          };
          return { ...prev, items: nextItems };
        });
        break;
      case "additional-new":
        setAdditionalItems((prev) =>
          addOrMergeDraft(prev, request.menuItem.id, normalized),
        );
        break;
      case "additional-edit":
        setAdditionalItems((prev) => {
          const next = [...prev];
          if (!next[request.index]) return prev;
          next[request.index] = { ...next[request.index], selections: normalized };
          return next;
        });
        break;
      case "modify-edit":
        setModifyItems((prev) => {
          const next = [...prev];
          const current = next[request.index];
          if (!current) return prev;
          const pricing = priceDraftItem(
            request.menuItem,
            normalized,
            discountIncludesModifiers,
          );
          const original = modifyingOrder?.orderItems?.find(
            (o) => o.id === current.id,
          );
          const changed = !selectionsEqual(original?.selections || [], normalized);
          const { discountAmount } = calculateItemDiscount({
            unitPrice: pricing.unitPrice,
            quantity: current.quantity,
            discountType: current.discountType,
            discountValue: current.discountValue,
            discountScope: current.discountScope,
            discountBasePrice: pricing.discountBasePrice,
          });
          next[request.index] = {
            ...current,
            selections: normalized,
            selectionLines: changed
              ? pricing.lines
              : original?.selectionLines || pricing.lines,
            unitPrice: changed ? pricing.unitPrice : original?.unitPrice ?? pricing.unitPrice,
            discountBasePrice: changed
              ? pricing.discountBasePrice
              : original?.discountBasePrice ?? null,
            discountAmount,
            selectionChanged: changed,
          };
          return next;
        });
        break;
    }
    setCustomizationRequest(null);
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
      const targetItem = nextItems[index];
      if (!targetItem) return prev;
      const pricing = getDraftPricing(targetItem);
      const { discountAmount } = calculateItemDiscount({
        unitPrice: pricing.unitPrice,
        quantity: Number(targetItem.quantity) || 0,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        discountScope: discount.discountScope,
        discountBasePrice: pricing.discountBasePrice,
      });
      nextItems[index] = {
        ...targetItem,
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

  const handleApplyModifyItemDiscount = (
    index: number,
    discount: DiscountData,
  ) => {
    setModifyItems((prev) => {
      const next = [...prev];
      const { discountAmount } = calculateItemDiscount({
        unitPrice: next[index].unitPrice,
        quantity: next[index].quantity,
        discountType: discount.discountType,
        discountValue: discount.discountValue,
        discountScope: discount.discountScope,
        discountBasePrice: next[index].discountBasePrice ?? null,
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
      clearCartArmRef.current = setTimeout(
        () => setClearCartArmed(false),
        3000,
      );
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
          ...(item.selections && item.selections.length > 0
            ? { selections: item.selections }
            : {}),
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

  const quickAddAdditionalItem = (menuItem: MenuItem) => {
    if (isCustomizableMenuItem(menuItem)) {
      setCustomizationRequest({
        kind: "additional-new",
        menuItem,
        initialSelections: [],
      });
      return;
    }
    setAdditionalItems((prev) => addOrMergeDraft(prev, menuItem.id));
  };

  const updateAdditionalItemQty = (index: number, delta: number) => {
    setAdditionalItems((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const currentQty = Number(prev[index].quantity) || 0;
      const newQty = currentQty + delta;
      if (newQty <= 0) {
        return prev.filter((_, idx) => idx !== index);
      }
      const nextItems = [...prev];
      nextItems[index] = {
        ...nextItems[index],
        quantity: newQty.toString(),
      };
      return nextItems;
    });
  };

  const setAdditionalItemNotes = (index: number, notes: string) => {
    setAdditionalItems((prev) => {
      if (index < 0 || index >= prev.length) return prev;
      const nextItems = [...prev];
      nextItems[index] = {
        ...nextItems[index],
        notes,
      };
      return nextItems;
    });
  };

  const handleAddItems = async (
    e?: React.FormEvent,
    onSuccess?: (order: Order) => void,
  ) => {
    if (e) e.preventDefault();
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
            ...(item.selections && item.selections.length > 0
              ? { selections: item.selections }
              : {}),
          })),
        }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Error al agregar productos");

      const savedOrder = editingOrder;
      await refreshOrders();
      setEditingOrder(null);
      setAdditionalItems([]);
      setAddItemsSuccessNotification({
        order: savedOrder,
        orderNumber: savedOrder.orderNumber,
      });
      if (onSuccess) {
        onSuccess(savedOrder);
      }
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
        notes: item.notes || "",
        selections: item.selections || [],
        selectionLines: item.selectionLines || [],
        discountBasePrice: item.discountBasePrice ?? null,
        selectionChanged: false,
        discountType: item.discountType || null,
        discountValue: item.discountValue != null ? item.discountValue : null,
        discountAmount: item.discountAmount || 0,
        discountScope: item.discountScope || "ROW",
        discountReason: item.discountReason || null,
      })),
    );
  };

  const handleModifyNotesChange = (index: number, notes: string) => {
    setModifyItems((prev) => {
      const next = [...prev];
      if (next[index]) {
        next[index] = { ...next[index], notes };
      }
      return next;
    });
  };

  const hasUnsavedModifyChanges = useMemo(() => {
    if (!modifyingOrder) return false;

    // Table comparison
    if ((modifyTable || "") !== (modifyingOrder.table || "")) return true;

    // Customer comparison
    const origCustomerId =
      modifyingOrder.customerId || modifyingOrder.customer?.id || "";
    if ((modifyCustomerId || "") !== origCustomerId) return true;

    // Order discount comparison
    const origOrderDiscType = modifyingOrder.discountType || null;
    const currentOrderDiscType = modifyOrderDiscount.discountType || null;
    if (origOrderDiscType !== currentOrderDiscType) return true;

    const origOrderDiscVal =
      modifyingOrder.discountValue != null
        ? Number(modifyingOrder.discountValue)
        : null;
    const currentOrderDiscVal =
      modifyOrderDiscount.discountValue != null
        ? Number(modifyOrderDiscount.discountValue)
        : null;
    if (origOrderDiscVal !== currentOrderDiscVal) return true;

    const origOrderDiscReason = modifyingOrder.discountReason || null;
    const currentOrderDiscReason = modifyOrderDiscount.discountReason || null;
    if (origOrderDiscReason !== currentOrderDiscReason) return true;

    // Items comparison
    const origItems = modifyingOrder.orderItems || [];
    if (modifyItems.length !== origItems.length) return true;

    const origItemMap = new Map(origItems.map((item) => [item.id, item]));
    for (const item of modifyItems) {
      const orig = origItemMap.get(item.id);
      if (!orig) return true;
      if (item.selectionChanged) return true;
      if (item.quantity !== Number(orig.quantity)) return true;
      if ((item.notes || "") !== (orig.notes || "")) return true;

      const origItemDiscType = orig.discountType || null;
      const currentItemDiscType = item.discountType || null;
      if (origItemDiscType !== currentItemDiscType) return true;

      const origItemDiscVal =
        orig.discountValue != null ? Number(orig.discountValue) : null;
      const currentItemDiscVal =
        item.discountValue != null ? Number(item.discountValue) : null;
      if (origItemDiscVal !== currentItemDiscVal) return true;

      const origItemScope = orig.discountScope || "ROW";
      const currentItemScope = item.discountScope || "ROW";
      if (origItemScope !== currentItemScope) return true;

      const origItemReason = orig.discountReason || null;
      const currentItemReason = item.discountReason || null;
      if (origItemReason !== currentItemReason) return true;
    }

    return false;
  }, [
    modifyingOrder,
    modifyItems,
    modifyTable,
    modifyCustomerId,
    modifyOrderDiscount,
  ]);

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

  const handleSaveModifiedOrder = async (pin?: string): Promise<boolean> => {
    if (!modifyingOrder) return false;
    if (modifyItems.length === 0) {
      setCartError("La orden debe tener al menos un producto.");
      return false;
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
            ...(item.selectionChanged ? { selections: item.selections || [] } : {}),
            notes: item.notes ? item.notes.trim() || null : null,
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
      if (Array.isArray(data?.reprintItemIds) && data.reprintItemIds.length > 0) {
        setReprintRequest({ orderId: modifyingOrder.id, itemIds: data.reprintItemIds });
      }
      setModifyingOrder(null);
      setModifyItems([]);
      setModifyTable("");
      setModifyCustomerId("");
      setModifyOrderDiscount({
        discountType: null,
        discountValue: null,
        discountReason: null,
      });
      return true;
    } catch (error) {
      setCartError(
        error instanceof Error ? error.message : "Error al modificar orden",
      );
      return false;
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

    // Personalización
    getDraftPricing,
    discountIncludesModifiers,
    customizationRequest,
    openCartItemCustomization,
    openAdditionalItemCustomization,
    openModifyItemCustomization,
    confirmCustomization,
    cancelCustomization,
    reprintRequest,
    setReprintRequest,

    // Additional items (editing existing order)
    additionalItems,
    setAdditionalItems,
    editingOrder,
    setEditingOrder,
    quickAddAdditionalItem,
    updateAdditionalItemQty,
    setAdditionalItemNotes,
    addItemsSuccessNotification,
    setAddItemsSuccessNotification,
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
    hasUnsavedModifyChanges,
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
    handleModifyNotesChange,
    handleModifyRemoveItem,
    handleSaveModifiedOrder,
    handleCancelOrder,
  };
}
