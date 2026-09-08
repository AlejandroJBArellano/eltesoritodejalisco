import { useOptionalUser } from "@/components/UserProvider";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import {
  AlertCircle,
  AlertTriangle,
  CreditCard,
  DollarSign,
  Landmark,
  Receipt,
  Scissors,
  Tag,
  UserCheck,
  X,
} from "lucide-react";
import React, { useState } from "react";
import { POSDiscountModal, DiscountData } from "./POSDiscountModal";
import { POSManagerAuthModal } from "./POSManagerAuthModal";
import {
  calculateItemDiscount,
  calculateOrderDiscountTotals,
  formatDiscountBadge,
  DbDiscountFields,
} from "@/lib/utils/discounts";
import { formatServiceLabel } from "@/lib/utils/serviceType";
import { mapOrderData, DbOrderPayload } from "@/lib/mappers/orders";
import type { Order } from "@/types/pos";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Efectivo", icon: DollarSign },
  { value: "CARD", label: "Tarjeta", icon: CreditCard },
  { value: "TRANSFER", label: "Transferencia", icon: Landmark },
];

export function POSCheckoutModal() {
  const user = useOptionalUser();
  const isWaiter = user?.isWaiter ?? false;
  const [isCourtesyAuthModalOpen, setIsCourtesyAuthModalOpen] = useState(false);

  const {
    availableMenuItems,
    customers,
    refreshOrders,
  } = usePOSData();

  const {
    openModifyModal,
  } = usePOSCart(availableMenuItems, refreshOrders);

  const {
    isSubmittingCheckout,
    checkoutError,
    checkoutOrder,
    setCheckoutOrder,
    paymentMethod,
    setPaymentMethod,
    receivedAmount,
    setReceivedAmount,
    tipType,
    setTipType,
    tipInput,
    setTipInput,
    tipAmountCalculated,
    change,
    unusualTipInfo,
    setUnusualTipInfo,
    setShowSplitBill,
    handleProcessPayment,
    handleCourtesyPayment,
    handleFailedPayment,
    handleCreditPayment,
  } = usePOSCheckout(refreshOrders);

  const [showCreditPrompt, setShowCreditPrompt] = useState(false);
  const [managerPin, setManagerPin] = useState("");
  const [creditAuthError, setCreditAuthError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [isAssigningCustomer, setIsAssigningCustomer] = useState(false);

  // Descuento de Orden en Cobro
  const [showDiscountModal, setShowDiscountModal] = useState(false);
  const [isApplyingDiscount, setIsApplyingDiscount] = useState(false);

  const handleApplyOrderDiscount = async (discount: DiscountData) => {
    if (!checkoutOrder) return;
    try {
      setIsApplyingDiscount(true);
      const res = await fetch(`/api/orders/${checkoutOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountType: discount.discountType,
          discountValue: discount.discountValue,
          discountReason: discount.discountReason,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al aplicar descuento");
      const updatedOrders = await refreshOrders();
      const rawPayload = data.order as DbOrderPayload | undefined;
      const mappedApiOrder = rawPayload
        ? (rawPayload.order_number ? mapOrderData(rawPayload) : (rawPayload as unknown as Order))
        : null;
      const freshOrder =
        updatedOrders?.find((o: Order) => o.id === checkoutOrder.id) ||
        mappedApiOrder || {
          ...checkoutOrder,
          discountType: discount.discountType,
          discountValue: discount.discountValue,
          discountReason: discount.discountReason,
        };
      setCheckoutOrder(freshOrder);
    } catch (err) {
      console.error("Error applying order discount in checkout:", err);
    } finally {
      setIsApplyingDiscount(false);
      setShowDiscountModal(false);
    }
  };

  const handleRemoveOrderDiscount = async () => {
    if (!checkoutOrder) return;
    try {
      setIsApplyingDiscount(true);
      const res = await fetch(`/api/orders/${checkoutOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          discountType: null,
          discountValue: null,
          discountReason: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al quitar descuento");
      const updatedOrders = await refreshOrders();
      const rawPayload = data.order as DbOrderPayload | undefined;
      const mappedApiOrder = rawPayload
        ? (rawPayload.order_number ? mapOrderData(rawPayload) : (rawPayload as unknown as Order))
        : null;
      const freshOrder =
        updatedOrders?.find((o: Order) => o.id === checkoutOrder.id) ||
        mappedApiOrder || {
          ...checkoutOrder,
          discountType: null,
          discountValue: null,
          discountReason: null,
          discountAmount: 0,
        };
      setCheckoutOrder(freshOrder);
    } catch (err) {
      console.error("Error removing order discount in checkout:", err);
    } finally {
      setIsApplyingDiscount(false);
      setShowDiscountModal(false);
    }
  };

  const handleAssignCustomer = async () => {
    if (!checkoutOrder || !selectedCustomerId) return;
    try {
      setIsAssigningCustomer(true);
      setCreditAuthError(null);
      const res = await fetch(`/api/orders/${checkoutOrder.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ customerId: selectedCustomerId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error al asignar cliente");

      const assignedCustomer = customers.find((c) => c.id === selectedCustomerId);
      const updatedOrder = {
        ...checkoutOrder,
        customerId: selectedCustomerId,
        customer: assignedCustomer || data.order?.customer,
      };

      setCheckoutOrder(updatedOrder);
      await refreshOrders();
    } catch (err) {
      setCreditAuthError(
        err instanceof Error ? err.message : "Error al asignar cliente",
      );
    } finally {
      setIsAssigningCustomer(false);
    }
  };

  if (!checkoutOrder) return null;

  const rawCheckoutOrder = checkoutOrder as unknown as DbDiscountFields;

  const itemsInput = (checkoutOrder.orderItems || []).map((it) => {
    const rawIt = it as unknown as DbDiscountFields;
    return {
      unitPrice: it.unitPrice || 0,
      quantity: it.quantity || 1,
      discountType: it.discountType || rawIt.discount_type || null,
      discountValue: it.discountValue ?? rawIt.discount_value ?? null,
      discountScope: it.discountScope || rawIt.discount_scope || "ROW",
    };
  });

  const orderTotals = calculateOrderDiscountTotals({
    items: itemsInput,
    orderDiscountType: checkoutOrder.discountType || rawCheckoutOrder.discount_type || null,
    orderDiscountValue: checkoutOrder.discountValue ?? rawCheckoutOrder.discount_value ?? null,
  });

  const explicitItemsDiscount =
    checkoutOrder.orderItems?.reduce(
      (sum, it) => {
        const rawIt = it as unknown as DbDiscountFields;
        return sum + (Number(it.discountAmount ?? rawIt.discount_amount) || 0);
      },
      0,
    ) || 0;
  const itemsDiscount = explicitItemsDiscount > 0 ? explicitItemsDiscount : orderTotals.itemsDiscount;

  const explicitOrderDiscount =
    Number(checkoutOrder.discountAmount ?? rawCheckoutOrder.discount_amount) || 0;
  const orderDiscount = explicitOrderDiscount > 0 ? explicitOrderDiscount : orderTotals.orderDiscount;

  const calculatedSubtotalGross =
    checkoutOrder.orderItems && checkoutOrder.orderItems.length > 0
      ? checkoutOrder.orderItems.reduce(
          (sum, it) => sum + it.unitPrice * it.quantity,
          0,
        )
      : (checkoutOrder.subtotal || 0) + itemsDiscount;
  const subtotalGross = orderTotals.subtotalGross > 0 ? orderTotals.subtotalGross : calculatedSubtotalGross;

  const isSubmitDisabled =
    isSubmittingCheckout ||
    isApplyingDiscount ||
    !!unusualTipInfo ||
    (checkoutOrder.total + tipAmountCalculated > 0 &&
      paymentMethod === "CASH" &&
      (!receivedAmount ||
        Number(receivedAmount) <
          checkoutOrder.total + tipAmountCalculated));

  const exactTotalDue = checkoutOrder.total + tipAmountCalculated;
  const quickCashPresets = [50, 100, 200, 500, 1000]
    .filter((b) => b > exactTotalDue)
    .slice(0, 3);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (checkoutOrder.total === 0 && tipAmountCalculated === 0) {
      if (isWaiter) {
        setIsCourtesyAuthModalOpen(true);
        return;
      }
      handleCourtesyPayment();
      return;
    }
    if (!isSubmitDisabled) {
      handleProcessPayment(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-3 sm:p-4 md:p-6 z-50 no-print">
      <form
        onSubmit={handleSubmit}
        className="bg-card rounded-2xl max-w-md md:max-w-4xl lg:max-w-5xl w-full p-4 sm:p-6 shadow-2xl border border-border max-h-[95vh] md:max-h-[90vh] flex flex-col overflow-hidden"
      >
        {/* Header */}
        <div className="flex justify-between items-center border-b border-border pb-3 shrink-0">
          <div className="flex items-center gap-2.5 flex-wrap">
            <span className="h-2.5 w-2.5 rounded-full bg-success shadow-[0_0_8px_rgba(34,197,94,0.6)] animate-pulse"></span>
            <h2 className="text-base sm:text-lg font-black text-text-light uppercase tracking-tight">
              Cobrar Orden #{checkoutOrder!.orderNumber}
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-white/5 border border-border text-text-light/80">
              {formatServiceLabel(checkoutOrder.table)}
            </span>
            {checkoutOrder.customer?.name && (
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-amber-500/10 border border-amber-500/30 text-amber-400">
                Cliente: {checkoutOrder.customer.name}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={() => setCheckoutOrder(null)}
            disabled={isSubmittingCheckout}
            className="text-text-light/40 hover:text-text-light focus-visible:text-text-light focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none disabled:opacity-30 disabled:pointer-events-none transition-all p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inline error */}
        {checkoutError && (
          <div className="rounded-xl bg-red-500/10 p-3.5 border border-red-500/20 text-xs font-bold text-red-400 flex items-center gap-2.5 mt-3 shrink-0">
            <AlertCircle className="h-4 w-4 shrink-0 text-red-400" />
            <span>{checkoutError}</span>
          </div>
        )}

        {/* Unusual tip confirmation banner */}
        {unusualTipInfo && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-2.5 mt-3 shrink-0">
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-black text-amber-400 uppercase tracking-wide">
                  Propina inusual
                </p>
                <p className="text-[11px] font-bold text-amber-400/80 mt-0.5">
                  ${unusualTipInfo.amount.toFixed(2)} (
                  {unusualTipInfo.percentage.toFixed(1)}%) — ¿es correcto?
                </p>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setUnusualTipInfo(null)}
                className="flex-1 py-1.5 text-[10px] rounded-xl font-black uppercase border border-border bg-white/5 text-text-light/60 hover:bg-white/10 hover:text-text-light hover:border-text-light/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none transition-all duration-200"
              >
                Corregir
              </button>
              <button
                type="button"
                onClick={() => handleProcessPayment(true)}
                disabled={isSubmittingCheckout}
                className="flex-1 py-1.5 text-[10px] rounded-xl font-black uppercase border border-amber-500/40 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 focus-visible:ring-2 focus-visible:ring-amber-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none transition-all duration-200 disabled:opacity-50"
              >
                Sí, confirmar
              </button>
            </div>
          </div>
        )}

        {/* Two-Column Responsive Grid */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-5 md:gap-6 overflow-y-auto custom-scrollbar flex-1 pt-4">
          {/* Columna Izquierda: Ticket y Resumen de Orden */}
          <div className="order-2 md:order-1 md:col-span-5 flex flex-col justify-between space-y-4 border-t md:border-t-0 md:border-r border-border pt-4 md:pt-0 md:pr-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h3 className="text-xs font-black text-text-light/70 uppercase tracking-wider flex items-center gap-1.5">
                  <Receipt className="h-3.5 w-3.5 text-text-light/50" />
                  Resumen de la Orden
                </h3>
                {checkoutOrder.orderItems && checkoutOrder.orderItems.length > 0 && (
                  <span className="text-[10px] font-bold text-text-light/40">
                    {checkoutOrder.orderItems.length} {checkoutOrder.orderItems.length === 1 ? "ítem" : "ítems"}
                  </span>
                )}
              </div>

              {/* Lista de productos */}
              <div className="rounded-xl border border-border/60 bg-dark/30 p-2.5 max-h-45 md:max-h-55 overflow-y-auto custom-scrollbar divide-y divide-border/30">
                {checkoutOrder.orderItems && checkoutOrder.orderItems.length > 0 ? (
                  checkoutOrder.orderItems.map((item, idx) => (
                    <div key={item.id || idx} className="py-2 first:pt-1 last:pb-1 space-y-0.5">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-black text-text-light truncate">
                            <span className="text-primary font-black mr-1">{item.quantity}x</span>
                            {item.menuItem?.name || "Producto"}
                          </p>
                          {item.notes && (
                            <p className="text-[10px] text-text-light/40 italic truncate">
                              {item.notes}
                            </p>
                          )}
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-xs font-mono font-bold text-text-light tabular-nums">
                            ${(item.quantity * item.unitPrice).toFixed(2)}
                          </p>
                          {(() => {
                            const rawIt = item as unknown as DbDiscountFields;
                            const itDiscount =
                              Number(item.discountAmount ?? rawIt.discount_amount) ||
                              calculateItemDiscount({
                                unitPrice: item.unitPrice,
                                quantity: item.quantity,
                                discountType: item.discountType || rawIt.discount_type || null,
                                discountValue: item.discountValue ?? rawIt.discount_value,
                                discountScope: item.discountScope || rawIt.discount_scope || null,
                              }).discountAmount ||
                              0;
                            if (itDiscount <= 0) return null;
                            return (
                              <span className="text-[9px] font-bold text-emerald-400 block">
                                -{formatDiscountBadge(
                                  item.discountType || rawIt.discount_type,
                                  item.discountValue ?? rawIt.discount_value,
                                  item.discountReason || rawIt.discount_reason,
                                )}{" "}
                                (-${itDiscount.toFixed(2)})
                              </span>
                            );
                          })()}
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-text-light/40 italic py-3 text-center">
                    Sin productos registrados
                  </p>
                )}
              </div>

              {/* Desglose Financiero */}
              <div className="space-y-1.5 text-xs bg-white/5 p-3 rounded-xl border border-border">
                <div className="flex justify-between text-text-light/60">
                  <span>Subtotal bruto</span>
                  <span className="tabular-nums">${subtotalGross.toFixed(2)}</span>
                </div>
                {itemsDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400/90 font-bold">
                    <span>Descuentos en productos</span>
                    <span className="tabular-nums">-${itemsDiscount.toFixed(2)}</span>
                  </div>
                )}
                {orderDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-black">
                    <span>
                      Descuento orden{" "}
                      {formatDiscountBadge(
                        checkoutOrder.discountType || rawCheckoutOrder.discount_type,
                        checkoutOrder.discountValue ?? rawCheckoutOrder.discount_value,
                        checkoutOrder.discountReason || rawCheckoutOrder.discount_reason,
                      )}
                    </span>
                    <span className="tabular-nums">-${orderDiscount.toFixed(2)}</span>
                  </div>
                )}
                {tipAmountCalculated > 0 && (
                  <div className="flex justify-between text-blue-400 font-bold">
                    <span>Propina agregada</span>
                    <span className="tabular-nums">+${tipAmountCalculated.toFixed(2)}</span>
                  </div>
                )}

                {/* Botón de Descuento de Orden */}
                <div className="border-t border-border/60 pt-2 flex items-center justify-between">
                  <button
                    type="button"
                    onClick={() => setShowDiscountModal(true)}
                    disabled={isSubmittingCheckout || isApplyingDiscount}
                    className={`text-[11px] font-black uppercase tracking-wider py-1 px-2.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                      checkoutOrder.discountType || rawCheckoutOrder.discount_type
                        ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                        : "bg-white/5 border-border/40 text-text-light/60 hover:text-text-light hover:border-primary/40 hover:bg-primary/10"
                    }`}
                  >
                    <Tag className="h-3 w-3" />
                    {checkoutOrder.discountType || rawCheckoutOrder.discount_type ? "Editar Descuento" : "+ Descuento Orden"}
                  </button>

                  {(checkoutOrder.discountType || rawCheckoutOrder.discount_type) && (
                    <button
                      type="button"
                      disabled={isSubmittingCheckout || isApplyingDiscount}
                      onClick={handleRemoveOrderDiscount}
                      className="text-[10px] font-black text-red-400/70 hover:text-red-400 uppercase tracking-wider cursor-pointer"
                    >
                      Quitar
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Opciones de Comanda */}
            <div className="space-y-2 pt-1">
              <p className="text-[10px] font-black text-text-light/40 uppercase tracking-widest">
                Opciones de Comanda
              </p>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setShowSplitBill(true)}
                  disabled={isSubmittingCheckout}
                  className="bg-blue-500/10 text-blue-400 border border-blue-500/20 py-2 rounded-xl font-black text-xs hover:bg-blue-500/20 hover:border-blue-500/30 focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none disabled:opacity-50 disabled:pointer-events-none transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <Scissors className="h-3.5 w-3.5" /> Dividir Cuenta
                </button>

                <button
                  type="button"
                  disabled={isSubmittingCheckout}
                  onClick={() => {
                    openModifyModal(checkoutOrder!);
                    setCheckoutOrder(null);
                  }}
                  className="bg-white/5 text-text-light/60 border border-border py-2 rounded-xl font-black text-xs hover:bg-white/10 hover:text-text-light hover:border-text-light/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none disabled:opacity-50 disabled:pointer-events-none transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
                >
                  Regresar a Editar
                </button>
              </div>

              {/* Botón A Crédito */}
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    setCreditAuthError(null);
                    setManagerPin("");
                    const hasCustomer = Boolean(checkoutOrder.customer || checkoutOrder.customerId);
                    if (!hasCustomer) {
                      setCreditAuthError("Para enviar a crédito, asigna primero un cliente seleccionándolo aquí abajo o regresando a editar.");
                      return;
                    }
                    setShowCreditPrompt(true);
                  }}
                  disabled={isSubmittingCheckout}
                  className="w-full bg-amber-500/10 text-amber-400 border border-amber-500/30 py-2 rounded-xl font-black text-xs hover:bg-amber-500/20 hover:border-amber-500/40 focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none disabled:opacity-50 disabled:pointer-events-none transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
                >
                  <UserCheck className="h-3.5 w-3.5" /> A Crédito
                </button>

                {/* Asignación rápida de cliente si la comanda no tiene uno */}
                {!Boolean(checkoutOrder.customer || checkoutOrder.customerId) && (
                  <div className="rounded-xl border border-amber-500/25 bg-amber-500/10 p-2.5 space-y-2">
                    <p className="text-[10px] font-extrabold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                      <UserCheck className="h-3 w-3 text-amber-400" />
                      Asignar cliente a la comanda
                    </p>
                    <div className="flex gap-2">
                      <select
                        aria-label="Seleccionar cliente"
                        value={selectedCustomerId}
                        onChange={(e) => setSelectedCustomerId(e.target.value)}
                        disabled={isAssigningCustomer || isSubmittingCheckout}
                        className="flex-1 rounded-xl border border-border bg-dark/60 px-2.5 py-1.5 text-xs text-text-light outline-none focus:border-amber-400"
                      >
                        <option value="">Selecciona un cliente...</option>
                        {customers.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.name}
                          </option>
                        ))}
                      </select>
                      <button
                        type="button"
                        disabled={!selectedCustomerId || isAssigningCustomer || isSubmittingCheckout}
                        onClick={handleAssignCustomer}
                        className="rounded-xl bg-amber-500 hover:bg-amber-400 text-zinc-950 font-black text-xs px-3 py-1.5 uppercase tracking-wider disabled:opacity-50 transition-all cursor-pointer shadow-sm"
                      >
                        {isAssigningCustomer ? "..." : "Asignar"}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Prompt de Autorización de Crédito / PIN */}
              {showCreditPrompt && (
                <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-3.5 space-y-2.5">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <p className="text-xs font-black text-amber-400 uppercase tracking-wide">
                        {isWaiter ? "Autorización de Gerencia Requerida" : "Confirmar Venta a Crédito"}
                      </p>
                      <p className="text-[11px] font-bold text-text-light/70 mt-0.5">
                        Cliente: <span className="text-amber-400">{checkoutOrder.customer?.name || "Asignado"}</span> — ${checkoutOrder.total.toFixed(2)}
                      </p>
                    </div>
                  </div>

                  {isWaiter && (
                    <div className="space-y-1">
                      <input
                        type="password"
                        maxLength={6}
                        value={managerPin}
                        disabled={isVerifyingPin || isSubmittingCheckout}
                        onChange={(e) => {
                          setCreditAuthError(null);
                          setManagerPin(e.target.value);
                        }}
                        placeholder="Ingresa PIN de 4 dígitos"
                        className="w-full text-center text-base tracking-widest font-black p-2 border border-border bg-dark/60 rounded-xl focus:border-amber-400 outline-none text-text-light"
                        autoFocus
                      />
                    </div>
                  )}

                  {creditAuthError && (
                    <p className="text-[10px] font-bold text-red-400 text-center">
                      {creditAuthError}
                    </p>
                  )}

                  <div className="flex gap-2">
                    <button
                      type="button"
                      disabled={isVerifyingPin || isSubmittingCheckout}
                      onClick={() => {
                        setShowCreditPrompt(false);
                        setCreditAuthError(null);
                        setManagerPin("");
                      }}
                      className="flex-1 py-1.5 text-[10px] rounded-xl font-black uppercase border border-border bg-white/5 text-text-light/60 hover:bg-white/10 hover:text-text-light transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      disabled={isVerifyingPin || isSubmittingCheckout || (isWaiter && !managerPin.trim())}
                      onClick={async () => {
                        if (isWaiter) {
                          try {
                            setIsVerifyingPin(true);
                            setCreditAuthError(null);
                            const res = await fetch("/api/auth/verify-pin", {
                              method: "POST",
                              headers: { "Content-Type": "application/json" },
                              body: JSON.stringify({ pin: managerPin.trim() }),
                            });
                            const data = await res.json();
                            if (!res.ok || !data.valid) {
                              setCreditAuthError(data.error || "PIN incorrecto");
                              return;
                            }
                            setShowCreditPrompt(false);
                            handleCreditPayment();
                          } catch {
                            setCreditAuthError("Error al verificar PIN");
                          } finally {
                            setIsVerifyingPin(false);
                          }
                        } else {
                          setShowCreditPrompt(false);
                          handleCreditPayment();
                        }
                      }}
                      className="flex-1 py-1.5 text-[10px] rounded-xl font-black uppercase border border-amber-500/50 bg-amber-500 text-black hover:brightness-110 transition-all disabled:opacity-50"
                    >
                      {isVerifyingPin ? "Verificando..." : "Confirmar Crédito"}
                    </button>
                  </div>
                </div>
              )}

              {creditAuthError && !showCreditPrompt && (
                <div className="rounded-xl bg-red-500/10 p-2.5 border border-red-500/20 text-xs font-bold text-red-400 text-center">
                  {creditAuthError}
                </div>
              )}

              <button
                type="button"
                onClick={() => handleFailedPayment()}
                disabled={isSubmittingCheckout}
                className="w-full bg-red-500/10 text-red-400 border border-red-500/20 py-2 rounded-xl font-black text-xs hover:bg-red-500/20 hover:border-red-500/30 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none disabled:opacity-50 disabled:pointer-events-none transition-all uppercase tracking-wider cursor-pointer"
              >
                Marcar como Pago Fallido
              </button>
            </div>
          </div>

          {/* Columna Derecha: Panel de Cobro */}
          <div className="order-1 md:order-2 md:col-span-7 flex flex-col justify-between space-y-4">
            <div className="space-y-4">
              {/* Tarjeta de Total a Pagar */}
              <div className="text-center bg-dark/50 py-4 sm:py-5 rounded-2xl border border-border/80 shadow-inner space-y-1">
                <p className="text-text-light/40 text-[10px] font-black uppercase tracking-widest">
                  Total a Pagar
                </p>
                <p className="text-3xl sm:text-4xl font-black text-text-light tabular-nums tracking-tight">
                  ${exactTotalDue.toFixed(2)}
                </p>
                {!isWaiter && tipAmountCalculated > 0 && (
                  <span className="inline-block mt-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-blue-500/10 text-blue-400 border border-blue-500/25 uppercase tracking-wider">
                    Incluye ${tipAmountCalculated.toFixed(2)} de propina
                  </span>
                )}
              </div>

              {/* Flujo de Cortesía ($0.00) vs Cobro Estándar */}
              {checkoutOrder.total === 0 && tipAmountCalculated === 0 ? (
                <div className="space-y-3 pt-2">
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 text-center space-y-1">
                    <p className="text-xs font-black text-emerald-400 uppercase tracking-wider">
                      Orden 100% Bonificada / Cortesía
                    </p>
                    <p className="text-[11px] font-medium text-emerald-400/80">
                      Total a pagar $0.00. No se requiere cobro monetario.
                    </p>
                  </div>
                  <button
                    type="button"
                    disabled={isSubmittingCheckout}
                    onClick={() => {
                      if (isWaiter) {
                        setIsCourtesyAuthModalOpen(true);
                      } else {
                        handleCourtesyPayment();
                      }
                    }}
                    className="w-full bg-emerald-500 hover:bg-emerald-400 text-zinc-950 py-3.5 rounded-xl font-black text-base transition-all uppercase tracking-wider shadow-lg shadow-emerald-500/20 cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmittingCheckout ? "Procesando..." : "Registrar Cortesía ($0.00)"}
                  </button>
                </div>
              ) : (
                <>
                  {/* Selector de Propina */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-light/40 uppercase tracking-widest block">
                      Propina
                    </label>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        disabled={isSubmittingCheckout}
                        onClick={() => {
                          setTipType("NONE");
                          setTipInput("");
                        }}
                        className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-all duration-200 ${
                          tipType === "NONE"
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-border text-text-light/60 bg-white/5 hover:border-text-light/20 hover:text-text-light hover:bg-white/10"
                        }`}
                      >
                        Sin Propina
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingCheckout}
                        onClick={() => setTipType("PERCENTAGE")}
                        className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-all duration-200 ${
                          tipType === "PERCENTAGE"
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-border text-text-light/60 bg-white/5 hover:border-text-light/20 hover:text-text-light hover:bg-white/10"
                        }`}
                      >
                        Porcentaje (%)
                      </button>
                      <button
                        type="button"
                        disabled={isSubmittingCheckout}
                        onClick={() => setTipType("FIXED")}
                        className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-all duration-200 ${
                          tipType === "FIXED"
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-border text-text-light/60 bg-white/5 hover:border-text-light/20 hover:text-text-light hover:bg-white/10"
                        }`}
                      >
                        Fijo ($)
                      </button>
                    </div>

                    <p className="text-[10px] font-black text-text-light/30 uppercase tracking-widest pt-1">
                      Acceso Rápido
                    </p>
                    <div className="grid grid-cols-3 gap-2">
                      {["10", "15", "20"].map((pct) => (
                        <button
                          key={pct}
                          type="button"
                          disabled={isSubmittingCheckout}
                          onClick={() => {
                            setTipType("PERCENTAGE");
                            setTipInput(pct);
                          }}
                          className={`py-2 text-xs rounded-xl font-black uppercase border outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-all duration-200 ${
                            tipType === "PERCENTAGE" && tipInput === pct
                              ? "bg-primary text-black border-primary shadow-lg shadow-primary/10"
                              : "border-border text-text-light/60 bg-white/5 hover:border-text-light/20 hover:text-text-light hover:bg-white/10"
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
                        disabled={isSubmittingCheckout}
                        onChange={(e) => setTipInput(e.target.value)}
                        placeholder={
                          tipType === "PERCENTAGE" ? "% Ej. 10" : "$ Monto propina"
                        }
                        className="w-full text-base font-black p-2.5 border border-border bg-dark/40 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-center text-text-light transition-all duration-200 placeholder:text-text-light/30 disabled:opacity-50"
                      />
                    )}
                  </div>

                  {/* Método de Pago */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-text-light/40 uppercase tracking-widest block">
                      Método de Pago
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {PAYMENT_METHODS.map((m) => {
                        const IconComp = m.icon;
                        return (
                          <button
                            key={m.value}
                            type="button"
                            disabled={isSubmittingCheckout}
                            onClick={() => setPaymentMethod(m.value)}
                            className={`py-2.5 text-xs rounded-xl font-black uppercase border flex flex-col items-center gap-1.5 outline-none focus-visible:ring-2 focus-visible:ring-blue-400 focus-visible:ring-offset-2 focus-visible:ring-offset-card transition-all duration-200 disabled:opacity-50 ${
                              paymentMethod === m.value
                                ? "border-blue-400 bg-blue-500/10 text-blue-400 shadow-lg shadow-blue-500/5"
                                : "border-border text-text-light/60 bg-white/5 hover:border-text-light/20 hover:text-text-light hover:bg-white/10"
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
                    <div className="space-y-2.5">
                      <input
                        type="number"
                        value={receivedAmount}
                        disabled={isSubmittingCheckout}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        className="w-full text-2xl sm:text-3xl font-black p-3 border border-border bg-dark/40 rounded-xl focus:border-success focus:ring-2 focus:ring-success/20 outline-none text-center text-text-light transition-all duration-200 placeholder:text-text-light/20 disabled:opacity-50"
                        placeholder="Monto recibido ($)..."
                        autoFocus
                      />

                      {/* Atajos Rápidos de Efectivo */}
                      <div className="flex gap-2 flex-wrap">
                        <button
                          type="button"
                          disabled={isSubmittingCheckout}
                          onClick={() => setReceivedAmount(exactTotalDue.toFixed(2))}
                          className="flex-1 py-1.5 px-2 rounded-lg bg-white/5 hover:bg-white/10 border border-border text-[10px] font-black uppercase text-text-light/70 hover:text-text-light transition-all"
                        >
                          Exacto (${exactTotalDue.toFixed(2)})
                        </button>
                        {quickCashPresets.map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            disabled={isSubmittingCheckout}
                            onClick={() => setReceivedAmount(preset.toString())}
                            className="py-1.5 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-border text-[10px] font-black uppercase text-text-light/70 hover:text-text-light transition-all"
                          >
                            ${preset}
                          </button>
                        ))}
                      </div>

                      <div className="flex justify-between items-center bg-dark/45 p-3 rounded-xl border border-border/80 shadow-inner">
                        <span className="font-black text-text-light/40 text-xs uppercase tracking-widest">
                          Cambio a Entregar
                        </span>
                        <span className={`text-xl sm:text-2xl font-black tabular-nums transition-all duration-200 ${change > 0 ? "text-success" : "text-text-light/40"}`}>
                          ${change.toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Botón Principal Registrar Pago */}
            {!(checkoutOrder.total === 0 && tipAmountCalculated === 0) && (
              <button
                type="submit"
                disabled={isSubmitDisabled}
                className="w-full bg-success text-white py-3.5 sm:py-4 rounded-xl font-black text-base hover:brightness-110 active:scale-[0.98] shadow-lg shadow-success/20 focus-visible:ring-2 focus-visible:ring-success focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none disabled:opacity-30 disabled:pointer-events-none transition-all uppercase tracking-wider cursor-pointer"
              >
                {isSubmittingCheckout ? "Procesando..." : "Registrar Pago"}
              </button>
            )}
          </div>
        </div>
      </form>

      {/* Modal de Descuentos para Orden en Cobro */}
      <POSDiscountModal
        isOpen={showDiscountModal}
        onClose={() => setShowDiscountModal(false)}
        title={`Descuento en Orden #${checkoutOrder.orderNumber}`}
        subtitle={`Subtotal: $${(subtotalGross - itemsDiscount).toFixed(2)}`}
        isItem={false}
        initialDiscount={{
          discountType: checkoutOrder.discountType || rawCheckoutOrder.discount_type || null,
          discountValue:
            checkoutOrder.discountValue != null
              ? Number(checkoutOrder.discountValue)
              : rawCheckoutOrder.discount_value != null
                ? Number(rawCheckoutOrder.discount_value)
                : null,
          discountReason: checkoutOrder.discountReason || rawCheckoutOrder.discount_reason || null,
        }}
        onApply={handleApplyOrderDiscount}
        onRemove={handleRemoveOrderDiscount}
      />

      {/* Modal de Autorización de Gerencia para Cortesía */}
      <POSManagerAuthModal
        isOpen={isCourtesyAuthModalOpen}
        onClose={() => setIsCourtesyAuthModalOpen(false)}
        title="Autorización de Gerencia"
        description="Ingresa el PIN de gerencia para autorizar la cortesía ($0.00)"
        reasonPresets={[
          "Cortesía autorizada",
          "Consumo interno",
          "Cortesía de la casa",
          "Promoción especial",
        ]}
        onAuthorize={async ({ pin }) => {
          setIsCourtesyAuthModalOpen(false);
          await handleCourtesyPayment(pin);
        }}
        isSubmitting={isSubmittingCheckout}
      />
    </div>
  );
}
