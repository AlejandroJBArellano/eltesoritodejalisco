"use client";

import { getOrderTipAmount } from "@/components/pos/paymentUtils";
import type { SplitPayment } from "@/components/pos/SplitBillModal";
import { useTenant } from "@/components/TenantProvider";
import {
  calculateItemDiscount,
  calculateOrderDiscountTotals,
  DbDiscountFields,
} from "@/lib/utils/discounts";
import { formatServiceLabel } from "@/lib/utils/serviceType";
import { Order } from "@/types/pos";
import React, { createContext, useContext, useMemo, useState } from "react";

type POSCheckoutValue = ReturnType<typeof usePOSCheckoutInternal>;
const POSCheckoutContext = createContext<POSCheckoutValue | null>(null);

export function POSCheckoutProvider({
  children,
  refreshOrders,
}: {
  children: React.ReactNode;
  refreshOrders: () => Promise<Order[]>;
}) {
  const value = usePOSCheckoutInternal(refreshOrders);
  return React.createElement(POSCheckoutContext.Provider, { value }, children);
}

export function usePOSCheckout(refreshOrders?: () => Promise<Order[]>) {
  const context = useContext(POSCheckoutContext);
  if (context) return context;
  // eslint-disable-next-line react-hooks/rules-of-hooks
  return usePOSCheckoutInternal(refreshOrders || (async () => []));
}

function usePOSCheckoutInternal(refreshOrders: () => Promise<Order[]>) {
  const { name } = useTenant();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  // Checkout & Print State
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [showTicket, setShowTicket] = useState(false);
  const [showKitchenTicket, setShowKitchenTicket] = useState(false);
  const [tipType, setTipType] = useState<"NONE" | "PERCENTAGE" | "FIXED">(
    "NONE",
  );
  const [tipInput, setTipInput] = useState<string>("");

  // Unusual tip confirmation: if non-null, UI must show inline confirm before calling handleProcessPayment
  const [unusualTipInfo, setUnusualTipInfo] = useState<{
    amount: number;
    percentage: number;
  } | null>(null);

  // WhatsApp Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Tip Modification State for Paid Orders
  const [editingTipOrder, setEditingTipOrder] = useState<Order | null>(null);
  const [editTipType, setEditTipType] = useState<
    "NONE" | "PERCENTAGE" | "FIXED"
  >("NONE");
  const [editTipInput, setEditTipInput] = useState<string>("");

  // Split bill State
  const [showSplitBill, setShowSplitBill] = useState(false);

  // Facturacion State
  const [billingOrder, setBillingOrder] = useState<Order | null>(null);

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
    const diff =
      Number(receivedAmount) - (checkoutOrder.total + tipAmountCalculated);
    return diff > 0 ? diff : 0;
  }, [checkoutOrder, receivedAmount, tipAmountCalculated]);

  const handleProcessPayment = async (forceConfirmed = false) => {
    if (!checkoutOrder) return;

    const percentage = (tipAmountCalculated / checkoutOrder.total) * 100;
    const isUnusual =
      tipAmountCalculated > 0 && (percentage > 30 || tipAmountCalculated > 500);

    if (isUnusual && !forceConfirmed) {
      setUnusualTipInfo({ amount: tipAmountCalculated, percentage });
      return;
    }

    setUnusualTipInfo(null);

    try {
      setIsSubmitting(true);
      setCheckoutError(null);
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
      const updatedOrders = await refreshOrders();
      const updatedOrder =
        updatedOrders.find((o: Order) => o.id === checkoutOrder.id) ||
        checkoutOrder;
      setCheckoutOrder(updatedOrder);
      setShowTicket(true);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Error al procesar el pago",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCourtesyPayment = async (pin?: string) => {
    if (!checkoutOrder) return;
    try {
      setIsSubmitting(true);
      setCheckoutError(null);
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: checkoutOrder.id,
          method: "OTHER",
          amount: 0,
          receivedAmount: 0,
          change: 0,
          tipAmount: 0,
          ...(pin ? { pin } : {}),
        }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(errorData?.error || "Error al registrar cortesía");
      }
      const updatedOrders = await refreshOrders();
      const updatedOrder =
        updatedOrders?.find((o: Order) => o.id === checkoutOrder.id) ||
        checkoutOrder;
      setCheckoutOrder(updatedOrder);
      setShowTicket(true);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Error al registrar cortesía",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSplitPayment = async (splits: SplitPayment[]) => {
    if (!checkoutOrder) return;

    const totalTip = splits.reduce((sum, s) => sum + s.tipAmount, 0);
    const percentage =
      totalTip > 0 ? (totalTip / checkoutOrder.total) * 100 : 0;
    const isUnusual = totalTip > 0 && (percentage > 30 || totalTip > 500);

    if (isUnusual && !unusualTipInfo) {
      setUnusualTipInfo({ amount: totalTip, percentage });
      return;
    }

    setUnusualTipInfo(null);

    try {
      setIsSubmitting(true);
      setCheckoutError(null);
      const response = await fetch("/api/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderId: checkoutOrder.id, splits }),
      });
      if (!response.ok) throw new Error("Error al procesar el pago dividido");
      const updatedOrders = await refreshOrders();
      const updatedOrder =
        updatedOrders.find((o: Order) => o.id === checkoutOrder.id) ||
        checkoutOrder;
      setCheckoutOrder(updatedOrder);
      setShowSplitBill(false);
      setShowTicket(true);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Error al procesar el pago",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateTip = async (pin?: string) => {
    if (!editingTipOrder) return;

    const percentage = (editTipAmountCalculated / editingTipOrder.total) * 100;
    const isUnusual =
      editTipAmountCalculated > 0 &&
      (percentage > 30 || editTipAmountCalculated > 500);
    if (isUnusual && !unusualTipInfo) {
      setUnusualTipInfo({ amount: editTipAmountCalculated, percentage });
      return;
    }

    setUnusualTipInfo(null);

    try {
      setIsSubmitting(true);
      setCheckoutError(null);
      const response = await fetch("/api/payments", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId: editingTipOrder.id,
          tipAmount: editTipAmountCalculated,
          pin,
        }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Error al actualizar propina");
      }
      await refreshOrders();
      setEditingTipOrder(null);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Error al actualizar propina",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUndoPayment = async (
    orderId: string,
    pin?: string,
    reason?: string,
  ) => {
    try {
      setIsSubmitting(true);
      setCheckoutError(null);
      const response = await fetch(`/api/orders/${orderId}/undo-payment`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reason: reason || "Corrección post-cobro (3 min window)",
          pin,
        }),
      });

      if (!response.ok) {
        const data = await response.json().catch(() => ({}));
        throw new Error(data?.error || "Error al deshacer el pago");
      }

      await refreshOrders();
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Error al deshacer pago",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleFailedPayment = async (orderToProcess?: Order) => {
    const order = orderToProcess || checkoutOrder;
    if (!order) return;

    // Caller is responsible for confirming via inline UI before calling this
    try {
      setIsSubmitting(true);
      setCheckoutError(null);
      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "UNCOLLECTED",
        }),
      });

      if (!response.ok) throw new Error("Error al marcar como pago fallido");

      await refreshOrders();
      if (!orderToProcess) setCheckoutOrder(null);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Error al procesar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCreditPayment = async (orderToProcess?: Order) => {
    const order = orderToProcess || checkoutOrder;
    if (!order) return;

    try {
      setIsSubmitting(true);
      setCheckoutError(null);
      const customerName = order.customer?.name || "Cliente";
      const creditNote = order.notes
        ? `${order.notes} [CRÉDITO: ${customerName}]`
        : `[CRÉDITO: ${customerName}]`;

      const response = await fetch(`/api/orders/${order.id}/status`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "UNCOLLECTED",
          notes: creditNote,
        }),
      });

      if (!response.ok) throw new Error("Error al marcar orden a crédito");

      await refreshOrders();
      if (!orderToProcess) setCheckoutOrder(null);
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Error al procesar crédito",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateWhatsAppMessage = () => {
    if (!checkoutOrder) return "";
    let msg = `¡Gracias por tu visita a ${name}! 🌮🤩\n\n`;
    msg += `🧾 *Ticket #${checkoutOrder.orderNumber}*\n`;
    if (checkoutOrder.table) {
      msg += `📍 Servicio: ${formatServiceLabel(checkoutOrder.table)}\n`;
    }
    msg += `\n*Resumen de tu orden:*\n`;
    checkoutOrder.orderItems?.forEach((item) => {
      const quantity = item.quantity || 1;
      const itemName = item.menuItem?.name || "Producto";
      const itemPrice = item.unitPrice || 0;
      const gross = itemPrice * quantity;
      const rawItem = item as unknown as DbDiscountFields;
      const itemDiscount =
        Number(item.discountAmount ?? rawItem.discount_amount) ||
        calculateItemDiscount({
          unitPrice: itemPrice,
          quantity,
          discountType: item.discountType || rawItem.discount_type || null,
          discountValue: item.discountValue ?? rawItem.discount_value,
          discountScope: item.discountScope || rawItem.discount_scope || null,
        }).discountAmount ||
        0;
      if (itemDiscount > 0) {
        msg += `▪ ${quantity}x ${itemName} - $${(gross - itemDiscount).toFixed(2)} (Desc: -$${itemDiscount.toFixed(2)})\n`;
      } else {
        msg += `▪ ${quantity}x ${itemName} - $${gross.toFixed(2)}\n`;
      }
    });

    const rawCheckout = checkoutOrder as unknown as DbDiscountFields;

    const itemsInput = checkoutOrder.orderItems.map((it) => {
      const rawIt = it as unknown as DbDiscountFields;
      return {
        unitPrice: it.unitPrice || 0,
        quantity: it.quantity || 1,
        discountType: it.discountType || rawIt.discount_type || null,
        discountValue: it.discountValue ?? rawIt.discount_value ?? null,
        discountScope: it.discountScope || rawIt.discount_scope || "ROW",
      };
    });

    const calculatedTotals = calculateOrderDiscountTotals({
      items: itemsInput,
      orderDiscountType: checkoutOrder.discountType || rawCheckout.discount_type || null,
      orderDiscountValue: checkoutOrder.discountValue ?? rawCheckout.discount_value ?? null,
    });

    const orderDiscountTotal =
      Number(checkoutOrder.discountAmount ?? rawCheckout.discount_amount) ||
      calculatedTotals.orderDiscount ||
      0;
    if (orderDiscountTotal > 0) {
      const reason = checkoutOrder.discountReason || rawCheckout.discount_reason;
      msg += `\n*Descuento en orden: -$${orderDiscountTotal.toFixed(2)}${reason ? ` (${reason})` : ""}*\n`;
    }

    const tipAmount = getOrderTipAmount(checkoutOrder);
    msg += `\n*Total Pagado: $${(checkoutOrder.total + tipAmount).toFixed(2)}*\n`;
    if (tipAmount > 0) {
      msg += `(Incluye propina: $${tipAmount.toFixed(2)})\n`;
    }
    msg += `\n¡Esperamos verte pronto! 🌶️`;
    return encodeURIComponent(msg);
  };

  return {
    isSubmittingCheckout: isSubmitting,
    checkoutError,
    setCheckoutError,
    checkoutOrder,
    setCheckoutOrder,
    paymentMethod,
    setPaymentMethod,
    receivedAmount,
    setReceivedAmount,
    showTicket,
    setShowTicket,
    showKitchenTicket,
    setShowKitchenTicket,
    tipType,
    setTipType,
    tipInput,
    setTipInput,
    tipAmountCalculated,
    change,

    unusualTipInfo,
    setUnusualTipInfo,

    showWhatsAppModal,
    setShowWhatsAppModal,
    whatsappNumber,
    setWhatsappNumber,
    generateWhatsAppMessage,

    editingTipOrder,
    setEditingTipOrder,
    editTipType,
    setEditTipType,
    editTipInput,
    setEditTipInput,
    editTipAmountCalculated,

    showSplitBill,
    setShowSplitBill,
    billingOrder,
    setBillingOrder,

    handleProcessPayment,
    handleCourtesyPayment,
    handleSplitPayment,
    handleUpdateTip,
    handleUndoPayment,
    handleFailedPayment,
    handleCreditPayment,
  };
}
