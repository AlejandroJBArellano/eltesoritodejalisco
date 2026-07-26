import React from "react";
import { ShoppingBag, Minus, Plus, Printer, Bike } from "lucide-react";
import { OrderFormState, MenuItem, Customer } from "@/types/pos";
import { isMixedOrderItem } from "@/hooks/pos/usePOSCart";

interface POSCartSidebarProps {
  formState: OrderFormState;
  handleFormChange: (field: keyof OrderFormState, value: string) => void;
  customers: Customer[];
  sourceOptions: string[];
  formErrors: Record<string, string>;
  handleClearCart: () => void;
  handleQuantityChange: (index: number, delta: number) => void;
  availableMenuItems: MenuItem[];
  isSubmitting: boolean;
}

export function POSCartSidebar({
  formState,
  handleFormChange,
  customers,
  sourceOptions,
  formErrors,
  handleClearCart,
  handleQuantityChange,
  availableMenuItems,
  isSubmitting,
}: POSCartSidebarProps) {
  return (
    <div className="lg:col-span-5 xl:col-span-4 space-y-6 lg:sticky lg:top-24">
      {/* Detalles Adicionales de la Orden */}
      <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-4">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h2 className="text-xs font-black text-[#E0E0E0]/50 tracking-widest uppercase flex items-center gap-2">
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
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-black transition-all border ${
              formState.table === "Domicilio"
                ? "bg-secondary/20 border-secondary text-secondary"
                : "bg-white/5 border-transparent text-[#E0E0E0]/60 hover:border-white/10 hover:text-[#E0E0E0]"
            }`}
          >
            <Bike className="h-3.5 w-3.5" />
            DOMICILIO
          </button>
        </div>

        <div className="grid gap-4 sm:grid-cols-3">
          <div>
            <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
              Cliente
            </label>
            <select
              value={formState.customerId}
              onChange={(e) => handleFormChange("customerId", e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-[#181818] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors"
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
            <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
              Origen
            </label>
            <select
              value={formState.source}
              onChange={(e) => handleFormChange("source", e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-[#181818] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors"
            >
              {sourceOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-extrabold text-[#E0E0E0]/50 uppercase tracking-widest block mb-1.5">
              Mesa / Notas
            </label>
            <input
              type="text"
              value={formState.notes}
              onChange={(e) => handleFormChange("notes", e.target.value)}
              className="w-full rounded-xl border border-white/5 bg-[#181818] px-3 py-2 text-xs text-[#E0E0E0] outline-none focus:border-primary transition-colors placeholder:text-[#E0E0E0]/30"
              placeholder="Ej. Mesa 4..."
            />
          </div>
        </div>
      </section>

      {/* Tu Pedido (Carrito) */}
      <section className="rounded-2xl bg-[#242424] p-6 shadow-sm border border-white/5 space-y-5">
        <div className="flex items-center justify-between border-b border-white/5 pb-3">
          <h3 className="text-sm font-black uppercase text-[#E0E0E0] tracking-wider flex items-center gap-2">
            <span className="h-2 w-2 rounded-full bg-success"></span>
            Tu Pedido
          </h3>
          {formState.items.length > 0 && (
            <button
              type="button"
              onClick={handleClearCart}
              className="text-[10px] font-bold text-red-400 hover:text-red-300 uppercase tracking-wider transition-colors"
            >
              Vaciar Carrito
            </button>
          )}
        </div>

        {formErrors.items && (
          <div className="rounded-xl bg-red-500/10 p-3 border border-red-500/20 text-xs font-bold text-red-400 text-center">
            ⚠️ {formErrors.items}
          </div>
        )}

        {/* Listado del Carrito */}
        <div className="space-y-2.5 max-h-[42vh] overflow-y-auto pr-1 custom-scrollbar">
          {formState.items.length === 0 ? (
            <div className="text-center py-12 text-[#E0E0E0]/40 space-y-2">
              <ShoppingBag className="h-10 w-10 mx-auto opacity-30 text-primary" />
              <p className="text-xs font-extrabold uppercase tracking-widest">
                El carrito está vacío
              </p>
              <p className="text-[11px] font-medium text-[#E0E0E0]/30">
                Selecciona productos del catálogo
              </p>
            </div>
          ) : (
            formState.items.map((item, index) => {
              const product = availableMenuItems.find((m) => m.id === item.menuItemId);
              const isMixed = product && isMixedOrderItem(product.name);
              return (
                <div
                  key={index}
                  className="flex items-center justify-between bg-[#1A1A1A] p-3 rounded-xl border border-white/5 gap-3"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-black text-xs text-[#E0E0E0] uppercase tracking-tight truncate">
                      {product?.name || "Producto"}
                    </p>
                    {isMixed && item.notes ? (
                      <p className="text-[10px] font-extrabold text-amber-400 mt-0.5">
                        {item.notes}
                      </p>
                    ) : (
                      <p className="text-[10px] font-bold text-[#E0E0E0]/50 mt-0.5">
                        ${product?.price.toFixed(2)} c/u
                      </p>
                    )}
                  </div>

                  <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1 border border-white/5">
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(index, -1)}
                      className="h-6 w-6 rounded-lg bg-white/5 hover:bg-red-500/20 text-[#E0E0E0] hover:text-red-400 flex items-center justify-center font-bold text-xs transition-colors"
                    >
                      <Minus className="h-3 w-3" />
                    </button>
                    <span className="w-5 text-center font-black text-xs text-[#E0E0E0]">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleQuantityChange(index, 1)}
                      className="h-6 w-6 rounded-lg bg-white/5 hover:bg-emerald-500/20 text-[#E0E0E0] hover:text-emerald-400 flex items-center justify-center font-bold text-xs transition-colors"
                    >
                      <Plus className="h-3 w-3" />
                    </button>
                  </div>

                  <div className="text-right min-w-[55px]">
                    <p className="font-black text-xs text-[#E0E0E0] tabular-nums">
                      ${((product?.price || 0) * Number(item.quantity)).toFixed(2)}
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Total y Acción */}
        {formState.items.length > 0 && (
          <div className="pt-4 border-t border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-[#E0E0E0]/50 uppercase tracking-widest">
                Total a Pagar
              </span>
              <span className="text-3xl font-black text-[#E0E0E0] tracking-tight tabular-nums">
                ${formState.items
                  .reduce((total, item) => {
                    const product = availableMenuItems.find((m) => m.id === item.menuItemId);
                    return total + (product?.price || 0) * Number(item.quantity);
                  }, 0)
                  .toFixed(2)}
              </span>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full rounded-xl bg-primary py-3.5 text-black font-black text-sm hover:brightness-105 active:scale-[0.98] transition-all uppercase tracking-wider shadow-lg shadow-primary/10 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              <Printer className="h-4 w-4" />
              {isSubmitting ? "GUARDANDO..." : "GUARDAR E IMPRIMIR"}
            </button>
          </div>
        )}
      </section>
    </div>
  );
}
