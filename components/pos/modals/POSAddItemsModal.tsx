import React from "react";
import { X, Plus, Trash2 } from "lucide-react";
import { Order, MenuItem, OrderItemDraft } from "@/types/pos";

interface POSAddItemsModalProps {
  editingOrder: Order | null;
  setEditingOrder: (order: Order | null) => void;
  handleAddItems: (e: React.FormEvent) => void;
  additionalItems: { menuItemId: string; quantity: string }[];
  addAdditionalItemRow: () => void;
  handleAdditionalItemChange: (index: number, field: keyof OrderItemDraft, value: string) => void;
  removeAdditionalItemRow: (index: number) => void;
  availableMenuItems: MenuItem[];
  isSubmitting: boolean;
}

export function POSAddItemsModal({
  editingOrder,
  setEditingOrder,
  handleAddItems,
  additionalItems,
  addAdditionalItemRow,
  handleAdditionalItemChange,
  removeAdditionalItemRow,
  availableMenuItems,
  isSubmitting,
}: POSAddItemsModalProps) {
  if (!editingOrder) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-[#242424] rounded-2xl max-w-md w-full p-6 shadow-2xl border border-white/10 space-y-6">
        <div className="flex justify-between items-center border-b border-white/5 pb-3">
          <h3 className="text-base font-black text-[#E0E0E0] uppercase tracking-tight flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-purple-500"></span>
            Agregar Productos a Orden #{editingOrder.orderNumber}
          </h3>
          <button
            type="button"
            onClick={() => setEditingOrder(null)}
            className="text-[#E0E0E0]/40 hover:text-[#E0E0E0] transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleAddItems} className="space-y-5">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-wider">
                Nuevos Productos
              </span>
              <button
                type="button"
                onClick={addAdditionalItemRow}
                className="text-xs text-primary font-black uppercase tracking-wider flex items-center gap-1 hover:underline"
              >
                <Plus className="h-3.5 w-3.5" /> Fila
              </button>
            </div>

            {additionalItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <select
                  value={item.menuItemId}
                  onChange={(e) =>
                    handleAdditionalItemChange(index, "menuItemId", e.target.value)
                  }
                  className="flex-1 rounded-xl border border-white/5 bg-[#181818] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors"
                  required
                >
                  <option value="" className="bg-[#242424]">
                    Seleccionar Producto
                  </option>
                  {availableMenuItems.map((m) => (
                    <option key={m.id} value={m.id} className="bg-[#242424]">
                      {m.name} (${m.price})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={item.quantity}
                  onChange={(e) =>
                    handleAdditionalItemChange(index, "quantity", e.target.value)
                  }
                  className="w-16 rounded-xl border border-white/5 bg-[#181818] px-2 py-2 text-xs text-center font-black text-[#E0E0E0] outline-none focus:border-primary transition-colors"
                  min="1"
                  required
                />
                <button
                  type="button"
                  onClick={() => removeAdditionalItemRow(index)}
                  className="text-red-400/60 hover:text-red-400 p-1.5 transition-colors"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={() => setEditingOrder(null)}
              className="w-full bg-white/5 text-[#E0E0E0]/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-purple-500 text-white py-3 rounded-xl font-black hover:brightness-110 active:scale-[0.98] transition-all uppercase text-xs tracking-wider shadow-lg shadow-purple-500/20 disabled:opacity-50"
            >
              {isSubmitting ? "Guardando..." : "Agregar Productos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
