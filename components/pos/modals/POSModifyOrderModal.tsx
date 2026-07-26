import React from "react";
import { X, Minus, Plus, Trash2 } from "lucide-react";
import { Order } from "@/types/pos";

interface POSModifyOrderModalProps {
  modifyingOrder: Order | null;
  setModifyingOrder: (order: Order | null) => void;
  modifyItems: any[];
  setModifyItems: (items: any[]) => void;
  handleModifyQuantityChange: (index: number, delta: number) => void;
  handleModifyRemoveItem: (index: number) => void;
  handleSaveModifiedOrder: () => void;
  isSubmitting: boolean;
}

export function POSModifyOrderModal({
  modifyingOrder,
  setModifyingOrder,
  modifyItems,
  setModifyItems,
  handleModifyQuantityChange,
  handleModifyRemoveItem,
  handleSaveModifiedOrder,
  isSubmitting,
}: POSModifyOrderModalProps) {
  if (!modifyingOrder) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-[#242424] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 space-y-6 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <h3 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-orange-400"></span>
            Modificar Orden #{modifyingOrder.orderNumber}
          </h3>
          <button
            type="button"
            onClick={() => {
              setModifyingOrder(null);
              setModifyItems([]);
            }}
            className="text-[#E0E0E0]/40 hover:text-[#E0E0E0] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-3">
          {modifyItems.length === 0 && (
            <p className="text-center text-[#E0E0E0]/40 py-6 text-xs italic">
              No quedan productos en la orden.
            </p>
          )}
          {modifyItems.map((item, index) => (
            <div
              key={item.id}
              className="flex gap-3 items-center bg-[#1A1A1A] p-3 rounded-xl border border-white/5"
            >
              <div className="flex-1 min-w-0">
                <p className="font-black text-xs text-[#E0E0E0] uppercase tracking-tight truncate">
                  {item.menuItemName}
                </p>
                <p className="text-[10px] font-bold text-[#E0E0E0]/50 mt-0.5">
                  ${item.unitPrice.toFixed(2)} c/u
                </p>
              </div>

              <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                <button
                  type="button"
                  onClick={() => handleModifyQuantityChange(index, -1)}
                  className="h-6 w-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-[#E0E0E0] hover:text-red-400 flex items-center justify-center font-bold text-xs transition-colors"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center font-black text-xs text-[#E0E0E0]">
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => handleModifyQuantityChange(index, 1)}
                  className="h-6 w-6 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-[#E0E0E0] hover:text-emerald-400 flex items-center justify-center font-bold text-xs transition-colors"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>

              <div className="flex items-center gap-2 min-w-[70px] justify-end">
                <p className="font-black text-xs text-[#E0E0E0] tabular-nums">
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
          <div className="border-t border-white/5 pt-4 flex justify-between items-center">
            <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-widest">
              Nuevo Total
            </span>
            <span className="text-2xl font-black text-[#E0E0E0] tabular-nums">
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
            onClick={() => {
              setModifyingOrder(null);
              setModifyItems([]);
            }}
            className="w-full bg-white/5 text-[#E0E0E0]/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider"
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
