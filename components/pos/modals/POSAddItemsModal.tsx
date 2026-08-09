import { Plus, Trash2, X } from "lucide-react";

import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSData } from "@/hooks/pos/usePOSData";

export function POSAddItemsModal() {
  const {
    availableMenuItems,
    refreshOrders,
  } = usePOSData();

  const {
    editingOrder,
    setEditingOrder,
    additionalItems,
    addAdditionalItemRow,
    handleAdditionalItemChange,
    removeAdditionalItemRow,
    handleAddItems,
    isSubmittingCart,
  } = usePOSCart(availableMenuItems, refreshOrders);

  if (!editingOrder) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-6">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-pulse"></span>
            Agregar Productos a Orden #{editingOrder!.orderNumber}
          </h3>
          <button
            type="button"
            onClick={() => setEditingOrder(null)}
            disabled={isSubmittingCart}
            className="text-text-light/40 hover:text-text-light focus-visible:text-text-light focus-visible:bg-white/10 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none disabled:opacity-30 disabled:pointer-events-none transition-all p-1.5 rounded-lg hover:bg-white/10"
            aria-label="Cerrar"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleAddItems} className="space-y-5">
          <div className="space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
                Nuevos Productos
              </span>
              <button
                type="button"
                onClick={addAdditionalItemRow}
                disabled={isSubmittingCart}
                className="text-xs text-primary font-black uppercase tracking-wider flex items-center gap-1 hover:text-primary/80 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 outline-none rounded px-1 transition-all disabled:opacity-40 disabled:pointer-events-none"
              >
                <Plus className="h-3.5 w-3.5" /> Fila
              </button>
            </div>

            {additionalItems.map((item, index) => (
              <div key={index} className="flex gap-2 items-center">
                <select
                  value={item.menuItemId}
                  disabled={isSubmittingCart}
                  onChange={(e) =>
                    handleAdditionalItemChange(
                      index,
                      "menuItemId",
                      e.target.value,
                    )
                  }
                  className="flex-1 rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs text-text-light outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  required
                >
                  <option value="" className="bg-card">
                    Seleccionar Producto
                  </option>
                  {availableMenuItems.map((m) => (
                    <option key={m.id} value={m.id} className="bg-card">
                      {m.name} (${m.price})
                    </option>
                  ))}
                </select>
                <input
                  type="number"
                  value={item.quantity}
                  disabled={isSubmittingCart}
                  onChange={(e) =>
                    handleAdditionalItemChange(
                      index,
                      "quantity",
                      e.target.value,
                    )
                  }
                  className="w-16 rounded-xl border border-border bg-dark/40 px-2 py-2 text-xs text-center font-black text-text-light outline-none focus:border-primary focus:ring-2 focus:ring-primary/20 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  min="1"
                  required
                />
                <button
                  type="button"
                  disabled={isSubmittingCart}
                  onClick={() => removeAdditionalItemRow(index)}
                  className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 focus-visible:ring-2 focus-visible:ring-red-400 focus-visible:ring-offset-2 outline-none p-1.5 rounded-lg transition-all disabled:opacity-30 disabled:pointer-events-none"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              disabled={isSubmittingCart}
              onClick={() => setEditingOrder(null)}
              className="w-full bg-white/5 text-text-light/60 py-3 rounded-xl font-black border border-border hover:bg-white/10 hover:text-text-light hover:border-text-light/30 focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none disabled:opacity-50 disabled:pointer-events-none transition-all uppercase text-xs tracking-wider"
            >
              Cancelar
            </button>
            <button
              type="submit"
              disabled={isSubmittingCart}
              className="w-full bg-purple-500 text-white py-3 rounded-xl font-black hover:brightness-110 active:scale-[0.98] focus-visible:ring-2 focus-visible:ring-purple-500 focus-visible:ring-offset-2 focus-visible:ring-offset-card outline-none transition-all uppercase text-xs tracking-wider shadow-lg shadow-purple-500/20 disabled:opacity-30 disabled:pointer-events-none"
            >
              {isSubmittingCart ? "Guardando..." : "Agregar Productos"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
