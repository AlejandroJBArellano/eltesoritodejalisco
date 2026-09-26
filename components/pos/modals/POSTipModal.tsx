import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { useOptionalUser } from "@/components/UserProvider";
import { HandCoins, X } from "lucide-react";
import { useState, useEffect } from "react";
import { POSManagerAuthModal } from "./POSManagerAuthModal";

export function POSTipModal() {
  const user = useOptionalUser();
  const isWaiter = user?.isWaiter ?? false;
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const { refreshOrders } = usePOSData();

  const {
    isSubmittingCheckout,
    editingTipOrder,
    setEditingTipOrder,
    editTipType,
    setEditTipType,
    editTipInput,
    setEditTipInput,
    editTipPaymentMethod,
    setEditTipPaymentMethod,
    editTipAmountCalculated,
    handleUpdateTip,
  } = usePOSCheckout(refreshOrders);

  useEffect(() => {
    if (editingTipOrder?.payments && editingTipOrder.payments.length > 0) {
      const p = editingTipOrder.payments[0];
      const initialMethod = ((p.tipPaymentMethod || p.method || "CASH") as string) as
        | "SAME"
        | "CASH"
        | "CARD"
        | "TRANSFER";
      setEditTipPaymentMethod(initialMethod);
    }
  }, [editingTipOrder, setEditTipPaymentMethod]);

  if (!editingTipOrder) return null;

  const onUpdateTipClick = async () => {
    if (isWaiter) {
      setIsAuthModalOpen(true);
      return;
    }
    await handleUpdateTip();
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-card rounded-xl max-w-md w-full p-6 shadow-2xl border border-border space-y-6">
        <div className="flex justify-between items-center border-b border-border pb-3">
          <h3 className="text-sm font-bold text-text-light uppercase tracking-tight flex items-center gap-2">
            <HandCoins className="h-4 w-4 text-primary" />
            Editar Propina - Orden #{editingTipOrder.orderNumber}
          </h3>
          <button
            type="button"
            aria-label="Cerrar modal"
            onClick={() => setEditingTipOrder(null)}
            className="text-text-light/50 hover:text-text-light transition-colors p-1 rounded-md hover:bg-dark/40 cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-5">
          <div className="text-center bg-dark/40 py-4 rounded-lg border border-border space-y-1">
            <p className="text-xs font-bold text-text-light/50 uppercase tracking-wider font-mono tabular-nums">
              Total de la orden: ${editingTipOrder.total.toFixed(2)}
            </p>
            <p className="text-xl font-bold font-mono text-primary tabular-nums">
              Nueva Propina: ${editTipAmountCalculated.toFixed(2)}
            </p>
          </div>

          <div>
            <label className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider block mb-2">
              Ajustar Propina
            </label>
            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => {
                  setEditTipType("NONE");
                  setEditTipInput("");
                }}
                className={`flex-1 py-2 text-[10px] rounded-lg font-bold uppercase border transition-all cursor-pointer ${
                  editTipType === "NONE"
                    ? "bg-primary/20 border-primary text-primary"
                    : "border-border text-text-light/60 bg-white/5 hover:text-text-light hover:bg-white/10"
                }`}
              >
                Sin Propina
              </button>
              <button
                type="button"
                onClick={() => setEditTipType("PERCENTAGE")}
                className={`flex-1 py-2 text-[10px] rounded-lg font-bold uppercase border transition-all cursor-pointer ${
                  editTipType === "PERCENTAGE"
                    ? "bg-primary/20 border-primary text-primary"
                    : "border-border text-text-light/60 bg-white/5 hover:text-text-light hover:bg-white/10"
                }`}
              >
                %
              </button>
              <button
                type="button"
                onClick={() => setEditTipType("FIXED")}
                className={`flex-1 py-2 text-[10px] rounded-lg font-bold uppercase border transition-all cursor-pointer ${
                  editTipType === "FIXED"
                    ? "bg-primary/20 border-primary text-primary"
                    : "border-border text-text-light/60 bg-white/5 hover:text-text-light hover:bg-white/10"
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
                  className={`py-2 text-xs rounded-lg font-bold uppercase border transition-all cursor-pointer ${
                    editTipType === "PERCENTAGE" && editTipInput === pct
                      ? "bg-primary text-background border-primary"
                      : "border-border text-text-light/60 bg-white/5 hover:text-text-light hover:bg-white/10"
                  }`}
                >
                  {pct}%
                </button>
              ))}
            </div>

            {editTipType !== "NONE" && (
              <>
                <input
                  type="number"
                  value={editTipInput}
                  onChange={(e) => setEditTipInput(e.target.value)}
                  placeholder={
                    editTipType === "PERCENTAGE" ? "% Ej. 10" : "$ Monto"
                  }
                  className="w-full text-base font-bold font-mono p-2.5 border border-border bg-dark/40 rounded-lg focus:border-primary outline-none text-center text-text-light transition-colors placeholder:text-text-light/30 tabular-nums"
                />

                <div className="space-y-1.5 pt-2">
                  <label className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider block">
                    Método de la Propina
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {[
                      { value: "CASH", label: "Efectivo" },
                      { value: "CARD", label: "Tarjeta" },
                      { value: "TRANSFER", label: "Transf." },
                    ].map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setEditTipPaymentMethod(opt.value as any)
                        }
                        className={`py-2 text-xs rounded-lg font-bold uppercase border transition-all cursor-pointer ${
                          editTipPaymentMethod === opt.value
                            ? "bg-primary/20 border-primary text-primary"
                            : "border-border text-text-light/60 bg-white/5 hover:text-text-light hover:bg-white/10"
                        }`}
                      >
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2 pt-2">
            <button
              type="button"
              onClick={onUpdateTipClick}
              disabled={isSubmittingCheckout}
              className="w-full bg-primary text-background py-3 rounded-lg font-bold text-xs hover:brightness-110 shadow-xs disabled:opacity-30 transition-all uppercase tracking-wider cursor-pointer"
            >
              {isSubmittingCheckout ? "Actualizando..." : "Actualizar Propina"}
            </button>
            <button
              type="button"
              onClick={() => setEditingTipOrder(null)}
              className="w-full bg-dark/40 text-text-light/60 py-2 rounded-lg font-bold text-xs hover:bg-dark/40 hover:text-text-light transition-all uppercase tracking-wider border border-border cursor-pointer"
            >
              Cancelar
            </button>
          </div>
        </div>
      </div>

      <POSManagerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
        title="Autorizar Edición de Propina"
        description={`Modificar la propina de la orden #${editingTipOrder.orderNumber} requiere PIN de Gerencia.`}
        reasonPresets={[
          "Error de captura",
          "Cliente cambió monto",
          "Propina omitida en cobro",
        ]}
        onAuthorize={async ({ pin }) => {
          await handleUpdateTip(pin);
        }}
        isSubmitting={isSubmittingCheckout}
      />
    </div>
  );
}
