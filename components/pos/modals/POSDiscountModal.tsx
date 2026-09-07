"use client";

import { useOptionalUser } from "@/components/UserProvider";
import {
  DiscountScope,
  DiscountType,
  DISCOUNT_PERCENT_PRESETS,
  DISCOUNT_REASONS,
} from "@/lib/utils/discounts";
import {
  AlertTriangle,
  Check,
  DollarSign,
  Percent,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import React, { useEffect, useState } from "react";

export interface DiscountData {
  discountType: DiscountType | null;
  discountValue: number | null;
  discountScope?: DiscountScope | null;
  discountReason?: string | null;
}

export interface POSDiscountModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  isItem?: boolean;
  itemQuantity?: number;
  initialDiscount?: DiscountData;
  onApply: (discount: DiscountData) => void;
  onRemove?: () => void;
}

export function POSDiscountModal({
  isOpen,
  onClose,
  title,
  subtitle,
  isItem = false,
  itemQuantity = 1,
  initialDiscount,
  onApply,
  onRemove,
}: POSDiscountModalProps) {
  const user = useOptionalUser();
  const isWaiter = user?.isWaiter ?? false;

  const [type, setType] = useState<DiscountType>("PERCENT");
  const [value, setValue] = useState<string>("");
  const [scope, setScope] = useState<DiscountScope>("ROW");
  const [reason, setReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");

  // PIN Authorization for Waiters
  const [managerPin, setManagerPin] = useState("");
  const [pinError, setPinError] = useState<string | null>(null);
  const [isVerifyingPin, setIsVerifyingPin] = useState(false);

  useEffect(() => {
    if (isOpen) {
      if (initialDiscount?.discountType) {
        setType(initialDiscount.discountType);
        setValue(
          initialDiscount.discountValue != null
            ? String(initialDiscount.discountValue)
            : "",
        );
        setScope(initialDiscount.discountScope || "ROW");
        const existingReason = initialDiscount.discountReason || "";
        if (DISCOUNT_REASONS.includes(existingReason as (typeof DISCOUNT_REASONS)[number])) {
          setReason(existingReason);
          setCustomReason("");
        } else {
          setReason(existingReason ? "Otro" : "");
          setCustomReason(existingReason);
        }
      } else {
        setType("PERCENT");
        setValue("");
        setScope("ROW");
        setReason("");
        setCustomReason("");
      }
      setManagerPin("");
      setPinError(null);
      setIsVerifyingPin(false);
    }
  }, [isOpen, initialDiscount]);

  if (!isOpen) return null;

  const numericValue = Number(value) || 0;
  const isValueValid = numericValue > 0 && (type !== "PERCENT" || numericValue <= 100);

  const finalReason =
    reason === "Otro" ? customReason.trim() : (reason || customReason.trim()) || null;

  const handleApplyClick = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValueValid) return;

    if (isWaiter) {
      if (!managerPin.trim()) {
        setPinError("Ingresa el PIN de gerencia");
        return;
      }
      try {
        setIsVerifyingPin(true);
        setPinError(null);
        const res = await fetch("/api/auth/verify-pin", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ pin: managerPin.trim() }),
        });
        const data = await res.json();
        if (!res.ok || !data.valid) {
          setPinError(data.error || "PIN de gerencia incorrecto");
          return;
        }
      } catch {
        setPinError("Error al verificar PIN de gerencia");
        return;
      } finally {
        setIsVerifyingPin(false);
      }
    }

    onApply({
      discountType: type,
      discountValue: numericValue,
      discountScope: isItem && itemQuantity > 1 ? scope : "ROW",
      discountReason: finalReason,
    });
    onClose();
  };

  const handleRemove = () => {
    if (onRemove) {
      onRemove();
    } else {
      onApply({
        discountType: null,
        discountValue: null,
        discountScope: null,
        discountReason: null,
      });
    }
    onClose();
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="discount-modal-title"
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-150"
    >
      <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-5 max-h-[92vh] overflow-y-auto custom-scrollbar">
        {/* Header */}
        <div className="flex items-start justify-between border-b border-border pb-3">
          <div className="space-y-1">
            <h2
              id="discount-modal-title"
              className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2"
            >
              <Tag className="h-4 w-4 text-primary" />
              {title}
            </h2>
            {subtitle && (
              <p className="text-xs font-bold text-text-light/50">{subtitle}</p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-light/40 hover:text-text-light p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleApplyClick} className="space-y-4">
          {/* Tipo de Descuento: Porcentaje vs Fijo */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-light/40 uppercase tracking-widest block">
              Tipo de Descuento
            </label>
            <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Tipo de descuento">
              <button
                type="button"
                role="radio"
                aria-checked={type === "PERCENT"}
                onClick={() => setType("PERCENT")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase transition-all border outline-none cursor-pointer ${
                  type === "PERCENT"
                    ? "bg-primary/20 border-primary text-primary shadow-sm shadow-primary/10"
                    : "bg-white/5 border-transparent text-text-light/60 hover:border-border/20 hover:text-text-light"
                }`}
              >
                <Percent className="h-3.5 w-3.5" />
                <span>Porcentaje (%)</span>
              </button>
              <button
                type="button"
                role="radio"
                aria-checked={type === "FIXED"}
                onClick={() => setType("FIXED")}
                className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-black uppercase transition-all border outline-none cursor-pointer ${
                  type === "FIXED"
                    ? "bg-emerald-500/20 border-emerald-500 text-emerald-400 shadow-sm shadow-emerald-500/10"
                    : "bg-white/5 border-transparent text-text-light/60 hover:border-border/20 hover:text-text-light"
                }`}
              >
                <DollarSign className="h-3.5 w-3.5" />
                <span>Monto Fijo ($)</span>
              </button>
            </div>
          </div>

          {/* Presets rápidos para porcentaje */}
          {type === "PERCENT" && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-text-light/40 uppercase tracking-widest block">
                Presets Rápidos
              </label>
              <div className="grid grid-cols-5 gap-1.5">
                {DISCOUNT_PERCENT_PRESETS.map((pct) => (
                  <button
                    key={pct}
                    type="button"
                    onClick={() => {
                      setValue(String(pct));
                      if (pct === 100 && !reason) {
                        setReason("Cortesía");
                      }
                    }}
                    className={`py-2 text-xs font-black rounded-xl border transition-all cursor-pointer ${
                      numericValue === pct
                        ? "bg-primary text-black border-primary shadow-sm"
                        : "bg-white/5 border-border/40 text-text-light/70 hover:text-text-light hover:bg-white/10"
                    }`}
                  >
                    {pct === 100 ? "100%" : `${pct}%`}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Valor de entrada */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-light/40 uppercase tracking-widest block">
              {type === "PERCENT" ? "Porcentaje de descuento" : "Monto a descontar"}
            </label>
            <div className="relative flex items-center">
              <input
                type="number"
                min="0"
                max={type === "PERCENT" ? "100" : undefined}
                step="any"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                placeholder={type === "PERCENT" ? "Ej. 15" : "Ej. 50.00"}
                autoFocus
                className="w-full text-2xl font-black p-3.5 border border-border bg-dark/50 rounded-xl focus:border-primary focus:ring-2 focus:ring-primary/20 outline-none text-center text-text-light transition-all placeholder:text-text-light/20"
              />
              <span className="absolute right-4 text-base font-black text-text-light/30">
                {type === "PERCENT" ? "%" : "$"}
              </span>
            </div>
          </div>

          {/* Selector de alcance si es ítem con cantidad > 1 y descuento fijo */}
          {isItem && itemQuantity > 1 && type === "FIXED" && (
            <div className="space-y-1.5 p-3 rounded-xl bg-white/5 border border-border/60">
              <label className="text-[10px] font-black text-text-light/40 uppercase tracking-widest block">
                Aplicación del monto fijo ({itemQuantity} unidades)
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setScope("ROW")}
                  className={`py-2 px-2 text-[11px] font-black rounded-lg border transition-all cursor-pointer text-center ${
                    scope === "ROW"
                      ? "bg-amber-500/20 border-amber-500 text-amber-400"
                      : "bg-white/5 border-transparent text-text-light/50 hover:text-text-light"
                  }`}
                >
                  Total Renglón
                </button>
                <button
                  type="button"
                  onClick={() => setScope("UNIT")}
                  className={`py-2 px-2 text-[11px] font-black rounded-lg border transition-all cursor-pointer text-center ${
                    scope === "UNIT"
                      ? "bg-amber-500/20 border-amber-500 text-amber-400"
                      : "bg-white/5 border-transparent text-text-light/50 hover:text-text-light"
                  }`}
                >
                  Por Unidad (${(Number(value) || 0) * itemQuantity} tot.)
                </button>
              </div>
            </div>
          )}

          {/* Motivo o Razón del descuento */}
          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-text-light/40 uppercase tracking-widest block">
              Motivo del Descuento (Opcional)
            </label>
            <div className="flex flex-wrap gap-1.5">
              {DISCOUNT_REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  onClick={() => {
                    if (reason === r) {
                      setReason("");
                    } else {
                      setReason(r);
                      setCustomReason("");
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                    reason === r
                      ? "bg-primary/25 border-primary text-primary"
                      : "bg-white/5 border-border/40 text-text-light/60 hover:text-text-light hover:bg-white/10"
                  }`}
                >
                  {r}
                </button>
              ))}
              <button
                type="button"
                onClick={() => setReason(reason === "Otro" ? "" : "Otro")}
                className={`px-3 py-1.5 text-xs font-bold rounded-xl border transition-all cursor-pointer ${
                  reason === "Otro"
                    ? "bg-primary/25 border-primary text-primary"
                    : "bg-white/5 border-border/40 text-text-light/60 hover:text-text-light hover:bg-white/10"
                }`}
              >
                Otro
              </button>
            </div>

            {reason === "Otro" && (
              <input
                type="text"
                value={customReason}
                onChange={(e) => setCustomReason(e.target.value)}
                placeholder="Escribe el motivo..."
                maxLength={40}
                className="w-full text-xs font-medium p-2.5 mt-2 border border-border bg-dark/40 rounded-xl focus:border-primary outline-none text-text-light transition-all placeholder:text-text-light/30"
              />
            )}
          </div>

          {/* Autorización por PIN para Meseros */}
          {isWaiter && (
            <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 space-y-2.5">
              <div className="flex items-start gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-black text-amber-400 uppercase tracking-wide">
                    Autorización de Gerencia Requerida
                  </p>
                  <p className="text-[11px] font-medium text-amber-300/80">
                    Ingresa el PIN de gerente o administrador para autorizar el descuento.
                  </p>
                </div>
              </div>
              <input
                type="password"
                maxLength={6}
                value={managerPin}
                onChange={(e) => {
                  setPinError(null);
                  setManagerPin(e.target.value);
                }}
                placeholder="PIN de 4 dígitos"
                className="w-full text-center text-lg tracking-widest font-black p-2.5 border border-amber-500/30 bg-dark/70 rounded-xl focus:border-amber-400 outline-none text-text-light"
              />
              {pinError && (
                <p className="text-[10px] font-bold text-red-400 text-center">
                  {pinError}
                </p>
              )}
            </div>
          )}

          {/* Botones de acción */}
          <div className="flex flex-col gap-2 pt-2">
            <button
              type="submit"
              disabled={!isValueValid || isVerifyingPin}
              className="w-full bg-primary text-black py-3 rounded-xl font-black text-xs hover:brightness-110 active:scale-[0.98] shadow-md focus-visible:ring-2 focus-visible:ring-primary outline-none disabled:opacity-30 disabled:pointer-events-none transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
            >
              <Check className="h-4 w-4" />
              {isVerifyingPin ? "Verificando PIN..." : "Aplicar Descuento"}
            </button>

            {initialDiscount?.discountType && (
              <button
                type="button"
                onClick={handleRemove}
                disabled={isVerifyingPin}
                className="w-full bg-red-500/10 text-red-400 border border-red-500/20 py-2.5 rounded-xl font-black text-xs hover:bg-red-500/20 hover:border-red-500/30 transition-all uppercase tracking-wider flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Quitar Descuento
              </button>
            )}

            <button
              type="button"
              onClick={onClose}
              className="w-full bg-white/5 text-text-light/60 py-2 rounded-xl font-bold text-xs hover:bg-white/10 hover:text-text-light transition-all uppercase tracking-wider cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
