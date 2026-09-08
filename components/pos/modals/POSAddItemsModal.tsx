"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  ChevronLeft,
  Minus,
  PackageSearch,
  Plus,
  Search,
  ShoppingBag,
  Trash2,
  X,
} from "lucide-react";

import { isMixedOrderItem, usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { getCategoryConfig } from "@/components/pos/POSMenuGrid";
import { MenuItem } from "@/types/pos";

/** Derive stock status for a menu item */
function getStockStatus(item: MenuItem): "out" | "low" | "ok" | "untracked" {
  if (item.ingredientId == null || item.currentStock == null) return "untracked";
  if (item.currentStock <= 0) return "out";
  if (item.minimumStock != null && item.currentStock <= item.minimumStock)
    return "low";
  return "ok";
}

export function POSAddItemsModal() {
  const { availableMenuItems = [] } = usePOSData();

  const {
    editingOrder,
    setEditingOrder,
    additionalItems = [],
    quickAddAdditionalItem,
    updateAdditionalItemQty,
    setAdditionalItemNotes,
    handleAdditionalItemChange,
    addAdditionalItemRow,
    removeAdditionalItemRow,
    handleAddItems,
    isSubmittingCart,
  } = usePOSCart();

  const [searchQuery, setSearchQuery] = useState("");
  const [activeCategory, setActiveCategory] = useState("");
  const [showMobileTray, setShowMobileTray] = useState(false);

  // Close modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !isSubmittingCart) {
        setEditingOrder(null);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isSubmittingCart, setEditingOrder]);

  // Derive unique categories from available items
  const categories = useMemo(() => {
    const set = new Set<string>();
    availableMenuItems.forEach((m) => {
      if (m.category) set.add(m.category);
    });
    return Array.from(set);
  }, [availableMenuItems]);

  // Filter menu items by search and category
  const filteredMenuItems = useMemo(() => {
    return availableMenuItems.filter((item) => {
      const matchesSearch = searchQuery
        ? item.name.toLowerCase().includes(searchQuery.toLowerCase().trim())
        : true;
      const matchesCat = activeCategory
        ? (item.category || "").toUpperCase().trim() ===
          activeCategory.toUpperCase().trim()
        : true;
      return matchesSearch && matchesCat;
    });
  }, [availableMenuItems, searchQuery, activeCategory]);

  // Calculate items in the addition tray with item price and subtotal
  const trayItems = useMemo(() => {
    return additionalItems
      .map((item, index) => {
        const product = availableMenuItems.find(
          (m) => m.id === item.menuItemId,
        );
        const qty = Number(item.quantity) || 0;
        const unitPrice = product?.price || 0;
        return {
          ...item,
          index,
          product,
          qty,
          unitPrice,
          totalPrice: unitPrice * qty,
        };
      })
      .filter((item) => Boolean(item.menuItemId));
  }, [additionalItems, availableMenuItems]);

  const totalAdditionalCount = useMemo(() => {
    return trayItems.reduce((sum, item) => sum + item.qty, 0);
  }, [trayItems]);

  const totalAdditionalAmount = useMemo(() => {
    return trayItems.reduce((sum, item) => sum + item.totalPrice, 0);
  }, [trayItems]);

  if (!editingOrder) return null;

  // Handlers for cart actions
  const handleQuickAdd = (item: MenuItem) => {
    if (quickAddAdditionalItem) {
      quickAddAdditionalItem(item);
    } else {
      // Fallback if not provided in mock
      const existingIdx = additionalItems.findIndex(
        (ai) => ai.menuItemId === item.id,
      );
      if (existingIdx >= 0) {
        handleAdditionalItemChange?.(
          existingIdx,
          "quantity",
          (Number(additionalItems[existingIdx].quantity) + 1).toString(),
        );
      } else {
        addAdditionalItemRow?.();
      }
    }
  };

  const handleIncrement = (index: number) => {
    if (updateAdditionalItemQty) {
      updateAdditionalItemQty(index, 1);
    } else {
      const current = Number(additionalItems[index]?.quantity) || 1;
      handleAdditionalItemChange?.(
        index,
        "quantity",
        (current + 1).toString(),
      );
    }
  };

  const handleDecrement = (index: number) => {
    if (updateAdditionalItemQty) {
      updateAdditionalItemQty(index, -1);
    } else {
      const current = Number(additionalItems[index]?.quantity) || 1;
      if (current <= 1) {
        removeAdditionalItemRow?.(index);
      } else {
        handleAdditionalItemChange?.(
          index,
          "quantity",
          (current - 1).toString(),
        );
      }
    }
  };

  const handleRemove = (index: number) => {
    if (removeAdditionalItemRow) {
      removeAdditionalItemRow(index);
    } else if (updateAdditionalItemQty) {
      updateAdditionalItemQty(index, -9999);
    }
  };

  const handleQuantityInputChange = (index: number, val: string) => {
    const num = parseInt(val, 10);
    if (isNaN(num) || num <= 0) {
      handleRemove(index);
    } else if (handleAdditionalItemChange) {
      handleAdditionalItemChange(index, "quantity", val);
    }
  };

  const handleNotesChange = (index: number, notes: string) => {
    if (setAdditionalItemNotes) {
      setAdditionalItemNotes(index, notes);
    } else if (handleAdditionalItemChange) {
      handleAdditionalItemChange(index, "notes", notes);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center p-2 sm:p-4 z-50 no-print">
      <div className="bg-card rounded-2xl max-w-4xl w-full h-[92vh] md:h-[82vh] shadow-2xl border border-border flex flex-col md:flex-row overflow-hidden">
        {/* =========================================================================
            COLUMNA IZQUIERDA: Catálogo Rápido (60% ancho en escritorio)
        ========================================================================= */}
        <div
          className={`w-full md:w-[60%] flex-col border-b md:border-b-0 md:border-r border-border h-full ${
            showMobileTray ? "hidden md:flex" : "flex"
          }`}
        >
          {/* Encabezado del Catálogo */}
          <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-3 bg-card shrink-0">
            <div>
              <h3 className="text-sm sm:text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
                <span className="h-2.5 w-2.5 rounded-full bg-purple-500 shadow-[0_0_8px_rgba(168,85,247,0.6)] animate-pulse" />
                Agregar a Orden #{editingOrder.orderNumber}
              </h3>
              {(editingOrder.table || editingOrder.customer?.name) && (
                <p className="text-[11px] font-bold text-text-light/50 uppercase tracking-wider mt-0.5">
                  {editingOrder.table ? `Mesa: ${editingOrder.table}` : ""}
                  {editingOrder.table && editingOrder.customer?.name ? " · " : ""}
                  {editingOrder.customer?.name ? editingOrder.customer.name : ""}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => setEditingOrder(null)}
              disabled={isSubmittingCart}
              className="text-text-light/40 hover:text-text-light p-1.5 rounded-lg hover:bg-white/10 transition-colors disabled:opacity-30"
              aria-label="Cerrar"
            >
              <X className="h-5 w-5" />
            </button>
          </div>

          {/* Buscador Rápido con AutoFocus */}
          <div className="p-3 border-b border-border bg-dark/20 shrink-0">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
              <input
                autoFocus
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar producto..."
                className="w-full rounded-xl border border-border bg-white/5 pl-9 pr-9 py-2 text-xs text-text-light outline-none focus:border-primary transition-all placeholder:text-text-light/30"
              />
              {searchQuery && (
                <button
                  type="button"
                  onClick={() => setSearchQuery("")}
                  className="absolute right-2 top-1/2 -translate-y-1/2 h-6 w-6 flex items-center justify-center rounded-lg text-text-light/40 hover:text-text-light hover:bg-white/10 transition-colors"
                  aria-label="Limpiar búsqueda"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* Carrusel de Categorías */}
          <div className="px-3 py-2 border-b border-border flex gap-2 overflow-x-auto no-scrollbar shrink-0 bg-card">
            <button
              type="button"
              onClick={() => setActiveCategory("")}
              className={`px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap border ${
                activeCategory === ""
                  ? "bg-white/15 border-white/25 text-text-light shadow-sm"
                  : "bg-white/5 text-text-light/50 border-transparent hover:border-border/20 hover:text-text-light"
              }`}
            >
              Todos
            </button>
            {categories.map((cat, idx) => {
              const config = getCategoryConfig(cat, idx);
              const isActive =
                activeCategory.toUpperCase().trim() === cat.toUpperCase().trim();
              return (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setActiveCategory(cat)}
                  className={`px-3 py-1.5 rounded-full font-black text-[11px] uppercase tracking-wider transition-all whitespace-nowrap border ${
                    isActive
                      ? `${config.badgeBg} shadow-sm`
                      : "bg-white/5 text-text-light/50 border-transparent hover:border-border/20 hover:text-text-light"
                  }`}
                >
                  {config.label}
                </button>
              );
            })}
          </div>

          {/* Grid de Productos Táctiles */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4">
            {filteredMenuItems.length === 0 ? (
              <div className="h-full min-h-48 flex flex-col items-center justify-center text-center space-y-2">
                <PackageSearch className="h-9 w-9 text-primary/40" />
                <p className="text-xs font-extrabold uppercase tracking-widest text-text-light/40">
                  Sin resultados
                </p>
                <p className="text-[11px] font-medium text-text-light/30">
                  Intenta con otra categoría o búsqueda
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                {filteredMenuItems.map((m) => {
                  const isMixed = isMixedOrderItem(m.name);
                  const stockStatus = getStockStatus(m);
                  const isOutOfStock = stockStatus === "out";
                  const isLowStock = stockStatus === "low";

                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => handleQuickAdd(m)}
                      disabled={isSubmittingCart}
                      className={`group relative rounded-xl bg-card-light p-3 border transition-all shadow-sm flex flex-col justify-between text-left h-24 overflow-hidden active:scale-95 hover:-translate-y-0.5 disabled:opacity-50 disabled:pointer-events-none ${
                        isOutOfStock
                          ? "border-red-500/30 hover:border-red-500/60"
                          : isLowStock
                            ? "border-amber-500/30 hover:border-amber-500/60"
                            : "border-border hover:border-primary/50"
                      }`}
                    >
                      {/* Badges de Estado */}
                      <div className="absolute top-2 right-2 flex items-center gap-1 z-10">
                        {isMixed && (
                          <span className="rounded bg-purple-500/20 border border-purple-500/30 px-1 py-0.5 text-[8px] font-black uppercase tracking-widest text-purple-300">
                            Mixto
                          </span>
                        )}
                        {isOutOfStock && (
                          <span className="rounded bg-red-500/20 border border-red-500/30 px-1 py-0.5 text-[8px] font-black uppercase tracking-widest text-red-400">
                            Sin Stock
                          </span>
                        )}
                        {isLowStock && !isOutOfStock && (
                          <span className="rounded bg-amber-500/20 border border-amber-500/30 px-1 py-0.5 text-[8px] font-black uppercase tracking-widest text-amber-400">
                            Bajo Stock
                          </span>
                        )}
                      </div>

                      <span className="text-xs font-bold text-text-light line-clamp-2 pr-12 leading-snug">
                        {m.name}
                      </span>

                      <div className="flex items-center justify-between w-full mt-2">
                        <span className="text-xs font-black text-primary">
                          ${m.price.toFixed(2)}
                        </span>
                        <div className="h-6 w-6 rounded-lg bg-white/5 group-hover:bg-primary/20 group-hover:text-primary flex items-center justify-center text-text-light/50 transition-colors">
                          <Plus className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>

          {/* Barra Flotante Móvil para ver bandeja */}
          <div className="p-3 border-t border-border bg-card md:hidden shrink-0">
            <button
              type="button"
              onClick={() => setShowMobileTray(true)}
              className="w-full bg-purple-500 text-white py-2.5 px-4 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-between shadow-lg shadow-purple-500/20 active:scale-95 transition-all"
            >
              <span className="flex items-center gap-2">
                <ShoppingBag className="h-4 w-4" />
                Ver bandeja ({totalAdditionalCount} productos)
              </span>
              <span>${totalAdditionalAmount.toFixed(2)}</span>
            </button>
          </div>
        </div>

        {/* =========================================================================
            COLUMNA DERECHA: Bandeja de Adición (40% ancho en escritorio)
        ========================================================================= */}
        <form
          onSubmit={(e) => handleAddItems?.(e)}
          className={`w-full md:w-[40%] flex-col h-full bg-card-light/40 ${
            showMobileTray ? "flex" : "hidden md:flex"
          }`}
        >
          {/* Encabezado de la Bandeja */}
          <div className="p-3 sm:p-4 border-b border-border flex items-center justify-between gap-2 shrink-0 bg-card">
            <div className="flex items-center gap-2">
              {showMobileTray && (
                <button
                  type="button"
                  onClick={() => setShowMobileTray(false)}
                  className="md:hidden text-text-light/60 hover:text-text-light p-1 rounded-lg hover:bg-white/10 transition-colors"
                  aria-label="Volver al Catálogo"
                >
                  <ChevronLeft className="h-5 w-5" />
                </button>
              )}
              <h4 className="text-xs font-black text-text-light uppercase tracking-wider">
                Nuevos Productos
              </h4>
            </div>

            <span className="text-[11px] font-black px-2 py-0.5 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20">
              {totalAdditionalCount}{" "}
              {totalAdditionalCount === 1 ? "ítem" : "ítems"}
            </span>
          </div>

          {/* Lista de Ítems Seleccionados */}
          <div className="flex-1 overflow-y-auto p-3 space-y-2.5">
            {trayItems.length === 0 ? (
              <div className="h-full min-h-48 flex flex-col items-center justify-center text-center space-y-2 p-6">
                <ShoppingBag className="h-8 w-8 text-text-light/20" />
                <p className="text-xs font-black uppercase tracking-wider text-text-light/40">
                  Sin productos seleccionados
                </p>
                <p className="text-[11px] font-medium text-text-light/30">
                  Toca un producto del catálogo para agregarlo
                </p>
              </div>
            ) : (
              trayItems.map((item) => (
                <div
                  key={`${item.menuItemId}-${item.index}`}
                  className="rounded-xl border border-border bg-card p-3 space-y-2 shadow-sm"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="text-xs font-bold text-text-light truncate">
                        {item.product?.name || "Producto"}
                      </p>
                      <p className="text-[11px] font-semibold text-text-light/50">
                        ${item.unitPrice.toFixed(2)} c/u
                      </p>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-xs font-black text-text-light">
                        ${item.totalPrice.toFixed(2)}
                      </span>
                    </div>
                  </div>

                  {/* Controles de Cantidad y Eliminar */}
                  <div className="flex items-center justify-between gap-2 pt-1">
                    <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-border/50">
                      <button
                        type="button"
                        onClick={() => handleDecrement(item.index)}
                        disabled={isSubmittingCart}
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10 text-text-light/70 hover:text-text-light transition-colors disabled:opacity-30"
                        aria-label="Disminuir cantidad"
                      >
                        <Minus className="h-3.5 w-3.5" />
                      </button>

                      <input
                        type="number"
                        min="1"
                        value={item.quantity}
                        disabled={isSubmittingCart}
                        onChange={(e) =>
                          handleQuantityInputChange(item.index, e.target.value)
                        }
                        className="w-10 text-center text-xs font-black text-text-light bg-transparent outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                        aria-label="Cantidad"
                      />

                      <button
                        type="button"
                        onClick={() => handleIncrement(item.index)}
                        disabled={isSubmittingCart}
                        className="h-7 w-7 flex items-center justify-center rounded-md hover:bg-white/10 text-text-light/70 hover:text-text-light transition-colors disabled:opacity-30"
                        aria-label="Aumentar cantidad"
                      >
                        <Plus className="h-3.5 w-3.5" />
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={() => handleRemove(item.index)}
                      disabled={isSubmittingCart}
                      className="text-red-400/60 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded-lg transition-colors disabled:opacity-30"
                      aria-label="Eliminar producto"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>

                  {/* Input de Nota por Producto */}
                  <input
                    type="text"
                    value={item.notes || ""}
                    disabled={isSubmittingCart}
                    onChange={(e) =>
                      handleNotesChange(item.index, e.target.value)
                    }
                    placeholder="Nota (ej. Sin cebolla)..."
                    className="w-full rounded-lg border border-border/50 bg-white/5 px-2.5 py-1 text-[11px] text-text-light outline-none focus:border-primary transition-all placeholder:text-text-light/25"
                    aria-label="Nota de producto"
                  />
                </div>
              ))
            )}
          </div>

          {/* Resumen y Botones de Acción */}
          <div className="p-3 sm:p-4 border-t border-border bg-card space-y-3 shrink-0">
            <div className="flex items-center justify-between text-xs font-black uppercase tracking-wider text-text-light">
              <span className="text-text-light/60">Total Adicional:</span>
              <span className="text-sm text-primary">
                ${totalAdditionalAmount.toFixed(2)}
              </span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                disabled={isSubmittingCart}
                onClick={() => setEditingOrder(null)}
                className="w-1/3 bg-white/5 text-text-light/60 py-2.5 rounded-xl font-black border border-border hover:bg-white/10 hover:text-text-light transition-all uppercase text-xs tracking-wider disabled:opacity-50"
              >
                Cancelar
              </button>

              <button
                type="submit"
                disabled={isSubmittingCart || trayItems.length === 0}
                className="w-2/3 bg-purple-500 text-white py-2.5 px-3 rounded-xl font-black hover:brightness-110 active:scale-[0.98] transition-all uppercase text-xs tracking-wider shadow-lg shadow-purple-500/20 disabled:opacity-30 disabled:pointer-events-none truncate"
              >
                {isSubmittingCart
                  ? "Guardando..."
                  : trayItems.length > 0
                    ? `Agregar a Orden (${totalAdditionalCount} ${
                        totalAdditionalCount === 1 ? "producto" : "productos"
                      } · $${totalAdditionalAmount.toFixed(2)})`
                    : "Agregar a Orden"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
