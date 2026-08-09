import { isMixedOrderItem, usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { Customer, MenuItem, OrderFormState } from "@/types/pos";
import {
  AlertTriangle,
  Bike,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Plus,
  Printer,
  ShoppingBag,
} from "lucide-react";
import { useState } from "react";
import { sourceOptions } from "../menu/types";

interface POSCartSidebarProps {
  formState: OrderFormState;
  handleFormChange: (field: keyof OrderFormState, value: string) => void;
  customers: Customer[];
  sourceOptions: string[];
  formErrors: Record<string, string>;
  cartError: string | null;
  handleClearCart: () => void;
  clearCartArmed: boolean;
  handleQuantityChange: (index: number, delta: number) => void;
  handleItemNoteChange: (index: number, notes: string) => void;
  availableMenuItems: MenuItem[];
  isSubmitting: boolean;
}

export function POSCartSidebar() {
  const {
    availableMenuItems,
    customers,
    isLoading,
    ordersLoading,
    errorMessage,
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    categories,
    filteredMenuItems,
    nextFolioDisplay,
    refreshOrders,
    lowStockItems,
  } = usePOSData();

  const {
    formState,
    formErrors,
    cartError,
    editingOrder,
    setEditingOrder,
    additionalItems,
    modifyingOrder,
    setModifyingOrder,
    modifyItems,
    mixedOrderMenuItem,
    setMixedOrderMenuItem,
    mixedFlavorCounts,
    handleFormChange,
    handleGridItemClick,
    handleMixedFlavorChange,
    handleMixedOrderConfirm,
    handleQuantityChange,
    handleItemNoteChange,
    handleClearCart,
    clearCartArmed,
    openModifyModal,
    handleModifyQuantityChange,
    handleModifyRemoveItem,
    handleSaveModifiedOrder,
    addAdditionalItemRow,
    handleAdditionalItemChange,
    removeAdditionalItemRow,
    handleAddItems,
    handleCheckoutSubmit,
    handleCancelOrder,
    isSubmittingCart,
  } = usePOSCart(availableMenuItems, refreshOrders);

  const {
    isSubmittingCheckout,
    checkoutError,
    checkoutOrder,
    setCheckoutOrder,
    paymentMethod,
    setPaymentMethod,
    receivedAmount,
    setReceivedAmount,
    showTicket,
    setShowTicket,
    showKitchenTicket,
    setShowKitchenTicket,
    tipType,
    setTipType,
    tipInput,
    setTipInput,
    tipAmountCalculated,
    change,
    unusualTipInfo,
    setUnusualTipInfo,
    showWhatsAppModal,
    setShowWhatsAppModal,
    whatsappNumber,
    setWhatsappNumber,
    generateWhatsAppMessage,
    editingTipOrder,
    setEditingTipOrder,
    editTipType,
    setEditTipType,
    editTipInput,
    setEditTipInput,
    editTipAmountCalculated,
    showSplitBill,
    setShowSplitBill,
    billingOrder,
    setBillingOrder,
    handleProcessPayment,
    handleSplitPayment,
    handleUpdateTip,
    handleFailedPayment,
  } = usePOSCheckout(refreshOrders);
  // Track which cart items have the note input expanded
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  const toggleNote = (index: number) => {
    setExpandedNotes((prev) => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  return (
    <div className="space-y-6 lg:sticky lg:top-24">
      {/* Detalles Adicionales de la Orden */}
      <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xs font-black text-text-light/50 tracking-widest uppercase flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-secondary"></span>
            Detalles Adicionales
          </h2>
          <button
            type="button"
            onClick={() =>
              handleFormChange(
                "table",
                formState.table === "Domicilio" ? "" : "Domicilio",
              )
            }
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all border ${formState.table === "Domicilio"
              ? "bg-secondary/20 border-secondary text-secondary"
              : "bg-white/5 border-transparent text-text-light/60 hover:border-border/15 hover:text-text-light"
              }`}
          >
            <Bike className="h-3.5 w-3.5" />
            DOMICILIO
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
              Cliente
            </label>
            <select
              value={formState.customerId}
              onChange={(e) => handleFormChange("customerId", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs text-text-light outline-none focus:border-primary transition-colors"
            >
              <option value="">General</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
              Origen
            </label>
            <select
              value={formState.source}
              onChange={(e) => handleFormChange("source", e.target.value)}
              className={`w-full rounded-xl border bg-dark/40 px-3 py-2 text-xs text-text-light outline-none transition-colors ${formErrors.source
                ? "border-red-500/50 focus:border-red-400"
                : "border-border focus:border-primary"
                }`}
            >
              {sourceOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
              Notas
            </label>
            <input
              type="text"
              value={formState.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs text-text-light outline-none focus:border-primary transition-colors placeholder:text-text-light/30"
              placeholder="Mesa 4, sin chile..."
            />
          </div>
        </div>
      </section>

      {/* Tu Pedido (Carrito) */}
      <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-sm font-black uppercase text-text-light tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success"></span>
            Tu Pedido
          </h2>
          {formState.items.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className={`text-[10px] font-black uppercase tracking-wider transition-all px-2.5 py-1 rounded-lg border ${clearCartArmed
                ? "bg-red-500/20 border-red-500/50 text-red-400 animate-[pulse_0.5s_ease-in-out_infinite]"
                : "border-transparent text-red-400/60 hover:text-red-400 hover:border-red-500/20 hover:bg-red-500/10"
                }`}
            >
              {clearCartArmed ? "¿Confirmar?" : "Vaciar"}
            </button>
          )}
        </div>

        {/* Inline errors */}
        {(formErrors.items || cartError) && (
          <div className="rounded-xl bg-red-500/10 p-3 border border-red-500/20 text-xs font-bold text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {formErrors.items || cartError}
          </div>
        )}

        {/* Listado del Carrito */}
        <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1 custom-scrollbar">
          {formState.items.length === 0 ? (
            <div className="text-center py-12 text-text-light/40 space-y-2">
              <ShoppingBag className="h-10 w-10 mx-auto opacity-20 text-primary" />
              <p className="text-xs font-extrabold uppercase tracking-widest">
                El carrito está vacío
              </p>
              <p className="text-[11px] font-medium text-text-light/30">
                Selecciona productos del catálogo
              </p>
            </div>
          ) : (
            formState.items.map((item, index) => {
              const product = availableMenuItems.find(
                (m) => m.id === item.menuItemId,
              );
              const isMixed = product && isMixedOrderItem(product.name);
              const noteExpanded = expandedNotes.has(index);
              return (
                <div
                  key={index}
                  className="bg-card-light rounded-xl border border-border overflow-hidden"
                >
                  <div className="flex items-center justify-between p-3 gap-3">
                    <div className="flex-1 min-w-0">
                      <p className="font-black text-xs text-text-light uppercase tracking-tight truncate">
                        {product?.name || "Producto"}
                      </p>
                      {isMixed && item.notes ? (
                        <p className="text-[10px] font-extrabold text-amber-400 mt-0.5">
                          {item.notes}
                        </p>
                      ) : (
                        <p className="text-[10px] font-bold text-text-light/50 mt-0.5">
                          ${product?.price.toFixed(2)} c/u
                        </p>
                      )}
                    </div>

                    <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-border">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(index, -1)}
                        className="h-6 w-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-text-light hover:text-red-400 flex items-center justify-center font-bold text-xs transition-colors active:scale-90"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-black text-xs text-text-light">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(index, 1)}
                        className="h-6 w-6 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-text-light hover:text-emerald-400 flex items-center justify-center font-bold text-xs transition-colors active:scale-90"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 min-w-[55px] justify-end">
                      <p className="font-black text-xs text-text-light tabular-nums">
                        $
                        {(
                          (product?.price || 0) * Number(item.quantity)
                        ).toFixed(2)}
                      </p>
                      {!isMixed && (
                        <button
                          type="button"
                          onClick={() => toggleNote(index)}
                          className="text-text-light/30 hover:text-text-light/70 transition-colors"
                          title="Agregar nota"
                        >
                          {noteExpanded ? (
                            <ChevronUp className="h-3.5 w-3.5" />
                          ) : (
                            <ChevronDown className="h-3.5 w-3.5" />
                          )}
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Expandable note input */}
                  {noteExpanded && !isMixed && (
                    <div className="px-3 pb-3">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) =>
                          handleItemNoteChange(index, e.target.value)
                        }
                        placeholder="Nota especial (sin cebolla, extra salsa...)"
                        className="w-full rounded-lg border border-border bg-dark/30 px-3 py-1.5 text-[11px] text-text-light outline-none focus:border-primary/40 transition-colors placeholder:text-text-light/25"
                        autoFocus
                      />
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Total y Acción */}
        {formState.items.length > 0 && (
          <div className="pt-4 border-t border-border space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-text-light/50 uppercase tracking-widest">
                Total a Pagar
              </span>
              <span className="text-3xl font-black text-text-light tracking-tight tabular-nums">
                $
                {formState.items
                  .reduce((total, item) => {
                    const product = availableMenuItems.find(
                      (m) => m.id === item.menuItemId,
                    );
                    return (
                      total + (product?.price || 0) * Number(item.quantity)
                    );
                  }, 0)
                  .toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmittingCart || isSubmittingCheckout}
              className="w-full rounded-xl bg-primary py-3.5 text-black font-black text-sm hover:brightness-105 active:scale-[0.98] transition-all uppercase tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmittingCart || isSubmittingCheckout ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  GUARDANDO...
                </>
              ) : (
                <>
                  <Printer className="h-4 w-4" />
                  GUARDAR E IMPRIMIR
                </>
              )}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
