import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { Minus, Percent, Plus, Tag, Trash2, X } from "lucide-react";
import { useState } from "react";
import {
  POSDiscountModal,
  DiscountData,
} from "./POSDiscountModal";
import {
  calculateItemDiscount,
  formatDiscountBadge,
} from "@/lib/utils/discounts";

export function POSModifyOrderModal() {
  const {
    availableMenuItems,
    customers,
    refreshOrders,
  } = usePOSData();

  const {
    modifyingOrder,
    setModifyingOrder,
    modifyItems,
    modifyTable,
    setModifyTable,
    modifyCustomerId,
    setModifyCustomerId,
    modifyOrderDiscount,
    modifyOrderTotals,
    handleModifyQuantityChange,
    handleModifyRemoveItem,
    handleApplyModifyItemDiscount,
    handleRemoveModifyItemDiscount,
    handleApplyModifyOrderDiscount,
    handleRemoveModifyOrderDiscount,
    handleSaveModifiedOrder,
    isSubmittingCart,
  } = usePOSCart(availableMenuItems, refreshOrders);

  // Modal de Descuento en Modificación
  const [discountModal, setDiscountModal] = useState<{
    isOpen: boolean;
    isItem: boolean;
    itemIndex?: number;
    title: string;
    subtitle?: string;
    itemQuantity?: number;
    initialDiscount?: DiscountData;
  }>({
    isOpen: false,
    isItem: false,
    title: "",
  });

  if (!modifyingOrder) return null;

  const safeTotals = modifyOrderTotals || {
    subtotalGross: 0,
    itemsDiscount: 0,
    subtotalNet: 0,
    orderDiscount: 0,
    totalDiscount: 0,
    total: 0,
  };

  const openItemDiscount = (index: number) => {
    const item = modifyItems[index];
    setDiscountModal({
      isOpen: true,
      isItem: true,
      itemIndex: index,
      title: `Descuento: ${item.menuItemName}`,
      subtitle: `$${item.unitPrice.toFixed(2)} c/u`,
      itemQuantity: item.quantity,
      initialDiscount: {
        discountType: item.discountType || null,
        discountValue: item.discountValue != null ? Number(item.discountValue) : null,
        discountScope: item.discountScope || "ROW",
        discountReason: item.discountReason || null,
      },
    });
  };

  const openOrderDiscount = () => {
    setDiscountModal({
      isOpen: true,
      isItem: false,
      title: `Descuento en Orden #${modifyingOrder.orderNumber}`,
      subtitle: `Subtotal neto: $${safeTotals.subtotalNet.toFixed(2)}`,
      initialDiscount: {
        discountType: modifyOrderDiscount?.discountType || null,
        discountValue:
          modifyOrderDiscount?.discountValue != null
            ? Number(modifyOrderDiscount.discountValue)
            : null,
        discountReason: modifyOrderDiscount?.discountReason || null,
      },
    });
  };

  const handleApplyDiscountModal = (discount: DiscountData) => {
    if (discountModal.isItem && discountModal.itemIndex !== undefined) {
      handleApplyModifyItemDiscount(discountModal.itemIndex, discount);
    } else {
      handleApplyModifyOrderDiscount(discount);
    }
  };

  const handleRemoveDiscountModal = () => {
    if (discountModal.isItem && discountModal.itemIndex !== undefined) {
      handleRemoveModifyItemDiscount(discountModal.itemIndex);
    } else {
      handleRemoveModifyOrderDiscount();
    }
  };

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

        {/* Mesa y Cliente */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-dark/30 p-3.5 rounded-xl border border-border">
          <div>
            <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
              Mesa / Servicio
            </label>
            <input
              type="text"
              value={modifyTable}
              onChange={(e) => setModifyTable(e.target.value)}
              placeholder="Ej. Mesa 4, Para Llevar..."
              className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs text-text-light outline-none focus:border-amber-400 transition-colors placeholder:text-text-light/30 font-medium"
            />
          </div>
          <div>
            <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1.5">
              Cliente
            </label>
            <select
              aria-label="Cliente"
              value={modifyCustomerId}
              onChange={(e) => setModifyCustomerId(e.target.value)}
              className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs text-text-light outline-none focus:border-primary transition-colors"
            >
              <option value="">General (Sin cliente)</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Listado de ítems modificables */}
        <div className="space-y-3">
          {modifyItems.length === 0 && (
            <p className="text-center text-text-light/30 py-8 text-xs font-extrabold uppercase tracking-widest">
              No quedan productos en la orden
            </p>
          )}
          {modifyItems.map((item, index) => {
            const { discountAmount, finalPrice } = calculateItemDiscount({
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              discountType: item.discountType,
              discountValue: item.discountValue,
              discountScope: item.discountScope,
            });
            const hasItemDiscount = discountAmount > 0;

            return (
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
                  {hasItemDiscount && (
                    <div className="mt-1">
                      <button
                        type="button"
                        onClick={() => openItemDiscount(index)}
                        className="inline-flex items-center gap-1 text-[10px] font-black px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                      >
                        <Tag className="h-2.5 w-2.5" />
                        {formatDiscountBadge(
                          item.discountType,
                          item.discountValue,
                          item.discountReason,
                        )}
                      </button>
                    </div>
                  )}
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

                <div className="flex items-center gap-2 min-w-18 justify-end">
                  <div className="text-right">
                    {hasItemDiscount ? (
                      <div>
                        <span className="text-[10px] font-bold line-through text-text-light/40 mr-1 block">
                          ${(item.unitPrice * item.quantity).toFixed(2)}
                        </span>
                        <span className="font-black text-xs text-emerald-400 tabular-nums">
                          ${finalPrice.toFixed(2)}
                        </span>
                      </div>
                    ) : (
                      <p className="font-black text-xs text-text-light tabular-nums">
                        ${(item.unitPrice * item.quantity).toFixed(2)}
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => openItemDiscount(index)}
                    aria-label="Descuento de producto"
                    className={`p-1 rounded transition-colors ${
                      hasItemDiscount
                        ? "text-emerald-400 hover:text-emerald-300"
                        : "text-text-light/30 hover:text-primary"
                    }`}
                    title={hasItemDiscount ? "Editar descuento" : "Descuento"}
                  >
                    <Percent className="h-3.5 w-3.5" />
                  </button>

                  <button
                    type="button"
                    onClick={() => handleModifyRemoveItem(index)}
                    aria-label="Eliminar producto"
                    className="text-red-400/50 hover:text-red-400 transition-colors p-1"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Descuentos y Totales */}
        {modifyItems.length > 0 && (
          <div className="border-t border-border pt-4 space-y-3">
            {safeTotals.totalDiscount > 0 && (
              <div className="space-y-1 text-xs bg-white/5 p-2.5 rounded-xl border border-border">
                <div className="flex justify-between text-text-light/60">
                  <span>Subtotal bruto</span>
                  <span>${safeTotals.subtotalGross.toFixed(2)}</span>
                </div>
                {safeTotals.itemsDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400/90 font-bold">
                    <span>Descuentos en productos</span>
                    <span>-${safeTotals.itemsDiscount.toFixed(2)}</span>
                  </div>
                )}
                {safeTotals.orderDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400 font-black">
                    <span>
                      Descuento orden{" "}
                      {formatDiscountBadge(
                        modifyOrderDiscount?.discountType,
                        modifyOrderDiscount?.discountValue,
                        modifyOrderDiscount?.discountReason,
                      )}
                    </span>
                    <span>-${safeTotals.orderDiscount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={openOrderDiscount}
                className={`text-[11px] font-black uppercase tracking-wider py-1.5 px-3 rounded-xl border transition-all flex items-center gap-1.5 cursor-pointer ${
                  modifyOrderDiscount?.discountType
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                    : "bg-white/5 border-border/40 text-text-light/60 hover:text-text-light hover:border-primary/40 hover:bg-primary/10"
                }`}
              >
                <Tag className="h-3 w-3" />
                {modifyOrderDiscount?.discountType ? "Editar Descuento Orden" : "+ Descuento Orden"}
              </button>

              {modifyOrderDiscount?.discountType && (
                <button
                  type="button"
                  onClick={handleRemoveModifyOrderDiscount}
                  className="text-[10px] font-black text-red-400/70 hover:text-red-400 uppercase tracking-wider cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-bold text-text-light/50 uppercase tracking-widest">
                Nuevo Total
              </span>
              <span className="text-2xl font-black text-text-light tabular-nums">
                ${safeTotals.total.toFixed(2)}
              </span>
            </div>
          </div>
        )}

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            onClick={() => setModifyingOrder(null)}
            className="w-full bg-white/5 text-text-light/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider cursor-pointer"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSaveModifiedOrder}
            disabled={isSubmittingCart || modifyItems.length === 0}
            className="w-full bg-primary text-black py-3 rounded-xl font-black hover:brightness-105 transition-all uppercase text-xs tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50 cursor-pointer"
          >
            {isSubmittingCart ? "Guardando..." : "Guardar Cambios"}
          </button>
        </div>
      </div>

      {/* Modal de Descuentos para Modificación */}
      <POSDiscountModal
        isOpen={discountModal.isOpen}
        onClose={() => setDiscountModal((prev) => ({ ...prev, isOpen: false }))}
        title={discountModal.title}
        subtitle={discountModal.subtitle}
        isItem={discountModal.isItem}
        itemQuantity={discountModal.itemQuantity}
        initialDiscount={discountModal.initialDiscount}
        onApply={handleApplyDiscountModal}
        onRemove={handleRemoveDiscountModal}
      />
    </div>
  );
}

