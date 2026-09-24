"use client";

import React, { useState, useMemo } from "react";
import { X, Scissors, AlertTriangle } from "lucide-react";
import { OrderWithDetails } from "@/types";
import { useOptionalUser } from "@/components/UserProvider";
import { usePOSData } from "@/hooks/pos/usePOSData";

type SplitMode = "EQUAL" | "ITEMS";

type SplitPart = {
  paymentMethod: string;
  terminalId?: string;
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
  terminalId?: string | null;
  terminalName?: string | null;
  terminalCommissionRate?: number | null;
  terminalCommissionAmount?: number | null;
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
  const user = useOptionalUser();
  const isWaiter = user?.isWaiter ?? false;
  const posData = usePOSData();
  const activeTerminals = useMemo(
    () => (posData?.terminals || []).filter((t) => t.is_active),
    [posData?.terminals],
  );
  const [mode, setMode] = useState<SplitMode>("EQUAL");
  const [partCount, setPartCount] = useState(2);
  // For items with quantity === 1: maps itemId → person number (1-N)
  const [singleAssignments, setSingleAssignments] = useState<
    Record<string, number>
  >({});
  // For items with quantity > 1: maps itemId → array of qty per person (0-indexed, length = partCount)
  const [multiAssignments, setMultiAssignments] = useState<
    Record<string, number[]>
  >({});
  const [parts, setParts] = useState<SplitPart[]>([
    defaultPart(),
    defaultPart(),
  ]);

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
    if (clamped < partCount) {
      // Clear single assignments that reference a removed person
      setSingleAssignments((prev: Record<string, number>) => {
        const next: Record<string, number> = {};
        for (const [id, n] of Object.entries(prev)) {
          if (n <= clamped) next[id] = n;
        }
        return next;
      });
      // Trim multi-qty arrays to new partCount
      setMultiAssignments((prev: Record<string, number[]>) => {
        const next: Record<string, number[]> = {};
        for (const [id, qtys] of Object.entries(prev)) {
          next[id] = qtys.slice(0, clamped);
        }
        return next;
      });
    }
  };

  const partAmounts = useMemo(() => {
    if (mode === "EQUAL") {
      const base = Math.floor((order.total / partCount) * 100) / 100;
      const remainder =
        Math.round((order.total - base * partCount) * 100) / 100;
      return Array(partCount)
        .fill(base)
        .map((v, i) =>
          i === partCount - 1 ? Math.round((v + remainder) * 100) / 100 : v,
        );
    }
    // Items mode: sum assigned items per part
    const amounts = Array<number>(partCount).fill(0);
    order.orderItems.forEach((item) => {
      if (item.quantity === 1) {
        const assigned = singleAssignments[item.id];
        if (assigned >= 1 && assigned <= partCount) {
          amounts[assigned - 1] =
            Math.round((amounts[assigned - 1] + item.unitPrice) * 100) / 100;
        }
      } else {
        const qtys = multiAssignments[item.id] ?? [];
        qtys.forEach((qty, i) => {
          if (i < partCount && qty > 0) {
            amounts[i] =
              Math.round((amounts[i] + qty * item.unitPrice) * 100) / 100;
          }
        });
      }
    });
    return amounts;
  }, [
    mode,
    partCount,
    order.total,
    order.orderItems,
    singleAssignments,
    multiAssignments,
  ]);

  const tipAmounts = useMemo(
    () =>
      parts.slice(0, partCount).map((part, i) => {
        const base = partAmounts[i];
        if (part.tipType === "PERCENTAGE") {
          return (
            Math.round(((base * (Number(part.tipInput) || 0)) / 100) * 100) /
            100
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
      if (item.quantity === 1) {
        const assigned = singleAssignments[item.id];
        return assigned >= 1 && assigned <= partCount;
      } else {
        const qtys = multiAssignments[item.id];
        if (!qtys) return false;
        const total = qtys.reduce((s: number, q: number) => s + (q || 0), 0);
        return total === item.quantity;
      }
    });
  }, [mode, order.orderItems, singleAssignments, multiAssignments, partCount]);

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
    const splits: SplitPayment[] = parts.slice(0, partCount).map((part, i) => {
      const amount = partAmounts[i];
      const tip = tipAmounts[i];
      const total = amount + tip;
      const received =
        part.paymentMethod === "CASH" ? Number(part.receivedAmount) : total;

      const isCard =
        part.paymentMethod === "CARD" || part.paymentMethod === "TRANSFER";
      const selectedTerm = isCard
        ? activeTerminals.find((t) => t.id === part.terminalId) ||
          activeTerminals.find((t) => t.is_default) ||
          activeTerminals[0]
        : undefined;

      const rate = selectedTerm ? Number(selectedTerm.commission_rate) : 0;
      const commissionAmount =
        isCard && rate > 0 ? Number(((amount * rate) / 100).toFixed(2)) : 0;

      return {
        amount,
        method: part.paymentMethod,
        tipAmount: tip,
        receivedAmount: received,
        change:
          part.paymentMethod === "CASH"
            ? Math.max(0, Math.round((received - total) * 100) / 100)
            : 0,
        terminalId: selectedTerm?.id || null,
        terminalName: selectedTerm?.name || null,
        terminalCommissionRate: selectedTerm ? rate : null,
        terminalCommissionAmount: isCard ? commissionAmount : null,
      };
    });
    onConfirm(splits);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-60 no-print">
      <div className="bg-card rounded-xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-border max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-lg font-bold text-text-light tracking-tight flex items-center gap-2">
            <Scissors className="h-5 w-5 text-primary" /> Dividir Cuenta
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="text-text-light/50 hover:text-text-light transition-colors p-1 rounded-md hover:bg-dark/40 cursor-pointer"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Total */}
        <div className="text-center bg-dark/40 py-4 rounded-lg border border-border mb-6">
          <p className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider">
            Total a dividir
          </p>
          <p className="text-3xl sm:text-4xl font-bold font-mono text-text-light tabular-nums">
            ${order.total.toFixed(2)}
          </p>
        </div>

        {/* Mode selector */}
        <div className="flex gap-2 p-1 bg-dark/40 rounded-lg mb-6">
          <button
            type="button"
            onClick={() => setMode("EQUAL")}
            className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all cursor-pointer ${
              mode === "EQUAL"
                ? "bg-primary text-background shadow-xs"
                : "text-text-light/60 hover:text-text-light"
            }`}
          >
            Partes Iguales
          </button>
          <button
            type="button"
            onClick={() => setMode("ITEMS")}
            className={`flex-1 py-2 rounded-md text-xs font-bold uppercase transition-all cursor-pointer ${
              mode === "ITEMS"
                ? "bg-primary text-background shadow-xs"
                : "text-text-light/60 hover:text-text-light"
            }`}
          >
            Por Artículos
          </button>
        </div>

        {/* Part count */}
        <div className="mb-6">
          <label className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider mb-2 block">
            Número de Personas
          </label>
          <div className="flex items-center gap-3 justify-center">
            <button
              type="button"
              onClick={() => handlePartCountChange(partCount - 1)}
              disabled={partCount <= 2}
              className="w-10 h-10 rounded-lg bg-dark/40 text-text-light font-bold text-lg hover:bg-dark/40 disabled:opacity-30 transition-all cursor-pointer"
            >
              −
            </button>
            <span className="text-2xl font-bold font-mono text-text-light w-12 text-center tabular-nums">
              {partCount}
            </span>
            <button
              type="button"
              onClick={() => handlePartCountChange(partCount + 1)}
              disabled={partCount >= 8}
              className="w-10 h-10 rounded-lg bg-dark/40 text-text-light font-bold text-lg hover:bg-dark/40 disabled:opacity-30 transition-all cursor-pointer"
            >
              +
            </button>
          </div>
        </div>

        {/* Items mode: assignment */}
        {mode === "ITEMS" && (
          <div className="mb-6 space-y-2">
            <p className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider mb-3">
              Asignar Artículos
            </p>
            {!allItemsAssigned && (
              <p className="text-[11px] text-amber-400 font-bold bg-amber-500/10 p-2.5 rounded-lg border border-amber-500/20 text-center mb-2 flex items-center justify-center gap-1.5">
                <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> Todos los
                artículos deben asignarse
              </p>
            )}
            {order.orderItems.map((item) => {
              const isMulti = item.quantity > 1;
              const qtys =
                multiAssignments[item.id] ?? Array(partCount).fill(0);
              const assignedTotal = qtys.reduce(
                (s: number, q: number) => s + (q || 0),
                0,
              );
              const isExact = isMulti && assignedTotal === item.quantity;

              return (
                <div
                  key={item.id}
                  className="flex items-center gap-3 bg-dark/40 p-3 rounded-lg border border-border"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-text-light text-xs truncate">
                      {item.menuItem?.name || "Producto"}
                    </p>
                    <p className="text-[10px] text-text-light/50 font-mono tabular-nums">
                      {item.quantity > 1 ? `${item.quantity}× ` : ""}$
                      {(item.unitPrice * item.quantity).toFixed(2)}
                    </p>
                  </div>

                  {isMulti ? (
                    /* Quantity > 1: numeric inputs per person */
                    <div className="flex items-end gap-1.5 flex-wrap justify-end">
                      {Array.from({ length: partCount }, (_, i) => i).map(
                        (i) => (
                          <div
                            key={i}
                            className="flex flex-col items-center gap-0.5"
                          >
                            <span className="text-[8px] text-text-light/50 font-bold">
                              {i + 1}
                            </span>
                            <input
                              type="number"
                              min={0}
                              max={item.quantity}
                              value={qtys[i] ?? 0}
                              onChange={(
                                e: React.ChangeEvent<HTMLInputElement>,
                              ) => {
                                const val = Math.max(
                                  0,
                                  Math.min(
                                    item.quantity,
                                    Number(e.target.value) || 0,
                                  ),
                                );
                                setMultiAssignments(
                                  (prev: Record<string, number[]>) => {
                                    const current =
                                      prev[item.id] ?? Array(partCount).fill(0);
                                    const next = [...current];
                                    while (next.length < partCount)
                                      next.push(0);
                                    next[i] = val;
                                    return { ...prev, [item.id]: next };
                                  },
                                );
                              }}
                              className={`w-10 h-8 text-center text-xs font-mono font-bold rounded-lg border bg-dark/40 text-text-light outline-none transition-all tabular-nums ${
                                isExact
                                  ? "border-emerald-500 text-emerald-400"
                                  : "border-border focus:border-primary"
                              }`}
                            />
                          </div>
                        ),
                      )}
                      <div className="flex flex-col items-center gap-0.5 justify-end">
                        <span className="text-[8px] text-text-light/50 font-bold">
                          ✓
                        </span>
                        <span
                          className={`text-xs font-mono font-bold tabular-nums h-8 flex items-center ${
                            isExact ? "text-emerald-400" : "text-amber-400"
                          }`}
                        >
                          {assignedTotal}/{item.quantity}
                        </span>
                      </div>
                    </div>
                  ) : (
                    /* Quantity === 1: person-selector buttons */
                    <div className="flex gap-1 flex-wrap justify-end">
                      {Array.from({ length: partCount }, (_, i) => i + 1).map(
                        (n) => (
                          <button
                            key={n}
                            type="button"
                            onClick={() =>
                              setSingleAssignments(
                                (prev: Record<string, number>) => ({
                                  ...prev,
                                  [item.id]: n,
                                }),
                              )
                            }
                            className={`w-8 h-8 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                              singleAssignments[item.id] === n
                                ? "bg-emerald-500 text-background shadow-xs"
                                : "bg-dark/40 text-text-light/60 hover:bg-dark/40 hover:text-text-light"
                            }`}
                          >
                            {n}
                          </button>
                        ),
                      )}
                    </div>
                  )}
                </div>
              );
            })}
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
                className="bg-dark/40 rounded-xl p-4 border border-border space-y-3"
              >
                {/* Part header */}
                <div className="flex justify-between items-center">
                  <span className="font-bold text-text-light text-xs uppercase tracking-wider">
                    Persona {i + 1}
                  </span>
                  <span className="font-bold font-mono text-emerald-400 text-base tabular-nums">
                    ${amount.toFixed(2)}
                  </span>
                </div>

                {/* Payment method */}
                <div className="grid grid-cols-3 gap-1.5">
                  {PAYMENT_METHODS.map((m) => (
                    <button
                      key={m.value}
                      type="button"
                      onClick={() => updatePart(i, "paymentMethod", m.value)}
                      className={`py-2 text-[10px] rounded-lg font-bold uppercase border transition-all cursor-pointer ${
                        part.paymentMethod === m.value
                          ? "border-primary bg-primary/20 text-primary shadow-xs"
                          : "border-border text-text-light/60 bg-white/5 hover:text-text-light"
                      }`}
                    >
                      {m.label}
                    </button>
                  ))}
                </div>

                {/* Terminal selection for Card (if multiple active terminals) */}
                {(part.paymentMethod === "CARD" ||
                  part.paymentMethod === "TRANSFER") &&
                  activeTerminals.length > 1 && (
                    <div className="flex flex-wrap gap-1 pt-0.5 animate-in fade-in duration-150">
                      {activeTerminals.map((term) => {
                        const isSelected =
                          part.terminalId === term.id ||
                          (!part.terminalId && term.is_default);
                        return (
                          <button
                            key={term.id}
                            type="button"
                            onClick={() => updatePart(i, "terminalId", term.id)}
                            className={`px-2 py-1 rounded-md text-[10px] font-bold border transition-all cursor-pointer flex items-center gap-1 ${
                              isSelected
                                ? "border-primary bg-primary/20 text-primary shadow-xs"
                                : "border-border text-text-light/60 bg-white/5 hover:text-text-light"
                            }`}
                          >
                            <span>{term.short_name}</span>
                            <span className="text-[9px] font-mono opacity-70">
                              ({Number(term.commission_rate).toFixed(1)}%)
                            </span>
                          </button>
                        );
                      })}
                    </div>
                  )}

                {/* Tip */}
                <div>
                  <div className="flex gap-1.5 mb-1.5">
                    <button
                      type="button"
                      onClick={() => {
                        updatePart(i, "tipType", "NONE");
                        updatePart(i, "tipInput", "");
                      }}
                      className={`flex-1 py-1 text-[10px] rounded-md font-bold uppercase border transition-all cursor-pointer ${
                        part.tipType === "NONE"
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border text-text-light/50 bg-white/5 hover:text-text-light"
                      }`}
                    >
                      Sin Propina
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePart(i, "tipType", "PERCENTAGE")}
                      className={`flex-1 py-1 text-[10px] rounded-md font-bold uppercase border transition-all cursor-pointer ${
                        part.tipType === "PERCENTAGE"
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border text-text-light/50 bg-white/5 hover:text-text-light"
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => updatePart(i, "tipType", "FIXED")}
                      className={`flex-1 py-1 text-[10px] rounded-md font-bold uppercase border transition-all cursor-pointer ${
                        part.tipType === "FIXED"
                          ? "border-primary bg-primary/20 text-primary"
                          : "border-border text-text-light/50 bg-white/5 hover:text-text-light"
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
                          type="button"
                          onClick={() => updatePart(i, "tipInput", pct)}
                          className={`flex-1 py-1 text-[10px] rounded-md font-bold uppercase border transition-all cursor-pointer ${
                            part.tipInput === pct
                              ? "border-emerald-500/40 bg-emerald-500/20 text-emerald-300"
                              : "border-border text-text-light/50 bg-white/5 hover:text-text-light"
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
                        className="flex-1 text-xs font-mono font-bold p-2 border border-border bg-dark/40 rounded-lg focus:border-primary outline-none text-center text-text-light transition-colors placeholder:text-text-light/30 tabular-nums"
                      />
                      {!isWaiter && tip > 0 && (
                        <span className="text-[10px] font-mono font-bold text-primary whitespace-nowrap tabular-nums">
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
                      className="w-full text-sm font-mono font-bold p-2.5 border border-border bg-dark/40 rounded-lg focus:border-emerald-400 outline-none text-center text-text-light transition-colors placeholder:text-text-light/30 tabular-nums"
                    />
                    {part.receivedAmount &&
                      Number(part.receivedAmount) >= total && (
                        <div className="flex justify-between items-center bg-dark/40 p-2 rounded-lg border border-border">
                          <span className="font-bold text-text-light/50 text-[10px] uppercase">
                            Cambio
                          </span>
                          <span className="font-mono font-bold text-emerald-400 text-xs tabular-nums">
                            ${change.toFixed(2)}
                          </span>
                        </div>
                      )}
                  </div>
                )}

                {/* Total with tip */}
                {tip > 0 && (
                  <div className="flex justify-between items-center pt-2 border-t border-border">
                    <span className="text-[10px] font-bold text-text-light/50 uppercase">
                      {isWaiter ? "Total a pagar" : "Total con propina"}
                    </span>
                    <span className="font-mono font-bold text-text-light tabular-nums text-xs">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Actions */}
        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isSubmitting || !canConfirm}
            className="w-full bg-primary text-background py-3 rounded-lg font-bold text-xs hover:brightness-110 active:scale-[0.98] transition-all disabled:opacity-30 uppercase tracking-wider cursor-pointer shadow-xs"
          >
            {isSubmitting ? "Procesando..." : "Registrar Pagos"}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="w-full bg-dark/40 text-text-light/60 py-2 rounded-lg font-bold text-xs hover:bg-dark/40 hover:text-text-light transition-all uppercase tracking-wider cursor-pointer"
          >
            Cancelar
          </button>
        </div>
      </div>
    </div>
  );
}
