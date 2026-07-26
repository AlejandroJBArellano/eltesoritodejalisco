import { useState, useMemo } from "react";
import { Order } from "@/types/pos";
import { getOrderTipAmount } from "@/components/pos/paymentUtils";
import type { SplitPayment } from "@/components/pos/SplitBillModal";

export function usePOSCheckout(refreshOrders: () => Promise<Order[]>) {
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Checkout & Print State
  const [checkoutOrder, setCheckoutOrder] = useState<Order | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<string>("CASH");
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [showTicket, setShowTicket] = useState(false);
  const [showKitchenTicket, setShowKitchenTicket] = useState(false);
  const [tipType, setTipType] = useState<"NONE" | "PERCENTAGE" | "FIXED">("NONE");
  const [tipInput, setTipInput] = useState<string>("");

  // WhatsApp Modal
  const [showWhatsAppModal, setShowWhatsAppModal] = useState(false);
  const [whatsappNumber, setWhatsappNumber] = useState("");

  // Tip Modification State for Paid Orders
  const [editingTipOrder, setEditingTipOrder] = useState<Order | null>(null);
  const [editTipType, setEditTipType] = useState<"NONE" | "PERCENTAGE" | "FIXED">("NONE");
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
    const diff = Number(receivedAmount) - (checkoutOrder.total + tipAmountCalculated);
    return diff > 0 ? diff : 0;
  }, [checkoutOrder, receivedAmount, tipAmountCalculated]);

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
      const updatedOrders = await refreshOrders();
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
      const updatedOrders = await refreshOrders();
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
      await refreshOrders();
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

      await refreshOrders();
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

      await refreshOrders();
      if (!orderToProcess) setCheckoutOrder(null);
      alert("Orden marcada como 'No Cobrada' exitosamente.");
    } catch (error) {
      alert(error instanceof Error ? error.message : "Error al procesar");
    } finally {
      setIsSubmitting(false);
    }
  };

  const generateWhatsAppMessage = () => {
    if (!checkoutOrder) return "";
    let msg = `¡Gracias por tu visita a ${process.env.NEXT_PUBLIC_APP_NAME || "El Tesorito de Jalisco"}! 🌮🤩\n\n`;
    msg += `🧾 *Ticket #${checkoutOrder.orderNumber}*\n`;
    if (checkoutOrder.table) {
      msg += `📍 Mesa: ${checkoutOrder.table}\n`;
    }
    msg += `\n*Resumen de tu orden:*\n`;
    checkoutOrder.orderItems?.forEach((item: { quantity: number; menuItem?: { name?: string }; unitPrice?: number }) => {
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

  return {
    isSubmittingCheckout: isSubmitting,
    checkoutOrder, setCheckoutOrder,
    paymentMethod, setPaymentMethod,
    receivedAmount, setReceivedAmount,
    showTicket, setShowTicket,
    showKitchenTicket, setShowKitchenTicket,
    tipType, setTipType,
    tipInput, setTipInput,
    tipAmountCalculated,
    change,
    
    showWhatsAppModal, setShowWhatsAppModal,
    whatsappNumber, setWhatsappNumber,
    generateWhatsAppMessage,

    editingTipOrder, setEditingTipOrder,
    editTipType, setEditTipType,
    editTipInput, setEditTipInput,
    editTipAmountCalculated,

    showSplitBill, setShowSplitBill,
    billingOrder, setBillingOrder,

    handleProcessPayment,
    handleSplitPayment,
    handleUpdateTip,
    handleUndoPayment,
    handleFailedPayment
  };
}
