import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSData } from "@/hooks/pos/usePOSData";
import {
  MIXED_ORDER_FLAVORS,
  MIXED_ORDER_TOTAL
} from "@/types/pos";
import { Minus, Plus, UtensilsCrossed, X } from "lucide-react";

export function POSMixedOrderModal() {
  const {
    availableMenuItems,
    refreshOrders,
  } = usePOSData();

  const {
    mixedOrderMenuItem,
    setMixedOrderMenuItem,
    mixedFlavorCounts,
    handleMixedFlavorChange,
    handleMixedOrderConfirm,
  } = usePOSCart(availableMenuItems, refreshOrders);

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-card rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-border space-y-5">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
            <UtensilsCrossed className="h-4 w-4 text-amber-400" />
            {mixedOrderMenuItem!.name}
          </h3>
          <button
            type="button"
            onClick={() => setMixedOrderMenuItem(null)}
            className="text-text-light/40 hover:text-text-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider text-center">
          Selecciona {MIXED_ORDER_TOTAL} piezas en total
        </p>

        <div className="space-y-2.5">
          {MIXED_ORDER_FLAVORS.map((flavor) => (
            <div
              key={flavor}
              className="flex items-center justify-between bg-dark/40 px-4 py-2.5 rounded-xl border border-border"
            >
              <span className="font-black text-xs text-text-light uppercase tracking-wider">
                {flavor}
              </span>
              <div className="flex items-center gap-1.5 bg-white/5 rounded-xl p-1 border border-border">
                <button
                  type="button"
                  onClick={() => handleMixedFlavorChange(flavor, -1)}
                  disabled={mixedFlavorCounts[flavor] === 0}
                  className="h-6 w-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-text-light flex items-center justify-center font-bold text-xs transition-colors disabled:opacity-30"
                >
                  <Minus className="h-3 w-3" />
                </button>
                <span className="w-5 text-center font-black text-xs text-text-light">
                  {mixedFlavorCounts[flavor]}
                </span>
                <button
                  type="button"
                  onClick={() => handleMixedFlavorChange(flavor, 1)}
                  disabled={
                    Object.values(mixedFlavorCounts).reduce(
                      (s, v) => s + v,
                      0,
                    ) >= MIXED_ORDER_TOTAL
                  }
                  className="h-6 w-6 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-text-light flex items-center justify-center font-bold text-xs transition-colors disabled:opacity-30"
                >
                  <Plus className="h-3 w-3" />
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="flex items-center justify-center gap-2 pt-2">
          {Array.from({ length: MIXED_ORDER_TOTAL }).map((_, i) => {
            const filled =
              i < Object.values(mixedFlavorCounts).reduce((s, v) => s + v, 0);
            return (
              <div
                key={i}
                className={`w-3.5 h-3.5 rounded-full border transition-all ${filled
                  ? "bg-primary border-primary shadow-sm shadow-primary/50"
                  : "border-white/20 bg-transparent"
                  }`}
              />
            );
          })}
          <span className="text-xs font-bold text-text-light/50 ml-2 uppercase tracking-wider">
            {Object.values(mixedFlavorCounts).reduce((s, v) => s + v, 0)}/
            {MIXED_ORDER_TOTAL} pzas
          </span>
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setMixedOrderMenuItem(null)}
            className="w-full bg-white/5 text-text-light/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleMixedOrderConfirm}
            disabled={
              Object.values(mixedFlavorCounts).reduce((s, v) => s + v, 0) !==
              MIXED_ORDER_TOTAL
            }
            className="w-full bg-primary text-black py-3 rounded-xl font-black hover:brightness-105 transition-all uppercase text-xs tracking-wider shadow-lg shadow-primary/10 disabled:opacity-30"
          >
            Agregar
          </button>
        </div>
      </div>
    </div>
  );
}
