"use client";

import { Modal } from "@/components/ui/Modal";
import { PaymentMethod } from "@/types";
import { AlertCircle, CreditCard, DollarSign, Landmark } from "lucide-react";
import React, { useState } from "react";

export interface CustomerAbonoModalProps {
  isOpen: boolean;
  onClose: () => void;
  customerId: string;
  customerName: string;
  totalDebt: number;
  onSuccess: (appliedAmount: number) => void;
}

const METHODS = [
  { value: PaymentMethod.CASH, label: "Efectivo", icon: DollarSign },
  { value: PaymentMethod.CARD, label: "Tarjeta", icon: CreditCard },
  { value: PaymentMethod.TRANSFER, label: "Transferencia", icon: Landmark },
];

export function CustomerAbonoModal({
  isOpen,
  onClose,
  customerId,
  customerName,
  totalDebt,
  onSuccess,
}: CustomerAbonoModalProps) {
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<PaymentMethod>(PaymentMethod.CASH);
  const [receivedAmount, setReceivedAmount] = useState<string>("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const numAmount = parseFloat(amount) || 0;
  const numReceived = parseFloat(receivedAmount) || 0;
  const change = method === PaymentMethod.CASH && numReceived > numAmount ? numReceived - numAmount : 0;

  const handleSetTotal = () => {
    setAmount(totalDebt.toFixed(2));
    if (method === PaymentMethod.CASH) {
      setReceivedAmount(totalDebt.toFixed(2));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (numAmount <= 0) {
      setErrorMessage("El monto a abonar debe ser mayor a 0");
      return;
    }

    if (numAmount > totalDebt + 0.01) {
      setErrorMessage(
        `El monto no puede ser mayor al saldo deudor ($${totalDebt.toFixed(2)})`
      );
      return;
    }

    if (method === PaymentMethod.CASH && numReceived < numAmount) {
      setErrorMessage("El monto recibido en efectivo no puede ser menor al abono");
      return;
    }

    try {
      setIsSubmitting(true);
      const res = await fetch(
        `/api/customers/${customerId}/account-statement`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            amount: numAmount,
            method,
            receivedAmount: method === PaymentMethod.CASH ? numReceived : numAmount,
            change,
          }),
        }
      );

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al procesar el abono");
      }

      onSuccess(numAmount);
      onClose();
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error al procesar el abono"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Registrar Abono a Cuenta"
      subtitle={`Cliente: ${customerName} • Saldo actual: $${totalDebt.toFixed(2)}`}
      maxWidth="md"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errorMessage && (
          <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Monto del Abono */}
        <div className="space-y-1.5">
          <div className="flex justify-between items-center">
            <label htmlFor="abono-amount" className="text-xs font-bold text-text-light/70 uppercase tracking-wider">
              Monto del Abono
            </label>
            <button
              type="button"
              onClick={handleSetTotal}
              className="text-xs font-black text-amber-400 hover:text-amber-300 underline cursor-pointer"
            >
              Liquidar Total (${totalDebt.toFixed(2)})
            </button>
          </div>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light/40 font-black text-lg">
              $
            </span>
            <input
              id="abono-amount"
              type="number"
              step="any"
              min="0.01"
              max={totalDebt}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0.00"
              autoFocus
              className="w-full bg-dark/40 border border-border rounded-xl pl-8 pr-4 py-2.5 text-lg font-black text-text-light placeholder:text-text-light/30 focus:border-amber-400 focus:outline-none"
            />
          </div>
        </div>

        {/* Método de Pago */}
        <div className="space-y-1.5">
          <label className="text-xs font-bold text-text-light/70 uppercase tracking-wider">
            Método de Pago
          </label>
          <div className="grid grid-cols-3 gap-2">
            {METHODS.map((m) => {
              const Icon = m.icon;
              const isSelected = method === m.value;
              return (
                <button
                  key={m.value}
                  type="button"
                  onClick={() => setMethod(m.value)}
                  className={`py-2.5 px-3 rounded-xl font-bold text-xs flex flex-col items-center gap-1.5 border transition-all cursor-pointer ${
                    isSelected
                      ? "bg-amber-500/20 border-amber-400 text-amber-300 shadow-sm"
                      : "bg-white/5 border-border text-text-light/60 hover:bg-white/10 hover:text-text-light"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  {m.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Efectivo Recibido y Cambio */}
        {method === PaymentMethod.CASH && (
          <div className="space-y-3 bg-dark/30 p-3.5 rounded-xl border border-border">
            <div className="space-y-1">
              <label htmlFor="received-amount" className="text-xs font-bold text-text-light/70">
                Efectivo Recibido
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-light/40 font-bold">
                  $
                </span>
                <input
                  id="received-amount"
                  type="number"
                  step="any"
                  value={receivedAmount}
                  onChange={(e) => setReceivedAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full bg-dark/60 border border-border rounded-xl pl-7 pr-3 py-2 text-sm font-bold text-text-light placeholder:text-text-light/30 focus:border-amber-400 focus:outline-none"
                />
              </div>
            </div>

            <div className="flex justify-between items-center pt-1 border-t border-border/50 text-xs">
              <span className="text-text-light/60 font-bold">Cambio a entregar:</span>
              <span className={`font-black text-sm ${change > 0 ? "text-emerald-400" : "text-text-light/40"}`}>
                ${change.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        {/* Botones de acción */}
        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={onClose}
            disabled={isSubmitting}
            className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider border border-border bg-white/5 text-text-light/60 hover:bg-white/10 hover:text-text-light transition-all cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="submit"
            disabled={isSubmitting || numAmount <= 0}
            className="flex-1 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider bg-amber-500 hover:bg-amber-400 text-black shadow-lg transition-all disabled:opacity-50 cursor-pointer"
          >
            {isSubmitting ? "Procesando..." : `Abonar $${numAmount.toFixed(2)}`}
          </button>
        </div>
      </form>
    </Modal>
  );
}
