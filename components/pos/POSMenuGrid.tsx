import { isMixedOrderItem, usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { MenuItem } from "@/types/pos";
import { Package, PackageSearch, Plus, Search, X } from "lucide-react";

const CATEGORY_CONFIG: Record<
  string,
  { label: string; color: string; badgeBg: string; text: string }
> = {
  ANTOJITOS: {
    label: "Antojitos",
    color: "#FFB7CE",
    badgeBg: "bg-primary/10 text-primary border-primary/20",
    text: "#FFB7CE",
  },
  TACOS: {
    label: "Tacos",
    color: "#B2FBA5",
    badgeBg: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
    text: "#34D399",
  },
  "PLATILLOS FUERTES": {
    label: "Platillos Fuertes",
    color: "#E6E6FA",
    badgeBg: "bg-purple-500/10 text-purple-300 border-purple-500/20",
    text: "#C084FC",
  },
  BEBIDAS: {
    label: "Bebidas",
    color: "#89CFF0",
    badgeBg: "bg-blue-500/10 text-blue-400 border-blue-500/20",
    text: "#60A5FA",
  },
  EXTRAS: {
    label: "Extras",
    color: "#FDFD96",
    badgeBg: "bg-amber-500/10 text-amber-400 border-amber-500/20",
    text: "#FBBF24",
  },
  POSTRES: {
    label: "Postres",
    color: "#FFDAB9",
    badgeBg: "bg-orange-500/10 text-orange-400 border-orange-500/20",
    text: "#FB923C",
  },
  OTROS: {
    label: "Otros",
    color: "#E0E0E0",
    badgeBg: "bg-zinc-500/10 text-zinc-300 border-zinc-500/20",
    text: "#E4E4E7",
  },
};

/** Derive stock status for a menu item */
function getStockStatus(item: MenuItem): "out" | "low" | "ok" | "untracked" {
  if (item.ingredientId == null || item.currentStock == null) return "untracked";
  if (item.currentStock <= 0) return "out";
  if (item.minimumStock != null && item.currentStock <= item.minimumStock) return "low";
  return "ok";
}

export function POSMenuGrid() {
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
  return (
    <section className="rounded-2xl bg-card p-4 sm:p-6 shadow-sm border border-border space-y-5 w-full overflow-hidden">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-primary"></span>
          Catálogo de Productos
        </h2>

        {/* Buscador Rápido */}
        <div className="relative min-w-[220px]">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-xl border border-border bg-white/5 pl-9 pr-4 py-2 text-xs text-text-light outline-none focus:border-primary transition-all placeholder:text-text-light/30"
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

      {/* Categorías en Tabs */}
      <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveCategory("")}
          className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap border ${activeCategory === ""
              ? "bg-white/10 border-white/20 text-text-light shadow-sm scale-105"
              : "bg-white/5 text-text-light/50 border-transparent hover:border-border/15 hover:text-text-light"
            }`}
        >
          Todos
        </button>
        {categories.map((cat) => {
          const config = CATEGORY_CONFIG[cat] || CATEGORY_CONFIG.OTROS;
          const isActive = activeCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap border ${isActive
                  ? `${config.badgeBg} shadow-sm scale-105`
                  : "bg-white/5 text-text-light/50 border-transparent hover:border-border/15 hover:text-text-light"
                }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3.5 pt-1">
        {filteredMenuItems.length === 0 ? (
          <div className="col-span-full py-16 text-center space-y-2">
            <PackageSearch className="h-10 w-10 mx-auto opacity-30 text-primary" />
            <p className="text-xs font-extrabold uppercase tracking-widest text-text-light/40">
              Sin resultados
            </p>
            <p className="text-[11px] font-medium text-text-light/30">
              Intenta con otra categoría o búsqueda
            </p>
          </div>
        ) : (
          filteredMenuItems.map((m) => {
            const isMixed = isMixedOrderItem(m.name);
            const stockStatus = getStockStatus(m);
            const isOutOfStock = stockStatus === "out";
            const isLowStock = stockStatus === "low";

            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleGridItemClick(m)}
                className={`group relative rounded-2xl bg-card-light p-4 border transition-all shadow-sm flex flex-col justify-between text-left h-28 overflow-hidden active:scale-95 ${isOutOfStock
                    ? "border-red-500/25 hover:border-red-500/50 hover:shadow-md hover:-translate-y-0.5"
                    : isLowStock
                      ? "border-amber-500/30 hover:border-amber-500/60 hover:shadow-md hover:-translate-y-0.5"
                      : "border-border hover:border-primary/40 hover:shadow-md hover:-translate-y-0.5"
                  }`}
              >
                {/* Sin Stock warning badge — visual only, no bloqueo */}
                {isOutOfStock && (
                  <span className="absolute top-2 right-2 z-10 rounded-md bg-red-500/20 border border-red-500/30 px-1.5 py-0.5 text-[9px] font-black uppercase tracking-widest text-red-400">
                    Sin Stock
                  </span>
                )}

                <div className="flex items-start justify-between gap-1 w-full">
                  <span
                    className={`font-black text-xs uppercase tracking-tight leading-snug line-clamp-2 transition-colors ${isOutOfStock
                        ? "text-text-light/60 group-hover:text-red-300"
                        : "text-text-light group-hover:text-primary"
                      }`}
                  >
                    {m.name}
                  </span>
                  {isMixed && !isOutOfStock && (
                    <span className="rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-black px-1.5 py-0.5 uppercase tracking-widest shrink-0 border border-amber-500/20">
                      Mixto
                    </span>
                  )}
                </div>

                <div className="mt-2 flex items-center justify-between w-full gap-1 flex-wrap">
                  <span className="rounded-xl bg-white/5 border border-border px-2.5 py-1 text-xs font-black text-text-light tabular-nums">
                    ${m.price.toFixed(2)}
                  </span>

                  {/* Stock badge — only when ingredient is tracked */}
                  {stockStatus !== "untracked" && (
                    <span
                      className={`flex items-center gap-1 rounded-lg px-2 py-1 text-[10px] font-black tabular-nums border ${isOutOfStock
                          ? "bg-red-500/10 border-red-500/20 text-red-400"
                          : isLowStock
                            ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                            : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
                        }`}
                    >
                      <Package className="h-2.5 w-2.5 shrink-0" />
                      {m.currentStock}
                    </span>
                  )}

                  <span className="rounded-lg bg-primary/10 p-1.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
                    <Plus className="h-3.5 w-3.5" />
                  </span>
                </div>
              </button>
            );
          })
        )}
      </div>
    </section>
  );
}
