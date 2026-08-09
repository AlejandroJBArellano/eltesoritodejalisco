import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { HandCoins, X } from "lucide-react";

export function POSTipModal() {
  const { refreshOrders } = usePOSData()

  const {
    isSubmittingCheckout,
    editingTipOrder,
    setEditingTipOrder,
    editTipType,
    setEditTipType,
    editTipInput,
    setEditTipInput,
    editTipAmountCalculated,
    handleUpdateTip,
  } = usePOSCheckout(refreshOrders);

  if (!editingTipOrder) return null;

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-card rounded-2xl max-w-md w-full p-6 shadow-2xl border border-border space-y-6">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-blue-400" />
            Editar Propina - Orden #{editingTipOrder.orderNumber}
          </h3>
          <button
            type="button"
            onClick={() => setEditingTipOrder(null)}
            className="text-text-light/40 hover:text-text-light transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="text-center bg-dark/40 py-4 rounded-xl border border-border space-y-1">
            <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
              Total de la orden: ${editingTipOrder.total.toFixed(2)}
            </p>
            <p className="text-xl font-black text-blue-400">
              Nueva Propina: ${editTipAmountCalculated.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-2">
              Ajustar Propina
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setEditTipType("NONE");
                  setEditTipInput("");
                }}
                className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border transition-all ${editTipType === "NONE"
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-border text-text-light/60 bg-white/5 hover:border-border"
                  }`}
              >
                Sin Propina
              </button>
              <button
                type="button"
                onClick={() => setEditTipType("PERCENTAGE")}
                className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border transition-all ${editTipType === "PERCENTAGE"
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-border text-text-light/60 bg-white/5 hover:border-border"
                  }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setEditTipType("FIXED")}
                className={`flex-1 py-2 text-[10px] rounded-xl font-black uppercase border transition-all ${editTipType === "FIXED"
                  ? "bg-primary/20 border-primary text-primary"
                  : "border-border text-text-light/60 bg-white/5 hover:border-border"
                  }`}
              >
                $ Fijo
              </button>
            </div>

            <div className="grid grid-cols-3 gap-2 mb-2">
              {["10", "15", "20"].map((pct) => (
                <button
                  key={pct}
                  type="button"
                  onClick={() => {
                    setEditTipType("PERCENTAGE");
                    setEditTipInput(pct);
                  }}
                  className={`py-2 text-xs rounded-xl font-black uppercase border transition-all ${editTipType === "PERCENTAGE" && editTipInput === pct
                    ? "bg-primary text-black border-primary"
                    : "border-border text-text-light/60 bg-white/5 hover:border-border"
                    }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {editTipType !== "NONE" && (
              <input
                type="number"
                value={editTipInput}
                onChange={(e) => setEditTipInput(e.target.value)}
                placeholder={
                  editTipType === "PERCENTAGE" ? "% Ej. 10" : "$ Monto"
                }
                className="w-full text-base font-black p-3 border border-border bg-dark/40 rounded-xl focus:border-primary outline-none text-center text-text-light transition-colors placeholder:text-text-light/30"
              />
            )}
          </div>

          <div className="flex flex-col gap-2.5 pt-2">
            <button
              type="button"
              onClick={handleUpdateTip}
              disabled={isSubmittingCheckout}
              className="w-full bg-primary text-black py-3.5 rounded-xl font-black text-sm hover:brightness-105 shadow-lg shadow-primary/10 disabled:opacity-30 transition-all uppercase tracking-wider"
            >
              {isSubmittingCheckout ? "Actualizando..." : "Actualizar Propina"}
            </button>
            <button
              type="button"
              onClick={() => setEditingTipOrder(null)}
              className="w-full bg-white/5 text-text-light/60 py-2.5 rounded-xl font-black text-xs hover:bg-white/10 transition-all uppercase tracking-wider border border-border"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
