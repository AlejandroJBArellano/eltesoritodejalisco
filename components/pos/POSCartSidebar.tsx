import { isMixedOrderItem, usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import {
  Customer,
  MenuItem,
  OrderFormState,
  OrderServiceType,
} from "@/types/pos";
import {
  AlertTriangle,
  Bike,
  ChevronDown,
  ChevronUp,
  Loader2,
  Minus,
  Percent,
  Plus,
  Printer,
  ShoppingBag,
  Tag,
  Utensils,
} from "lucide-react";
import { useState } from "react";
import { sourceOptions } from "../menu/types";
import { POSDiscountModal, DiscountData } from "./modals/POSDiscountModal";
import {
  calculateItemDiscount,
  formatDiscountBadge,
} from "@/lib/utils/discounts";

export interface POSCartSidebarProps {
  formState: OrderFormState;
  handleFormChange: (field: keyof OrderFormState, value: string) => void;
  handleServiceTypeChange?: (serviceType: OrderServiceType) => void;
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
  const { availableMenuItems, customers, refreshOrders } = usePOSData();

  const {
    formState,
    formErrors,
    cartError,
    cartTotals,
    handleFormChange,
    handleServiceTypeChange,
    handleQuantityChange,
    handleItemNoteChange,
    handleClearCart,
    clearCartArmed,
    isSubmittingCart,
    handleApplyItemDiscount,
    handleRemoveItemDiscount,
    handleApplyOrderDiscount,
    handleRemoveOrderDiscount,
  } = usePOSCart(availableMenuItems, refreshOrders);

  const safeTotals = cartTotals || {
    subtotalGross: 0,
    itemsDiscount: 0,
    subtotalNet: 0,
    orderDiscount: 0,
    totalDiscount: 0,
    total: 0,
  };

  const { isSubmittingCheckout } = usePOSCheckout(refreshOrders);
  // Track which cart items have the note input expanded
  const [expandedNotes, setExpandedNotes] = useState<Set<number>>(new Set());

  // Modal de Descuentos
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

  const openItemDiscount = (index: number) => {
    const item = formState.items[index];
    const product = availableMenuItems.find((m) => m.id === item.menuItemId);
    setDiscountModal({
      isOpen: true,
      isItem: true,
      itemIndex: index,
      title: product?.name
        ? `Descuento: ${product.name}`
        : "Descuento en Producto",
      subtitle: `$${(product?.price || 0).toFixed(2)} c/u`,
      itemQuantity: Number(item.quantity) || 1,
      initialDiscount: {
        discountType: item.discountType || null,
        discountValue:
          item.discountValue != null ? Number(item.discountValue) : null,
        discountScope: item.discountScope || "ROW",
        discountReason: item.discountReason || null,
      },
    });
  };

  const openOrderDiscount = () => {
    setDiscountModal({
      isOpen: true,
      isItem: false,
      title: "Descuento a la Orden",
      subtitle: `Subtotal neto: $${safeTotals.subtotalNet.toFixed(2)}`,
      initialDiscount: {
        discountType: formState.discountType || null,
        discountValue:
          formState.discountValue != null
            ? Number(formState.discountValue)
            : null,
        discountReason: formState.discountReason || null,
      },
    });
  };

  const handleApplyDiscountModal = (discount: DiscountData) => {
    if (discountModal.isItem && discountModal.itemIndex !== undefined) {
      handleApplyItemDiscount(discountModal.itemIndex, discount);
    } else {
      handleApplyOrderDiscount(discount);
    }
  };

  const handleRemoveDiscountModal = () => {
    if (discountModal.isItem && discountModal.itemIndex !== undefined) {
      handleRemoveItemDiscount(discountModal.itemIndex);
    } else {
      handleRemoveOrderDiscount();
    }
  };

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
    <div className="space-y-4 lg:sticky lg:top-24">
      {/* Detalles Adicionales de la Orden */}
      <section className="rounded-xl bg-card p-5 shadow-xs border border-border space-y-4">
        <div className="border-b border-border pb-3.5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-[11px] font-black text-text-light/50 tracking-wider uppercase flex items-center gap-2">
              <span className="h-1.5 w-1.5 rounded-full bg-secondary"></span>
              Tipo de Servicio
            </h2>
          </div>

          {/* Selector de servicio: Comedor, Para Llevar, Domicilio */}
          <div
            className="grid grid-cols-3 gap-2"
            role="radiogroup"
            aria-label="Tipo de servicio"
          >
            <button
              type="button"
              role="radio"
              aria-checked={formState.serviceType === "COMEDOR"}
              onClick={() => handleServiceTypeChange?.("COMEDOR")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all border outline-none cursor-pointer ${
                formState.serviceType === "COMEDOR"
                  ? "bg-amber-500/15 border-amber-500/40 text-amber-300 shadow-xs"
                  : "bg-white/5 border-transparent text-text-light/60 hover:border-border hover:text-text-light"
              }`}
            >
              <Utensils className="h-3.5 w-3.5 shrink-0" />
              <span>COMEDOR</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={formState.serviceType === "PARA_LLEVAR"}
              onClick={() => handleServiceTypeChange?.("PARA_LLEVAR")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all border outline-none cursor-pointer ${
                formState.serviceType === "PARA_LLEVAR"
                  ? "bg-primary/20 border-primary/40 text-primary shadow-xs"
                  : "bg-white/5 border-transparent text-text-light/60 hover:border-border hover:text-text-light"
              }`}
            >
              <ShoppingBag className="h-3.5 w-3.5 shrink-0" />
              <span>LLEVAR</span>
            </button>

            <button
              type="button"
              role="radio"
              aria-checked={formState.serviceType === "DOMICILIO"}
              onClick={() => handleServiceTypeChange?.("DOMICILIO")}
              className={`flex items-center justify-center gap-1.5 py-2 px-2 rounded-lg text-xs font-bold transition-all border outline-none cursor-pointer ${
                formState.serviceType === "DOMICILIO"
                  ? "bg-secondary/20 border-secondary/40 text-secondary shadow-xs"
                  : "bg-white/5 border-transparent text-text-light/60 hover:border-border hover:text-text-light"
              }`}
            >
              <Bike className="h-3.5 w-3.5 shrink-0" />
              <span>DOMICILIO</span>
            </button>
          </div>
        </div>

        <div
          className={`grid gap-3 ${formState.serviceType === "COMEDOR" ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}
        >
          {formState.serviceType === "COMEDOR" && (
            <div>
              <label className="text-[10px] font-black text-text-light/50 uppercase tracking-wider block mb-1">
                Mesa (Opcional)
              </label>
              <input
                type="text"
                value={formState.table}
                onChange={(e) => handleFormChange("table", e.target.value)}
                className="w-full rounded-lg border border-border bg-dark/40 px-3 py-1.5 text-xs text-text-light outline-none focus:border-amber-400 transition-colors placeholder:text-text-light/30 font-medium"
                placeholder="Ej. 4, Terraza..."
              />
            </div>
          )}

          <div>
            <label className="text-[10px] font-black text-text-light/50 uppercase tracking-wider block mb-1">
              Cliente
            </label>
            <select
              value={formState.customerId}
              onChange={(e) => handleFormChange("customerId", e.target.value)}
              className="w-full rounded-lg border border-border bg-dark/40 px-3 py-1.5 text-xs text-text-light outline-none focus:border-primary transition-colors"
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
            <label className="text-[10px] font-black text-text-light/50 uppercase tracking-wider block mb-1">
              Origen
            </label>
            <select
              value={formState.source}
              onChange={(e) => handleFormChange("source", e.target.value)}
              className={`w-full rounded-lg border bg-dark/40 px-3 py-1.5 text-xs text-text-light outline-none transition-colors ${
                formErrors.source
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
            <label className="text-[10px] font-black text-text-light/50 uppercase tracking-wider block mb-1">
              Notas
            </label>
            <input
              type="text"
              value={formState.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              className="w-full rounded-lg border border-border bg-dark/40 px-3 py-1.5 text-xs text-text-light outline-none focus:border-primary transition-colors placeholder:text-text-light/30"
              placeholder="Sin cebolla, salsa aparte..."
            />
          </div>
        </div>
      </section>

      {/* Tu Pedido (Carrito) */}
      <section className="rounded-xl bg-card p-5 shadow-xs border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-xs font-black uppercase text-text-light tracking-wider flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-success"></span>
            Tu Pedido
          </h2>
          {formState.items.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className={`text-[10px] font-bold uppercase tracking-wider transition-all px-2.5 py-1 rounded-lg border cursor-pointer ${
                clearCartArmed
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
          <div className="rounded-lg bg-red-500/10 p-3 border border-red-500/20 text-xs font-bold text-red-400 flex items-center gap-2">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" />
            {formErrors.items || cartError}
          </div>
        )}

        {/* Listado del Carrito */}
        <div className="space-y-2 max-h-[42vh] overflow-y-auto pr-1 custom-scrollbar">
          {formState.items.length === 0 ? (
            <div className="text-center py-10 text-text-light/40 space-y-2">
              <ShoppingBag className="h-8 w-8 mx-auto opacity-20 text-primary" />
              <p className="text-[11px] font-bold uppercase tracking-wider">
                El carrito está vacío
              </p>
              <p className="text-[10px] font-medium text-text-light/30">
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

              const { discountAmount, finalPrice } = calculateItemDiscount({
                unitPrice: product?.price || 0,
                quantity: Number(item.quantity) || 1,
                discountType: item.discountType,
                discountValue: item.discountValue,
                discountScope: item.discountScope,
              });
              const hasItemDiscount = discountAmount > 0;

              return (
                <div
                  key={index}
                  className="bg-card-light/40 rounded-lg border border-border overflow-hidden"
                >
                  <div className="flex items-center justify-between p-2.5 gap-2.5">
                    <div className="flex-1 min-w-0">
                      <p className="font-bold text-xs text-text-light tracking-tight truncate">
                        {product?.name || "Producto"}
                      </p>
                      {isMixed && item.notes ? (
                        <p className="text-[10px] font-semibold text-amber-400 mt-0.5">
                          {item.notes}
                        </p>
                      ) : (
                        <p className="text-[10px] font-mono text-text-light/50 mt-0.5 tabular-nums">
                          ${(product?.price || 0).toFixed(2)} c/u
                        </p>
                      )}

                      {/* Badge de descuento en el ítem */}
                      {hasItemDiscount && (
                        <div className="mt-1">
                          <button
                            type="button"
                            onClick={() => openItemDiscount(index)}
                            className="inline-flex items-center gap-1 text-[9px] font-mono font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer"
                            title="Editar descuento de este producto"
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

                    <div className="flex items-center gap-1 bg-dark/40 rounded-lg p-0.5 border border-border">
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(index, -1)}
                        className="h-6 w-6 rounded-md bg-white/5 hover:bg-red-500/20 text-text-light hover:text-red-400 flex items-center justify-center font-bold text-xs transition-colors active:scale-95 cursor-pointer"
                      >
                        <Minus className="h-3 w-3" />
                      </button>
                      <span className="w-5 text-center font-mono font-bold text-xs text-text-light tabular-nums">
                        {item.quantity}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleQuantityChange(index, 1)}
                        className="h-6 w-6 rounded-md bg-white/5 hover:bg-emerald-500/20 text-text-light hover:text-emerald-400 flex items-center justify-center font-bold text-xs transition-colors active:scale-95 cursor-pointer"
                      >
                        <Plus className="h-3 w-3" />
                      </button>
                    </div>

                    <div className="flex items-center gap-2 min-w-14 justify-end">
                      <div className="text-right">
                        {hasItemDiscount ? (
                          <div>
                            <span className="text-[10px] font-mono line-through text-text-light/40 mr-1 block tabular-nums">
                              $
                              {(
                                (product?.price || 0) * Number(item.quantity)
                              ).toFixed(2)}
                            </span>
                            <span className="font-mono font-bold text-xs text-emerald-400 tabular-nums">
                              ${finalPrice.toFixed(2)}
                            </span>
                          </div>
                        ) : (
                          <p className="font-mono font-bold text-xs text-text-light tabular-nums">
                            $
                            {(
                              (product?.price || 0) * Number(item.quantity)
                            ).toFixed(2)}
                          </p>
                        )}
                      </div>

                      {/* Botón de descuento por ítem */}
                      <button
                        type="button"
                        onClick={() => openItemDiscount(index)}
                        className={`p-1 rounded-md transition-colors cursor-pointer ${
                          hasItemDiscount
                            ? "text-emerald-400 hover:text-emerald-300"
                            : "text-text-light/30 hover:text-primary"
                        }`}
                        title={
                          hasItemDiscount
                            ? "Editar descuento"
                            : "Descuento en producto"
                        }
                      >
                        <Percent className="h-3.5 w-3.5" />
                      </button>

                      {!isMixed && (
                        <button
                          type="button"
                          onClick={() => toggleNote(index)}
                          className="text-text-light/30 hover:text-text-light/70 transition-colors p-1 cursor-pointer"
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
                    <div className="px-2.5 pb-2.5">
                      <input
                        type="text"
                        value={item.notes}
                        onChange={(e) =>
                          handleItemNoteChange(index, e.target.value)
                        }
                        placeholder="Nota especial (sin cebolla, extra salsa...)"
                        className="w-full rounded-lg border border-border bg-dark/40 px-2.5 py-1 text-xs text-text-light outline-none focus:border-primary transition-colors placeholder:text-text-light/25"
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
          <div className="pt-3.5 border-t border-border space-y-3">
            {/* Desglose de Descuentos si existen */}
            {safeTotals.totalDiscount > 0 && (
              <div className="space-y-1 text-xs bg-white/5 p-2.5 rounded-lg border border-border font-mono">
                <div className="flex justify-between text-text-light/60 font-medium">
                  <span>Subtotal bruto</span>
                  <span className="tabular-nums">
                    ${safeTotals.subtotalGross.toFixed(2)}
                  </span>
                </div>
                {safeTotals.itemsDiscount > 0 && (
                  <div className="flex justify-between text-emerald-400/90 font-bold">
                    <span>Descuentos en productos</span>
                    <span className="tabular-nums">
                      -${safeTotals.itemsDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
                {safeTotals.orderDiscount > 0 && (
                  <div className="flex justify-between items-center text-emerald-400 font-bold">
                    <span className="flex items-center gap-1 font-sans text-[11px]">
                      Descuento orden{" "}
                      {formatDiscountBadge(
                        formState.discountType,
                        formState.discountValue,
                        formState.discountReason,
                      )}
                    </span>
                    <span className="tabular-nums">
                      -${safeTotals.orderDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Botón para Descuento a Nivel Orden */}
            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={openOrderDiscount}
                className={`text-[10px] font-bold uppercase tracking-wider py-1.5 px-2.5 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer ${
                  formState.discountType
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                    : "bg-white/5 border-border text-text-light/60 hover:text-text-light hover:border-primary/40 hover:bg-primary/10"
                }`}
              >
                <Tag className="h-3 w-3" />
                {formState.discountType
                  ? "Editar Descuento Orden"
                  : "+ Descuento Orden"}
              </button>

              {formState.discountType && (
                <button
                  type="button"
                  onClick={handleRemoveOrderDiscount}
                  className="text-[10px] font-bold text-red-400/70 hover:text-red-400 uppercase tracking-wider cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] font-bold text-text-light/50 uppercase tracking-wider">
                Total a Pagar
              </span>
              <span className="text-2xl sm:text-3xl font-mono font-black text-text-light tracking-tight tabular-nums">
                ${safeTotals.total.toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmittingCart || isSubmittingCheckout}
              className="w-full rounded-lg bg-primary py-3 text-black font-black text-xs sm:text-sm hover:brightness-105 active:scale-[0.99] transition-all uppercase tracking-wider shadow-sm disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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

      {/* Modal de Descuento (Reutilizable para Ítem y Orden) */}
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
