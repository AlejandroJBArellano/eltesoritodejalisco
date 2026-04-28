"use client";

import { useState, useMemo } from "react";
import { OrderWithDetails } from "@/types";

type SplitMode = "EQUAL" | "ITEMS";

type SplitPart = {
  paymentMethod: string;
  tipType: "NONE" | "PERCENTAGE" | "FIXED";
  tipInput: string;
  receivedAmount: string;
};

export type SplitPayment = {
  amount: number;
  method: string;
  tipAmount: number;
  receivedAmount?: number;
  change?: number;
};

type SplitBillModalProps = {
  order: OrderWithDetails;
  onConfirm: (splits: SplitPayment[]) => void;
  onClose: () => void;
  isSubmitting?: boolean;
};

const PAYMENT_METHODS = [
  { label: "Efectivo", value: "CASH" },
  { label: "Tarjeta", value: "CARD" },
  { label: "Transferencia", value: "TRANSFER" },
];

const defaultPart = (): SplitPart => ({
  paymentMethod: "CASH",
  tipType: "NONE",
  tipInput: "",
  receivedAmount: "",
});

export function SplitBillModal({
  order,
  onConfirm,
  onClose,
  isSubmitting,
}: SplitBillModalProps) {
  const [mode, setMode] = useState<SplitMode>("EQUAL");
  const [partCount, setPartCount] = useState(2);
  const [itemAssignments, setItemAssignments] = useState<Record<string, number>>({});
  const [parts, setParts] = useState<SplitPart[]>([defaultPart(), defaultPart()]);

  const syncParts = (count: number, current: SplitPart[]): SplitPart[] => {
    if (count > current.length) {
      return [
        ...current,
        ...Array(count - current.length)
          .fill(null)
          .map(() => defaultPart()),
      ];
    }
    return current.slice(0, count);
  };

  const handlePartCountChange = (count: number) => {
    const clamped = Math.max(2, Math.min(8, count));
    setPartCount(clamped);
    setParts((prev: SplitPart[]) => syncParts(clamped, prev));
  };

  const partAmounts = useMemo(() => {
    if (mode === "EQUAL") {
      const base = Math.floor((order.total / partCount) * 100) / 100;
      const remainder =
        Math.round((order.total - base * partCount) * 100) / 100;
      return Array(partCount)
        .fill(base)
        .map((v: number, i: number) =>
          i === partCount - 1 ? Math.round((v + remainder) * 100) / 100 : v,
        );
    }
    // Items mode: sum assigned items per part
    const amounts = Array(partCount).fill(0) as number[];
    order.orderItems.forEach((item) => {
      const assigned = itemAssignments[item.id];
      if (assigned >= 1 && assigned <= partCount) {
        amounts[assigned - 1] =
          Math.round((amounts[assigned - 1] + item.unitPrice * item.quantity) * 100) / 100;
      }
    });
    return amounts;
  }, [mode, partCount, order.total, order.orderItems, itemAssignments]);

  const tipAmounts = useMemo(
    () =>
      parts.slice(0, partCount).map((part: SplitPart, i: number) => {
        const base = partAmounts[i];
        if (part.tipType === "PERCENTAGE") {
          return (
            Math.round(
              ((base * (Number(part.tipInput) || 0)) / 100) * 100,
            ) / 100
          );
        }
        if (part.tipType === "FIXED") {
          return Number(part.tipInput) || 0;
        }
        return 0;
      }),
    [parts, partAmounts, partCount],
  );

  const updatePart = (index: number, field: keyof SplitPart, value: string) => {
    setParts((prev: SplitPart[]) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const allItemsAssigned = useMemo(() => {
    if (mode !== "ITEMS") return true;
    return order.orderItems.every((item) => {
      const assigned = itemAssignments[item.id];
      return assigned >= 1 && assigned <= partCount;
    });
  }, [mode, order.orderItems, itemAssignments, partCount]);

  const canConfirm = useMemo(() => {
    if (!allItemsAssigned) return false;
    for (let i = 0; i < partCount; i++) {
      const part = parts[i];
      const total = partAmounts[i] + tipAmounts[i];
      if (part.paymentMethod === "CASH") {
        if (!part.receivedAmount || Number(part.receivedAmount) < total)
          return false;
      }
    }
    return true;
  }, [allItemsAssigned, partCount, parts, partAmounts, tipAmounts]);

  const handleConfirm = () => {
    const splits: SplitPayment[] = parts.slice(0, partCount).map((part: SplitPart, i: number) => {
      const amount = partAmounts[i];
      const tip = tipAmounts[i];
      const total = amount + tip;
      const received =
        part.paymentMethod === "CASH" ? Number(part.receivedAmount) : total;
      return {
        amount,
        method: part.paymentMethod,
        tipAmount: tip,
        receivedAmount: received,
        change:
          part.paymentMethod === "CASH"
            ? Math.max(0, Math.round((received - total) * 100) / 100)
            : 0,
      };
    });
    onConfirm(splits);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[60] no-print">
      <div className="bg-[#1E1E1E] rounded-[2.5rem] max-w-lg w-full p-8 shadow-2xl border border-white/10 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">
            ✂️ Dividir Cuenta
          </h3>
          <button
            onClick={onClose}
            className="text-zinc-600 hover:text-white transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Total */}
        <div className="text-center bg-white/5 py-4 rounded-2xl border border-white/5 mb-6">
          <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">
            Total a dividir
          </p>
          <p className="text-4xl font-black text-white tabular-nums">
            ${order.total.toFixed(2)}
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 p-1 bg-white/5 rounded-2xl mb-6">
          <button
            onClick={() => setMode("EQUAL")}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              mode === "EQUAL"
                ? "bg-[#89CFF0] text-black shadow-md"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Partes Iguales
          </button>
          <button
            onClick={() => setMode("ITEMS")}
            className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${
              mode === "ITEMS"
                ? "bg-[#89CFF0] text-black shadow-md"
                : "text-zinc-500 hover:text-white"
            }`}
          >
            Por Artículos
          </button>
        </div>

        {/* Part count */}
        <div className="mb-6">
          <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider mb-2 block">
            Número de Personas
          </label>
          <div className="flex items-center gap-3 justify-center">
            <button
              onClick={() => handlePartCountChange(partCount - 1)}
              disabled={partCount <= 2}
              className="w-10 h-10 rounded-xl bg-white/5 text-white font-black text-lg hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              −
            </button>
            <span className="text-3xl font-black text-white w-12 text-center tabular-nums">
              {partCount}
            </span>
            <button
              onClick={() => handlePartCountChange(partCount + 1)}
              disabled={partCount >= 8}
              className="w-10 h-10 rounded-xl bg-white/5 text-white font-black text-lg hover:bg-white/10 disabled:opacity-30 transition-all"
            >
              +
            </button>
          </div>
        </div>

        {/* Items mode: assignment */}
        {mode === "ITEMS" && (
          <div className="mb-6 space-y-2">
            <p className="text-[10px] font-black text-zinc-600 uppercase tracking-wider mb-3">
              Asignar Artículos
            </p>
            {!allItemsAssigned && (
              <p className="text-[10px] text-yellow-400 font-black bg-yellow-500/10 p-2 rounded-xl border border-yellow-500/20 text-center mb-2">
                ⚠️ Todos los artículos deben asignarse
              </p>
            )}
            {order.orderItems.map((item) => (
              <div
                key={item.id}
                className="flex items-center gap-3 bg-white/5 p-3 rounded-2xl"
              >
                <div className="flex-1 min-w-0">
                  <p className="font-black text-white text-xs uppercase truncate">
                    {item.menuItem?.name || "Producto"}
                  </p>
                  <p className="text-[10px] text-zinc-500 font-bold">
                    {item.quantity > 1 ? `${item.quantity}× ` : ""}$
                    {(item.unitPrice * item.quantity).toFixed(2)}
                  </p>
                </div>
                <div className="flex gap-1 flex-wrap justify-end">
                  {Array.from({ length: partCount }, (_, i) => i + 1).map(
                    (n) => (
                      <button
                        key={n}
                        onClick={() =>
                          setItemAssignments((prev) => ({
                            ...prev,
                            [item.id]: n,
                          }))
                        }
                        className={`w-8 h-8 rounded-lg text-xs font-black transition-all ${
                          itemAssignments[item.id] === n
                            ? "bg-[#B2FBA5] text-black shadow-md"
                            : "bg-white/10 text-zinc-500 hover:bg-white/20"
                        }`}
                      >
                        {n}
                      </button>
                    ),
                  )}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Parts */}
        <div className="space-y-4">
          {Array.from({ length: partCount }, (_, i) => {
            const part = parts[i] ?? defaultPart();
            const amount = partAmounts[i] ?? 0;
            const tip = tipAmounts[i] ?? 0;
            const total = amount + tip;
            const change =
              part.paymentMethod === "CASH" &&
              Number(part.receivedAmount) > total
                ? Math.round((Number(part.receivedAmount) - total) * 100) / 100
                : 0;

            return (
              <div
                key={i}
                className="bg-white/5 rounded-2xl p-4 border border-white/10 space-y-3"
              >
                {/* Part header */}
                <div className="flex justify-between items-center">
                  <span className="font-black text-white text-sm uppercase tracking-widest">
                    Persona {i + 1}
                  </span>
                  <span className="font-black text-[#B2FBA5] text-lg tabular-nums">
                    ${amount.toFixed(2)}
                  </span>
                </div>

                {/* Payment method */}
                <div className="grid grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      onClick={() =>
                        updatePart(i, "paymentMethod", m.value)
                      }
                      className={`py-2 text-[10px] rounded-xl font-black uppercase border-2 transition-all ${
                        part.paymentMethod === m.value
                          ? "border-[#89CFF0] bg-[#89CFF0] text-black shadow-md"
                          : "border-white/5 text-zinc-600 bg-white/5"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Tip */}
                <div>
                  <div className="flex gap-1.5 mb-1.5">
                    <button
                      onClick={() => {
                        updatePart(i, "tipType", "NONE");
                        updatePart(i, "tipInput", "");
                      }}
                      className={`flex-1 py-1.5 text-[9px] rounded-lg font-black uppercase border-2 transition-all ${
                        part.tipType === "NONE"
                          ? "border-[#FFB7C5] bg-[#FFB7C5] text-black"
                          : "border-white/5 text-zinc-600 bg-white/5"
                      }`}
                    >
                      Sin propina
                    </button>
                    <button
                      onClick={() => updatePart(i, "tipType", "PERCENTAGE")}
                      className={`flex-1 py-1.5 text-[9px] rounded-lg font-black uppercase border-2 transition-all ${
                        part.tipType === "PERCENTAGE"
                          ? "border-[#FFB7C5] bg-[#FFB7C5] text-black"
                          : "border-white/5 text-zinc-600 bg-white/5"
                      }`}
                    >
                      %
                    </button>
                    <button
                      onClick={() => updatePart(i, "tipType", "FIXED")}
                      className={`flex-1 py-1.5 text-[9px] rounded-lg font-black uppercase border-2 transition-all ${
                        part.tipType === "FIXED"
                          ? "border-[#FFB7C5] bg-[#FFB7C5] text-black"
                          : "border-white/5 text-zinc-600 bg-white/5"
                      }`}
                    >
                      $ Fijo
                    </button>
                  </div>

                  {part.tipType === "PERCENTAGE" && (
                    <div className="flex gap-1.5 mb-1.5">
                      {["10", "15", "20"].map((pct) => (
                        <button
                          key={pct}
                          onClick={() => updatePart(i, "tipInput", pct)}
                          className={`flex-1 py-1.5 text-[9px] rounded-lg font-black uppercase border-2 transition-all ${
                            part.tipInput === pct
                              ? "border-[#B2FBA5] bg-[#B2FBA5] text-black"
                              : "border-white/5 text-zinc-600 bg-white/5"
                          }`}
                        >
                          {pct}%
                        </button>
                      ))}
                    </div>
                  )}

                  {part.tipType !== "NONE" && (
                    <div className="flex items-center gap-2">
                      <input
                        type="number"
                        value={part.tipInput}
                        onChange={(e) =>
                          updatePart(i, "tipInput", e.target.value)
                        }
                        placeholder={
                          part.tipType === "PERCENTAGE" ? "% Ej. 10" : "$ Monto"
                        }
                        className="flex-1 text-sm font-black p-2 border border-white/5 bg-white/5 rounded-xl focus:border-[#FFB7C5] outline-none text-center text-white transition-all placeholder:text-zinc-800"
                      />
                      {tip > 0 && (
                        <span className="text-[10px] font-black text-blue-400/60 whitespace-nowrap">
                          +${tip.toFixed(2)}
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Cash received */}
                {part.paymentMethod === "CASH" && (
                  <div className="space-y-2">
                    <input
                      type="number"
                      value={part.receivedAmount}
                      onChange={(e) =>
                        updatePart(i, "receivedAmount", e.target.value)
                      }
                      placeholder="Efectivo recibido..."
                      className="w-full text-lg font-black p-3 border border-white/5 bg-white/5 rounded-2xl focus:border-[#B2FBA5] outline-none text-center text-white transition-all placeholder:text-zinc-800"
                    />
                    {part.receivedAmount &&
                      Number(part.receivedAmount) >= total && (
                        <div className="flex justify-between items-center bg-white/5 p-2 rounded-xl border border-white/5">
                          <span className="font-black text-zinc-600 text-[10px] uppercase">
                            Cambio
                          </span>
                          <span className="font-black text-[#B2FBA5] text-sm tabular-nums">
                            ${change.toFixed(2)}
                          </span>
                        </div>
                      )}
                  </div>
                )}

                {/* Total with tip */}
                {tip > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-white/5">
                    <span className="text-[10px] font-black text-zinc-600 uppercase">
                      Total con propina
                    </span>
                    <span className="font-black text-white tabular-nums">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-3">
          <button
            onClick={handleConfirm}
            disabled={isSubmitting || !canConfirm}
            className="w-full bg-[#B2FBA5] text-[#000000] py-4 rounded-full font-black text-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-[0_0_20px_#B2FBA544] disabled:opacity-30 uppercase"
          >
            {isSubmitting ? "PROCESANDO..." : "REGISTRAR PAGOS"}
          </button>
          <button
            onClick={onClose}
            className="w-full bg-white/5 text-zinc-500 py-3 rounded-2xl font-black text-[10px] hover:bg-white/10 transition-all uppercase tracking-widest"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
