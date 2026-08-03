import React from "react";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { Order, ModifyItem } from "@/types/pos";

interface POSModifyOrderModalProps {
  modifyingOrder: Order | null;
  setModifyingOrder: (order: Order | null) => void;
  modifyItems: ModifyItem[];
  handleModifyQuantityChange: (index: number, delta: number) => void;
  handleModifyRemoveItem: (index: number) => void;
  handleSaveModifiedOrder: () => void;
  isSubmitting: boolean;
}

export function POSModifyOrderModal({
  modifyingOrder,
  setModifyingOrder,
  modifyItems,
  handleModifyQuantityChange,
  handleModifyRemoveItem,
  handleSaveModifiedOrder,
  isSubmitting,
}: POSModifyOrderModalProps) {
  if (!modifyingOrder) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h2 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400"></span>
            Modificar Orden #{modifyingOrder.orderNumber}
          </h2>
          <button
            type="button"
            onClick={() => setModifyingOrder(null)}
            className="text-text-light/40 hover:text-text-light transition-colors p-1 rounded-lg hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {modifyItems.length === 0 && (
            <p className="text-center text-text-light/30 py-8 text-xs font-extrabold uppercase tracking-widest">
              No quedan productos en la orden
            </p>
          )}
          {modifyItems.map((item, index) => (
            <div
              key={item.id}
              className="flex gap-3 items-center bg-dark/40 p-3 rounded-xl border border-border"
            >
              <div className="flex-1 min-w-0">
                <p className="font-black text-xs text-text-light uppercase tracking-tight truncate">
                  {item.menuItemName}
                </p>
                <p className="text-[10px] font-bold text-text-light/50 mt-0.5">
                  ${item.unitPrice.toFixed(2)} c/u
                </p>
              </div>

              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-border">
                <button
                  type="button"
                  onClick={() => handleModifyQuantityChange(index, -1)}
                  className="h-6 w-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-text-light hover:text-red-400 flex items-center justify-center font-bold text-xs transition-colors active:scale-90"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center font-black text-xs text-text-light">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleModifyQuantityChange(index, 1)}
                  className="h-6 w-6 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-text-light hover:text-emerald-400 flex items-center justify-center font-bold text-xs transition-colors active:scale-90"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="flex items-center gap-2 min-w-[70px] justify-end">
                <p className="font-black text-xs text-text-light tabular-nums">
                  ${(item.unitPrice * item.quantity).toFixed(2)}
                </p>
                <button
                  type="button"
                  onClick={() => handleModifyRemoveItem(index)}
                  className="text-red-400/50 hover:text-red-400 transition-colors p-1"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {modifyItems.length > 0 && (
          <div className="border-t border-border pt-4 flex justify-between items-center">
            <span className="text-xs font-bold text-text-light/50 uppercase tracking-widest">
              Nuevo Total
            </span>
            <span className="text-2xl font-black text-text-light tabular-nums">
              $
              {modifyItems
                .reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
                .toFixed(2)}
            </span>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setModifyingOrder(null)}
            className="w-full bg-white/5 text-text-light/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveModifiedOrder}
            disabled={isSubmitting || modifyItems.length === 0}
            className="w-full bg-primary text-black py-3 rounded-xl font-black hover:brightness-105 transition-all uppercase text-xs tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50"
          >
            {isSubmitting ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>
    </div>
  );
}
