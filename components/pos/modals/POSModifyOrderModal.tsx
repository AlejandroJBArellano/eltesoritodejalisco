"use client";

import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { useOptionalUser } from "@/components/UserProvider";
import {
  AlertTriangle,
  Minus,
  Percent,
  Plus,
  Tag,
  Trash2,
  X,
} from "lucide-react";
import { useState, useMemo, useEffect } from "react";
import { POSDiscountModal, DiscountData } from "./POSDiscountModal";
import { POSManagerAuthModal } from "./POSManagerAuthModal";
import {
  calculateItemDiscount,
  formatDiscountBadge,
} from "@/lib/utils/discounts";

export function POSModifyOrderModal() {
  const user = useOptionalUser();
  const isWaiter = user?.isWaiter ?? false;

  const { availableMenuItems, customers, refreshOrders } = usePOSData();

  const {
    modifyingOrder,
    setModifyingOrder,
    setEditingOrder,
    modifyItems,
    modifyTable,
    setModifyTable,
    modifyCustomerId,
    setModifyCustomerId,
    modifyOrderDiscount,
    modifyOrderTotals,
    hasUnsavedModifyChanges = false,
    handleModifyQuantityChange,
    handleModifyNotesChange,
    handleModifyRemoveItem,
    handleApplyModifyItemDiscount,
    handleRemoveModifyItemDiscount,
    handleApplyModifyOrderDiscount,
    handleRemoveModifyOrderDiscount,
    handleSaveModifiedOrder,
    isSubmittingCart,
  } = usePOSCart(availableMenuItems, refreshOrders);

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [showAddItemsConfirm, setShowAddItemsConfirm] = useState(false);
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false);
  const [pendingTransitionToAdd, setPendingTransitionToAdd] = useState(false);

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

  // Atajo de Teclado: Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (
        e.key === "Escape" &&
        !isSubmittingCart &&
        !isAuthModalOpen &&
        !discountModal.isOpen
      ) {
        if (showAddItemsConfirm) {
          setShowAddItemsConfirm(false);
          return;
        }
        if (showDiscardConfirm) {
          setShowDiscardConfirm(false);
          return;
        }
        if (hasUnsavedModifyChanges) {
          setShowDiscardConfirm(true);
        } else {
          setModifyingOrder(null);
        }
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [
    isSubmittingCart,
    isAuthModalOpen,
    discountModal.isOpen,
    showAddItemsConfirm,
    showDiscardConfirm,
    hasUnsavedModifyChanges,
    setModifyingOrder,
  ]);

  const hasItemReductions = useMemo(() => {
    if (!modifyingOrder?.orderItems) return false;
    const originalItems = modifyingOrder.orderItems;
    const currentItemMap = new Map(
      modifyItems.map((item) => [item.id, item.quantity]),
    );

    // Check if any original item was removed
    const hasDeleted = originalItems.some(
      (orig: { id: string; quantity: number }) => !currentItemMap.has(orig.id),
    );
    if (hasDeleted) return true;

    // Check if any original item's quantity decreased
    const hasDecreased = originalItems.some(
      (orig: { id: string; quantity: number }) => {
        const currentQty = currentItemMap.get(orig.id) ?? 0;
        return currentQty < Number(orig.quantity);
      },
    );

    return hasDecreased;
  }, [modifyingOrder, modifyItems]);

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

  const handleClose = () => {
    if (isSubmittingCart) return;
    if (hasUnsavedModifyChanges) {
      setShowDiscardConfirm(true);
    } else {
      setModifyingOrder(null);
    }
  };

  const handleSaveClick = async () => {
    if (isWaiter && hasItemReductions) {
      setIsAuthModalOpen(true);
      return;
    }
    await handleSaveModifiedOrder();
  };

  const handleAddProductsClick = () => {
    if (isSubmittingCart) return;
    if (hasUnsavedModifyChanges) {
      setShowAddItemsConfirm(true);
    } else {
      setEditingOrder?.(modifyingOrder);
      setModifyingOrder(null);
    }
  };

  const handleSaveAndTransitionToAdd = async () => {
    if (isWaiter && hasItemReductions) {
      setShowAddItemsConfirm(false);
      setPendingTransitionToAdd(true);
      setIsAuthModalOpen(true);
      return;
    }
    setShowAddItemsConfirm(false);
    const success = await handleSaveModifiedOrder();
    if (success !== false) {
      setEditingOrder?.(modifyingOrder);
    }
  };

  const handleDiscardAndTransitionToAdd = () => {
    setShowAddItemsConfirm(false);
    setEditingOrder?.(modifyingOrder);
    setModifyingOrder(null);
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
    <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 no-print">
      <div className="bg-card rounded-xl max-w-md md:max-w-4xl w-full max-h-[92vh] md:h-[85vh] md:max-h-[85vh] shadow-2xl border border-border flex flex-col md:flex-row overflow-y-auto md:overflow-hidden">
        {/* =========================================================================
            COLUMNA IZQUIERDA: Productos de la Comanda (60% ancho en escritorio)
        ========================================================================= */}
        <div className="w-full md:w-[60%] flex flex-col md:h-full md:border-r md:border-border shrink-0 md:shrink md:overflow-hidden">
          {/* Cabecera de la comanda */}
          <div className="flex items-center justify-between border-b border-border p-4 sm:p-5 shrink-0 bg-card">
            <div className="flex items-center gap-2 min-w-0">
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
              <h2 className="text-sm sm:text-base font-bold text-text-light uppercase tracking-tight truncate">
                Modificar Orden #{modifyingOrder.orderNumber}
              </h2>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={handleAddProductsClick}
                disabled={isSubmittingCart}
                className="inline-flex items-center gap-1.5 px-2.5 py-1.5 sm:px-3 sm:py-1.5 rounded-lg bg-primary/15 hover:bg-primary/25 text-primary border border-primary/30 text-[11px] sm:text-xs font-bold uppercase tracking-wider transition-all active:scale-[0.98] cursor-pointer disabled:opacity-30"
              >
                <Plus className="h-3.5 w-3.5" />
                <span>Agregar Productos</span>
              </button>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmittingCart}
                className="text-text-light/40 hover:text-text-light transition-colors p-1.5 rounded-lg hover:bg-white/10 disabled:opacity-30 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          {/* Listado de ítems modificables con scroll independiente */}
          <div className="p-4 sm:p-5 space-y-3 md:flex-1 md:overflow-y-auto custom-scrollbar">
            {modifyItems.length === 0 ? (
              <p className="text-center text-text-light/30 py-8 text-xs font-bold uppercase tracking-wider">
                No quedan productos en la orden
              </p>
            ) : (
              modifyItems.map((item, index) => {
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
                    className="bg-card rounded-xl border border-border p-3 space-y-2.5 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <p className="font-bold text-xs text-text-light uppercase tracking-tight truncate">
                          {item.menuItemName}
                        </p>
                        <p className="text-[10px] font-mono font-medium text-text-light/50 mt-0.5 tabular-nums">
                          ${item.unitPrice.toFixed(2)} c/u
                        </p>
                        {hasItemDiscount && (
                          <div className="mt-1">
                            <button
                              type="button"
                              onClick={() => openItemDiscount(index)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25 transition-colors cursor-pointer"
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

                      {/* Controles de cantidad táctiles */}
                      <div className="flex items-center gap-1 bg-secondary rounded-lg p-0.5 border border-border shrink-0">
                        <button
                          type="button"
                          onClick={() => handleModifyQuantityChange(index, -1)}
                          disabled={isSubmittingCart}
                          aria-label="Disminuir cantidad"
                          className="h-6 w-6 rounded-md bg-white/5 hover:bg-red-500/20 text-text-light hover:text-red-400 flex items-center justify-center font-bold text-xs transition-colors active:scale-95 disabled:opacity-30 cursor-pointer"
                        >
                          <Minus className="h-3 w-3" />
                        </button>
                        <span className="w-5 text-center font-mono font-bold text-xs text-text-light tabular-nums">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => handleModifyQuantityChange(index, 1)}
                          disabled={isSubmittingCart}
                          aria-label="Aumentar cantidad"
                          className="h-6 w-6 rounded-md bg-white/5 hover:bg-emerald-500/20 text-text-light hover:text-emerald-400 flex items-center justify-center font-bold text-xs transition-colors active:scale-95 disabled:opacity-30 cursor-pointer"
                        >
                          <Plus className="h-3 w-3" />
                        </button>
                      </div>

                      {/* Precios y Botones de Descuento / Eliminar */}
                      <div className="flex items-center gap-2 min-w-18 justify-end shrink-0">
                        <div className="text-right">
                          {hasItemDiscount ? (
                            <div>
                              <span className="text-[10px] font-mono font-medium line-through text-text-light/40 mr-1 block tabular-nums">
                                ${(item.unitPrice * item.quantity).toFixed(2)}
                              </span>
                              <span className="font-mono font-bold text-xs text-emerald-400 tabular-nums">
                                ${finalPrice.toFixed(2)}
                              </span>
                            </div>
                          ) : (
                            <p className="font-mono font-bold text-xs text-text-light tabular-nums">
                              ${(item.unitPrice * item.quantity).toFixed(2)}
                            </p>
                          )}
                        </div>

                        <button
                          type="button"
                          onClick={() => openItemDiscount(index)}
                          disabled={isSubmittingCart}
                          aria-label="Descuento de producto"
                          className={`p-1 rounded-md transition-colors disabled:opacity-30 cursor-pointer ${
                            hasItemDiscount
                              ? "text-emerald-400 hover:text-emerald-300"
                              : "text-text-light/30 hover:text-primary"
                          }`}
                          title={
                            hasItemDiscount ? "Editar descuento" : "Descuento"
                          }
                        >
                          <Percent className="h-3.5 w-3.5" />
                        </button>

                        <button
                          type="button"
                          onClick={() => handleModifyRemoveItem(index)}
                          disabled={isSubmittingCart}
                          aria-label="Eliminar producto"
                          className="text-red-400/50 hover:text-red-400 transition-colors p-1 rounded-md disabled:opacity-30 cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Input de notas integrado por platillo */}
                    <input
                      type="text"
                      value={item.notes || ""}
                      disabled={isSubmittingCart}
                      onChange={(e) =>
                        handleModifyNotesChange?.(index, e.target.value)
                      }
                      placeholder="Nota (ej. Sin cebolla)..."
                      aria-label={`Nota para ${item.menuItemName}`}
                      className="w-full rounded-md border border-border bg-secondary px-2.5 py-1 text-[11px] text-text-light outline-none focus:border-primary transition-all placeholder:text-text-light/25 font-normal"
                    />
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* =========================================================================
            COLUMNA DERECHA: Servicio, Descuentos y Totales (40% en escritorio)
        ========================================================================= */}
        <div className="w-full md:w-[40%] flex flex-col md:h-full md:justify-between bg-secondary/30 border-t md:border-t-0 md:border-l border-border p-4 sm:p-5 md:overflow-y-auto custom-scrollbar space-y-6 md:space-y-0">
          {/* Bloque Superior: Datos de Servicio */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold text-text-light uppercase tracking-wider hidden md:block">
              Datos de Servicio
            </h3>
            <div className="space-y-3 bg-secondary p-3.5 rounded-lg border border-border">
              <div>
                <label className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider block mb-1.5">
                  Mesa / Servicio
                </label>
                <input
                  type="text"
                  value={modifyTable}
                  onChange={(e) => setModifyTable(e.target.value)}
                  placeholder="Ej. Mesa 4, Para Llevar..."
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-light outline-none focus:border-amber-400 transition-colors placeholder:text-text-light/30 font-medium"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider block mb-1.5">
                  Cliente
                </label>
                <select
                  aria-label="Cliente"
                  value={modifyCustomerId}
                  onChange={(e) => setModifyCustomerId(e.target.value)}
                  className="w-full rounded-lg border border-border bg-background px-3 py-2 text-xs text-text-light outline-none focus:border-primary transition-colors cursor-pointer"
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
          </div>

          {/* Bloque Intermedio: Descuento Global y Desglose Financiero */}
          <div className="border-t border-border pt-4 space-y-3">
            {safeTotals.totalDiscount > 0 && (
              <div className="space-y-1 text-xs bg-secondary p-2.5 rounded-lg border border-border font-mono">
                <div className="flex justify-between text-text-light/60">
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
                  <div className="flex justify-between text-emerald-400 font-bold">
                    <span>
                      Descuento orden{" "}
                      {formatDiscountBadge(
                        modifyOrderDiscount?.discountType,
                        modifyOrderDiscount?.discountValue,
                        modifyOrderDiscount?.discountReason,
                      )}
                    </span>
                    <span className="tabular-nums">
                      -${safeTotals.orderDiscount.toFixed(2)}
                    </span>
                  </div>
                )}
              </div>
            )}

            <div className="flex items-center justify-between">
              <button
                type="button"
                onClick={openOrderDiscount}
                className={`text-[11px] font-bold uppercase tracking-wider py-1.5 px-3 rounded-lg border transition-all flex items-center gap-1.5 cursor-pointer active:scale-[0.98] ${
                  modifyOrderDiscount?.discountType
                    ? "bg-emerald-500/15 border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/25"
                    : "bg-white/5 border-border/40 text-text-light/60 hover:text-text-light hover:border-primary/40 hover:bg-primary/10"
                }`}
              >
                <Tag className="h-3 w-3" />
                {modifyOrderDiscount?.discountType
                  ? "Editar Descuento Orden"
                  : "+ Descuento Orden"}
              </button>

              {modifyOrderDiscount?.discountType && (
                <button
                  type="button"
                  onClick={handleRemoveModifyOrderDiscount}
                  className="text-[10px] font-bold text-red-400/70 hover:text-red-400 uppercase tracking-wider cursor-pointer"
                >
                  Quitar
                </button>
              )}
            </div>

            <div className="flex justify-between items-center pt-1">
              <span className="text-xs font-bold text-text-light/50 uppercase tracking-wider">
                Nuevo Total
              </span>
              <span className="text-2xl font-mono font-bold text-text-light tabular-nums">
                ${safeTotals.total.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Bloque Inferior: Botones de Acción Fijos */}
          <div className="flex gap-3 pt-3 shrink-0">
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmittingCart}
              className="w-full bg-white/5 text-text-light/60 py-2.5 rounded-lg font-bold hover:bg-white/10 transition-colors uppercase text-xs tracking-wider cursor-pointer disabled:opacity-30"
            >
              Cancelar
            </button>
            <button
              type="submit"
              onClick={handleSaveClick}
              disabled={isSubmittingCart || modifyItems.length === 0}
              className="w-full bg-primary text-background py-2.5 rounded-lg font-bold hover:brightness-105 active:scale-[0.98] transition-all uppercase text-xs tracking-wider shadow-sm disabled:opacity-50 cursor-pointer"
            >
              {isSubmittingCart ? "Guardando..." : "Guardar Cambios"}
            </button>
          </div>
        </div>
      </div>

      {/* Modal de Confirmación: Cambios pendientes al agregar productos */}
      {showAddItemsConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-60"
          role="alertdialog"
        >
          <div className="bg-card rounded-xl max-w-sm w-full p-5 border border-border shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-tight text-text-light">
                Cambios sin guardar
              </h3>
            </div>
            <p className="text-xs text-text-light/70">
              Tienes cambios sin guardar. ¿Deseas guardarlos antes de agregar
              productos?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={handleSaveAndTransitionToAdd}
                disabled={isSubmittingCart}
                className="w-full bg-primary text-background py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                {isSubmittingCart ? "Guardando..." : "Guardar y Continuar"}
              </button>
              <button
                type="button"
                onClick={handleDiscardAndTransitionToAdd}
                className="w-full bg-white/5 text-text-light/80 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-colors cursor-pointer"
              >
                Descartar y Continuar
              </button>
              <button
                type="button"
                onClick={() => setShowAddItemsConfirm(false)}
                className="w-full text-text-light/40 hover:text-text-light py-1 font-bold text-xs uppercase tracking-wider transition-colors cursor-pointer"
              >
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmación: Descartar cambios al cerrar */}
      {showDiscardConfirm && (
        <div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-60"
          role="alertdialog"
        >
          <div className="bg-card rounded-xl max-w-sm w-full p-5 border border-border shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-400">
              <AlertTriangle className="h-5 w-5 shrink-0" />
              <h3 className="text-sm font-bold uppercase tracking-tight text-text-light">
                Descartar cambios
              </h3>
            </div>
            <p className="text-xs text-text-light/70">
              Tienes cambios no guardados en esta comanda. ¿Estás seguro de que
              deseas salir?
            </p>
            <div className="flex flex-col gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setShowDiscardConfirm(false);
                  setModifyingOrder(null);
                }}
                className="w-full bg-red-500 text-white py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                Descartar
              </button>
              <button
                type="button"
                onClick={() => setShowDiscardConfirm(false)}
                className="w-full bg-white/5 text-text-light/80 py-2 rounded-lg font-bold text-xs uppercase tracking-wider hover:bg-white/10 transition-colors cursor-pointer"
              >
                Continuar editando
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de Autorización de Gerencia para Reducción / Eliminación de Productos */}
      <POSManagerAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => {
          setIsAuthModalOpen(false);
          setPendingTransitionToAdd(false);
        }}
        title="Autorizar Cancelación de Productos"
        description="Se detectó la eliminación o reducción de productos en la comanda activa. Ingresa el PIN de Gerencia para autorizar los cambios."
        reasonPresets={[
          "Error de captura",
          "Cliente canceló platillo",
          "Platillo insatisfactorio",
          "Sin ingredientes disponibles",
        ]}
        onAuthorize={async ({ pin }) => {
          const success = await handleSaveModifiedOrder(pin);
          if (success !== false && pendingTransitionToAdd) {
            setEditingOrder?.(modifyingOrder);
            setPendingTransitionToAdd(false);
          }
        }}
        isSubmitting={isSubmittingCart}
      />
    </div>
  );
}
