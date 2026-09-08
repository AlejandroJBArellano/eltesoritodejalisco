"use client";

import React, { useState } from "react";
import { AlertTriangle, DollarSign, FileText, ReceiptText, Tag, X } from "lucide-react";
import { useGastosContextNullable } from "./GastosContext";
import type { Category } from "./types";
import type { CreateExpensePayload } from "./hooks/useGastosData";

export interface ExpenseModalProps {
  isOpen?: boolean;
  onClose?: () => void;
  categories?: Category[];
  onSubmit?: (payload: CreateExpensePayload) => Promise<void>;
}

export function ExpenseModal(props: ExpenseModalProps = {}) {
  const context = useGastosContextNullable();
  const isOpen = props.isOpen ?? context?.isExpenseModalOpen ?? false;
  const onClose = props.onClose ?? context?.handleCloseExpenseModal ?? (() => {});
  const categories = props.categories ?? context?.categories ?? [];
  const onSubmit =
    props.onSubmit ?? context?.handleCreateExpense ?? (async () => {});
  const [categoryId, setCategoryId] = useState<string>("");
  const [amount, setAmount] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [date, setDate] = useState<string>(() => {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Mexico_City",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(new Date());
  });
  const [hasInvoice, setHasInvoice] = useState<boolean>(false);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!categoryId || !amount || parseFloat(amount) <= 0 || !description.trim()) {
      setError("Completa todos los campos requeridos");
      return;
    }

    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit({
        category_id: categoryId,
        amount: parseFloat(amount),
        description: description.trim(),
        has_invoice: hasInvoice,
        date,
      });
      // Limpiar formulario y cerrar
      setAmount("");
      setDescription("");
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al registrar gasto");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 no-print">
      <div className="w-full max-w-md rounded-2xl bg-card p-6 shadow-2xl border border-border space-y-5">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-primary" />
            Registrar Gasto
          </h3>
          <button
            onClick={() => {
              setError(null);
              onClose();
            }}
            className="text-text-light/40 hover:text-text-light transition-colors p-1 rounded-lg hover:bg-white/10"
            type="button"
            aria-label="Cerrar modal de gasto"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 p-3 text-xs font-bold flex items-center gap-2">
              <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
              {error}
            </div>
          )}

          {/* Categoría */}
          <div>
            <label
              htmlFor="expense-category-select"
              className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5"
            >
              Categoría *
            </label>
            {categories.length === 0 ? (
              <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-400 rounded-xl text-xs font-bold mb-2">
                Crea una categoría primero ☝️
              </div>
            ) : (
              <div className="relative">
                <Tag className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
                <select
                  id="expense-category-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                  required
                  aria-label="Categoría"
                  className="w-full rounded-xl border border-border bg-dark/40 pl-9 pr-3 py-2.5 text-xs text-text-light outline-none focus:border-primary transition-colors"
                >
                  <option value="" disabled className="bg-card">
                    Selecciona un rubro...
                  </option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id} className="bg-card">
                      {cat.name} ({cat.tipo_gasto === "fijo" ? "Fijo" : "Variable"})
                    </option>
                  ))}
                </select>
              </div>
            )}
          </div>

          {/* Monto */}
          <div>
            <label
              htmlFor="expense-amount-input"
              className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5"
            >
              Monto ($) *
            </label>
            <div className="relative">
              <DollarSign className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
              <input
                id="expense-amount-input"
                type="number"
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="Ej. 1500.00"
                required
                aria-label="Monto"
                className="w-full rounded-xl border border-border bg-dark/40 pl-9 pr-4 py-2.5 text-xs text-text-light outline-none focus:border-primary transition-colors placeholder:text-text-light/30 font-mono"
              />
            </div>
          </div>

          {/* Descripción */}
          <div>
            <label
              htmlFor="expense-description-input"
              className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5"
            >
              Descripción / Motivo *
            </label>
            <div className="relative">
              <FileText className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
              <input
                id="expense-description-input"
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Ej. Compra de insumos a proveedor"
                required
                aria-label="Descripción"
                className="w-full rounded-xl border border-border bg-dark/40 pl-9 pr-4 py-2.5 text-xs text-text-light outline-none focus:border-primary transition-colors placeholder:text-text-light/30"
              />
            </div>
          </div>

          {/* Fecha y Factura */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label
                htmlFor="expense-date-input"
                className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5"
              >
                Fecha *
              </label>
              <input
                id="expense-date-input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                required
                aria-label="Fecha"
                className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs text-text-light outline-none focus:border-primary transition-colors scheme-dark"
              />
            </div>
            <div>
              <span className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
                ¿Facturado?
              </span>
              <div className="flex h-10.5 items-center">
                <label className="relative inline-flex cursor-pointer items-center">
                  <input
                    type="checkbox"
                    className="peer sr-only"
                    checked={hasInvoice}
                    onChange={(e) => setHasInvoice(e.target.checked)}
                    aria-label="¿Facturado?"
                  />
                  <div className="peer h-6 w-11 rounded-full bg-white/10 after:absolute after:left-0.5 after:top-0.5 after:h-5 after:w-5 after:rounded-full after:border after:border-white/20 after:bg-white after:transition-all after:content-[''] peer-checked:bg-blue-500 peer-checked:after:translate-x-full peer-checked:after:border-white"></div>
                  <span className="ml-2.5 text-xs font-black uppercase text-text-light/70">
                    {hasInvoice ? "Sí" : "No"}
                  </span>
                </label>
              </div>
            </div>
          </div>

          {/* Botones de acción */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="w-full bg-white/5 text-text-light/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider active:scale-95"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting || categories.length === 0}
              className="w-full bg-primary text-black py-3 rounded-xl font-black hover:brightness-105 transition-all uppercase text-xs tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50 active:scale-95"
            >
              {isSubmitting ? "Registrando..." : "Guardar Gasto"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
