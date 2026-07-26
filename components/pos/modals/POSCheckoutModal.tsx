import React from "react";
import { X, DollarSign, CreditCard, Landmark } from "lucide-react";
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
  handleProcessPayment: () => void;
  isSubmitting: boolean;
  setShowSplitBill: (show: boolean) => void;
  openModifyModal: (order: Order) => void;
  handleFailedPayment: () => void;
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
}: POSCheckoutModalProps) {
  if (!checkoutOrder) return null;

  return (
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
  );
}
