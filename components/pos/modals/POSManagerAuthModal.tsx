"use client";

import React, { useState, useEffect } from "react";
import { ShieldCheck, X, AlertTriangle } from "lucide-react";

export interface POSManagerAuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  description?: string;
  reasonPresets?: string[];
  onAuthorize: (auth: { pin: string; reason?: string; managerName?: string }) => Promise<void> | void;
  isSubmitting?: boolean;
}

export function POSManagerAuthModal({
  isOpen,
  onClose,
  title,
  description,
  reasonPresets = [
    "Error de captura",
    "Cliente canceló",
    "Cambio de forma de pago",
    "Platillo insatisfactorio",
  ],
  onAuthorize,
  isSubmitting = false,
}: POSManagerAuthModalProps) {
  const [pin, setPin] = useState("");
  const [selectedReason, setSelectedReason] = useState<string>("");
  const [customReason, setCustomReason] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [isVerifying, setIsVerifying] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setPin("");
      setSelectedReason("");
      setCustomReason("");
      setError(null);
      setIsVerifying(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const finalReason =
    selectedReason === "Otro"
      ? customReason.trim()
      : selectedReason || customReason.trim() || undefined;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pin.trim()) {
      setError("Ingresa el PIN de autorización");
      return;
    }

    try {
      setIsVerifying(true);
      setError(null);

      const res = await fetch("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: pin.trim() }),
      });

      const data = await res.json();
      if (!res.ok || !data.valid) {
        setError(data.error || "PIN de autorización incorrecto");
        return;
      }

      await onAuthorize({
        pin: pin.trim(),
        reason: finalReason,
        managerName: data.manager?.name,
      });

      onClose();
    } catch (err) {
      console.error("Error al verificar PIN:", err);
      setError("Error al verificar PIN de autorización");
    } finally {
      setIsVerifying(false);
    }
  };

  const isBusy = isVerifying || isSubmitting;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print animate-in fade-in duration-200">
      <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-border space-y-5">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldCheck className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-sm font-black text-text-light uppercase tracking-tight">
                {title}
              </h3>
              <p className="text-[10px] text-text-light/50 font-medium">
                Autorización de Administrador o Gerente
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isBusy}
            className="text-text-light/40 hover:text-text-light transition-colors p-1 rounded-lg hover:bg-white/5 disabled:opacity-40"
            aria-label="Cerrar"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {description && (
          <p className="text-xs text-text-light/70 leading-relaxed">
            {description}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label
              htmlFor="manager-pin-input"
              className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5 text-center"
            >
              Ingresa el PIN de 4 dígitos
            </label>
            <input
              id="manager-pin-input"
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              autoFocus
              disabled={isBusy}
              onChange={(e) => {
                setError(null);
                setPin(e.target.value.replace(/\D/g, ""));
              }}
              placeholder="••••"
              className="w-full text-center text-2xl tracking-[0.4em] font-black p-3 border border-border bg-dark/60 rounded-xl focus:border-primary focus:ring-1 focus:ring-primary outline-none text-text-light transition-all placeholder:tracking-normal placeholder:text-text-light/20"
            />
          </div>

          {reasonPresets.length > 0 && (
            <div>
              <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-2">
                Motivo (opcional)
              </label>
              <div className="flex flex-wrap gap-1.5 mb-2">
                {reasonPresets.map((r) => {
                  const isSelected = selectedReason === r;
                  return (
                    <button
                      key={r}
                      type="button"
                      disabled={isBusy}
                      onClick={() => {
                        setSelectedReason(isSelected ? "" : r);
                        if (r !== "Otro") setCustomReason("");
                      }}
                      className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                        isSelected
                          ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                          : "bg-white/5 border-border text-text-light/60 hover:text-text-light hover:bg-white/10"
                      }`}
                    >
                      {r}
                    </button>
                  );
                })}
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => {
                    setSelectedReason(selectedReason === "Otro" ? "" : "Otro");
                  }}
                  className={`text-[10px] font-bold px-2.5 py-1 rounded-lg border transition-all ${
                    selectedReason === "Otro"
                      ? "bg-amber-500/20 border-amber-500/50 text-amber-300"
                      : "bg-white/5 border-border text-text-light/60 hover:text-text-light hover:bg-white/10"
                  }`}
                >
                  Otro
                </button>
              </div>

              {selectedReason === "Otro" && (
                <input
                  type="text"
                  maxLength={100}
                  value={customReason}
                  disabled={isBusy}
                  onChange={(e) => setCustomReason(e.target.value)}
                  placeholder="Especifica el motivo..."
                  className="w-full text-xs font-medium p-2 border border-border bg-dark/40 rounded-xl focus:border-primary outline-none text-text-light placeholder:text-text-light/30"
                />
              )}
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold">
              <AlertTriangle className="h-4 w-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={isBusy}
              onClick={onClose}
              className="flex-1 py-2.5 text-xs rounded-xl font-black uppercase tracking-wider border border-border bg-white/5 text-text-light/60 hover:bg-white/10 hover:text-text-light transition-all"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isBusy || !pin.trim()}
              className="flex-1 py-2.5 text-xs rounded-xl font-black uppercase tracking-wider bg-primary text-black hover:brightness-110 transition-all disabled:opacity-40 shadow-lg shadow-primary/10"
            >
              {isBusy ? "Verificando..." : "Autorizar"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
