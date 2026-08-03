import React from "react";
import {
  X,
  DollarSign,
  CreditCard,
  Landmark,
  Scissors,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { Order } from "@/types/pos";

const PAYMENT_METHODS = [
  { value: "CASH", label: "Efectivo", icon: DollarSign },
  { value: "CARD", label: "Tarjeta", icon: CreditCard },
  { value: "TRANSFER", label: "Transferencia", icon: Landmark },
];

interface POSCheckoutModalProps {
  checkoutOrder: Order | null;
  setCheckoutOrder: (order: Order | null) => void;
  tipAmountCalculated: number;
  tipType: string;
  setTipType: (type: "NONE" | "PERCENTAGE" | "FIXED") => void;
  tipInput: string;
  setTipInput: (val: string) => void;
  paymentMethod: string;
  setPaymentMethod: (val: string) => void;
  receivedAmount: string;
  setReceivedAmount: (val: string) => void;
  change: number;
  handleProcessPayment: (forceConfirmed?: boolean) => void;
  isSubmitting: boolean;
  setShowSplitBill: (show: boolean) => void;
  openModifyModal: (order: Order) => void;
  handleFailedPayment: () => void;
  checkoutError: string | null;
  unusualTipInfo: { amount: number; percentage: number } | null;
  setUnusualTipInfo: (
    info: { amount: number; percentage: number } | null,
  ) => void;
}

export function POSCheckoutModal({
  checkoutOrder,
  setCheckoutOrder,
  tipAmountCalculated,
  tipType,
  setTipType,
  tipInput,
  setTipInput,
  paymentMethod,
  setPaymentMethod,
  receivedAmount,
  setReceivedAmount,
  change,
  handleProcessPayment,
  isSubmitting,
  setShowSplitBill,
  openModifyModal,
  handleFailedPayment,
  checkoutError,
  unusualTipInfo,
  setUnusualTipInfo,
}: POSCheckoutModalProps) {
  if (!checkoutOrder) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto custom-scrollbar space-y-6">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h2 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success"></span>
            Cobrar Orden #{checkoutOrder.orderNumber}
          </h2>
          <button
            type="button"
            onClick={() => setCheckoutOrder(null)}
            className="text-text-light/40 hover:text-text-light transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Inline error */}
        {checkoutError && (
          <div className="rounded-xl bg-red-500/10 p-3 border border-red-500/20 text-xs font-bold text-red-400 flex items-center gap-2">
            <AlertCircle className="h-3.5 w-3.5 shrink-0" />
            {checkoutError}
          </div>
        )}

        {/* Unusual tip confirmation banner */}
        {unusualTipInfo && (
          <div className="rounded-xl bg-amber-500/10 border border-amber-500/30 p-4 space-y-3">
            <div className="flex items-start gap-2">
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
                className="flex-1 py-2 text-[10px] rounded-xl font-black uppercase border border-border bg-white/5 text-text-light/60 hover:bg-white/10 transition-colors"
              >
                Corregir
              </button>
              <button
                type="button"
                onClick={() => handleProcessPayment(true)}
                disabled={isSubmitting}
                className="flex-1 py-2 text-[10px] rounded-xl font-black uppercase border border-amber-500/40 bg-amber-500/20 text-amber-400 hover:bg-amber-500/30 transition-colors disabled:opacity-50"
              >
                Sí, confirmar
              </button>
            </div>
          </div>
        )}

        <div className="space-y-5">
          <div className="text-center bg-dark/40 py-6 rounded-2xl border border-border space-y-1">
            <p className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest">
              Total a Pagar
            </p>
            <p className="text-4xl font-black text-text-light tabular-nums">
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
            <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-2">
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
                    : "border-border text-text-light/60 bg-white/5 hover:border-border"
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
                    : "border-border text-text-light/60 bg-white/5 hover:border-border"
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
                    : "border-border text-text-light/60 bg-white/5 hover:border-border"
                }`}
              >
                Fijo ($)
              </button>
            </div>

            <p className="text-[10px] font-extrabold text-text-light/30 uppercase tracking-widest mb-1.5">
              Acceso Rápido
            </p>
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
                      : "border-border text-text-light/60 bg-white/5 hover:border-border"
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
                placeholder={
                  tipType === "PERCENTAGE" ? "% Ej. 10" : "$ Monto propina"
                }
                className="w-full text-base font-black p-3 border border-border bg-dark/40 rounded-xl focus:border-primary outline-none text-center text-text-light transition-colors placeholder:text-text-light/30"
              />
            )}
          </div>

          {/* Método de Pago */}
          <div>
            <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-2">
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
                        : "border-border text-text-light/60 bg-white/5 hover:border-border"
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
                className="w-full text-3xl font-black p-4 border border-border bg-dark/40 rounded-xl focus:border-success outline-none text-center text-text-light transition-colors placeholder:text-text-light/20"
                placeholder="Monto recibido ($)..."
                autoFocus
              />
              <div className="flex justify-between items-center bg-dark/40 p-3.5 rounded-xl border border-border">
                <span className="font-extrabold text-text-light/50 text-xs uppercase tracking-widest">
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
              onClick={() => handleProcessPayment(false)}
              disabled={
                isSubmitting ||
                !!unusualTipInfo ||
                (paymentMethod === "CASH" &&
                  (!receivedAmount ||
                    Number(receivedAmount) <
                      checkoutOrder.total + tipAmountCalculated))
              }
              className="w-full bg-success text-white py-4 rounded-xl font-black text-base hover:brightness-110 active:scale-[0.98] shadow-lg shadow-success/20 disabled:opacity-30 transition-all uppercase tracking-wider"
            >
              {isSubmitting ? "Procesando..." : "Registrar Pago"}
            </button>

            <button
              type="button"
              onClick={() => setShowSplitBill(true)}
              disabled={isSubmitting}
              className="w-full bg-blue-500/10 text-blue-400 border border-blue-500/20 py-2.5 rounded-xl font-black text-xs hover:bg-blue-500/20 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5"
            >
              <Scissors className="h-3.5 w-3.5" /> Dividir Cuenta
            </button>

            <button
              type="button"
              onClick={() => {
                openModifyModal(checkoutOrder);
                setCheckoutOrder(null);
              }}
              className="w-full bg-white/5 text-text-light/60 py-2.5 rounded-xl font-black text-xs hover:bg-white/10 transition-all uppercase tracking-wider border border-border"
            >
              Regresar a Editar
            </button>

            <button
              type="button"
              onClick={() => handleFailedPayment()}
              disabled={isSubmitting}
              className="w-full bg-red-500/10 text-red-400 border border-red-500/10 py-2.5 rounded-xl font-black text-xs hover:bg-red-500/20 transition-all uppercase tracking-wider"
            >
              Marcar como Pago Fallido
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
