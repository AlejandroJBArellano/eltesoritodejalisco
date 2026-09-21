import { isMixedOrderItem, usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { MenuItem } from "@/types/pos";
import { Package, PackageSearch, Plus, Search, X } from "lucide-react";
import { memo } from "react";

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
  COMIDA: {
    label: "Comida",
    color: "#FFB7CE",
    badgeBg: "bg-rose-500/10 text-rose-400 border-rose-500/20",
    text: "#FB7185",
  },
  OTROS: {
    label: "Otros",
    color: "#E0E0E0",
    badgeBg: "bg-secondary text-text-light/80 border-border",
    text: "#E4E4E7",
  },
};

const CUSTOM_PALETTES = [
  {
    badgeBg: "bg-cyan-500/10 text-cyan-400 border-cyan-500/20",
    color: "#22D3EE",
  },
  {
    badgeBg: "bg-violet-500/10 text-violet-400 border-violet-500/20",
    color: "#A78BFA",
  },
  {
    badgeBg: "bg-pink-500/10 text-pink-400 border-pink-500/20",
    color: "#F472B6",
  },
  {
    badgeBg: "bg-lime-500/10 text-lime-400 border-lime-500/20",
    color: "#A3E635",
  },
  {
    badgeBg: "bg-teal-500/10 text-teal-400 border-teal-500/20",
    color: "#2DD4BF",
  },
  {
    badgeBg: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
    color: "#818CF8",
  },
];

export function getCategoryConfig(cat: string, index = 0) {
  const normalizedKey = cat.toUpperCase().trim();
  if (CATEGORY_CONFIG[normalizedKey]) {
    return {
      ...CATEGORY_CONFIG[normalizedKey],
      label:
        normalizedKey === "OTROS"
          ? "Otros"
          : CATEGORY_CONFIG[normalizedKey].label || cat,
    };
  }
  const palette = CUSTOM_PALETTES[Math.abs(index) % CUSTOM_PALETTES.length];
  return {
    label: cat,
    color: palette.color,
    badgeBg: palette.badgeBg,
    text: palette.color,
  };
}

/** Derive stock status for a menu item */
function getStockStatus(item: MenuItem): "out" | "low" | "ok" | "untracked" {
  if (item.ingredientId == null || item.currentStock == null)
    return "untracked";
  if (item.currentStock <= 0) return "out";
  if (item.minimumStock != null && item.currentStock <= item.minimumStock)
    return "low";
  return "ok";
}

export function POSMenuGrid() {
  const {
    activeCategory,
    setActiveCategory,
    searchQuery,
    setSearchQuery,
    categories,
    filteredMenuItems,
  } = usePOSData();

  const { handleGridItemClick } = usePOSCart();
  return (
    <section className="rounded-xl bg-card p-4 sm:p-5 border border-border space-y-4 w-full overflow-hidden shadow-xs">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-border pb-3.5">
        <h2 className="text-sm sm:text-base font-bold text-text-light tracking-tight uppercase flex items-center gap-2">
          <span className="h-1.5 w-1.5 rounded-full bg-primary" />
          <span>Catálogo de Productos</span>
        </h2>

        {/* Buscador Rápido */}
        <div className="relative min-w-55">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-light/40 pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar producto..."
            className="w-full rounded-lg border border-border bg-dark/60 pl-8 pr-7 py-1.5 text-xs text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-text-light/30"
          />
          {searchQuery && (
            <button
              type="button"
              onClick={() => setSearchQuery("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 h-5 w-5 flex items-center justify-center rounded text-text-light/40 hover:text-text-light transition-colors cursor-pointer"
              aria-label="Limpiar búsqueda"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Categorías en Tabs */}
      <div className="flex gap-1.5 overflow-x-auto pb-1.5 no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveCategory("")}
          className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap border cursor-pointer active:scale-95 ${
            activeCategory === ""
              ? "bg-white/10 border-white/20 text-text-light shadow-xs"
              : "bg-white/5 text-text-light/50 border-transparent hover:border-border/40 hover:text-text-light"
          }`}
        >
          Todos
        </button>
        {categories.map((cat, index) => {
          const config = getCategoryConfig(cat, index);
          const isActive =
            activeCategory.toUpperCase().trim() === cat.toUpperCase().trim();
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setActiveCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all whitespace-nowrap border cursor-pointer active:scale-95 ${
                isActive
                  ? `${config.badgeBg} shadow-xs`
                  : "bg-white/5 text-text-light/50 border-transparent hover:border-border/40 hover:text-text-light"
              }`}
            >
              {config.label}
            </button>
          );
        })}
      </div>

      {/* Grid de Productos */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 pt-1">
        {filteredMenuItems.length === 0 ? (
          <div className="col-span-full py-12 text-center space-y-2">
            <PackageSearch className="h-8 w-8 mx-auto opacity-30 text-primary" />
            <p className="text-xs font-semibold uppercase tracking-wider text-text-light/40">
              Sin resultados
            </p>
            <p className="text-[11px] text-text-light/40">
              Intenta con otra categoría o búsqueda
            </p>
          </div>
        ) : (
          filteredMenuItems.map((m) => (
            <MenuItemCard key={m.id} item={m} onClick={handleGridItemClick} />
          ))
        )}
      </div>
    </section>
  );
}

interface MenuItemCardProps {
  item: MenuItem;
  onClick: (item: MenuItem) => void;
}

const MenuItemCard = memo(function MenuItemCard({
  item: m,
  onClick,
}: MenuItemCardProps) {
  const isMixed = isMixedOrderItem(m.name);
  const stockStatus = getStockStatus(m);
  const isOutOfStock = stockStatus === "out";
  const isLowStock = stockStatus === "low";

  return (
    <button
      type="button"
      onClick={() => onClick(m)}
      className={`group relative rounded-xl bg-card-light/70 p-3.5 border transition-all duration-150 shadow-xs flex flex-col justify-between text-left h-28 overflow-hidden active:scale-[0.98] cursor-pointer ${
        isOutOfStock
          ? "border-rose-500/25 hover:border-rose-500/50 hover:bg-card-light"
          : isLowStock
            ? "border-amber-500/30 hover:border-amber-500/60 hover:bg-card-light"
            : "border-border hover:border-primary/40 hover:bg-card-light"
      }`}
    >
      {/* Sin Stock warning badge */}
      {isOutOfStock && (
        <span className="absolute top-2 right-2 z-10 rounded-md bg-rose-500/20 border border-rose-500/30 px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wider text-rose-300">
          Sin Stock
        </span>
      )}

      <div className="flex items-start justify-between gap-1 w-full">
        <span
          className={`font-semibold text-xs leading-snug line-clamp-2 transition-colors ${
            isOutOfStock
              ? "text-text-light/60 group-hover:text-rose-300"
              : "text-text-light group-hover:text-primary"
          }`}
        >
          {m.name}
        </span>
        {isMixed && !isOutOfStock && (
          <span className="rounded-md bg-amber-500/10 text-amber-400 text-[9px] font-semibold px-1.5 py-0.5 uppercase tracking-wider shrink-0 border border-amber-500/20">
            Mixto
          </span>
        )}
      </div>

      <div className="mt-2 flex items-center justify-between w-full gap-1 flex-wrap">
        <span className="rounded-md bg-dark/60 border border-border px-2 py-0.5 text-xs font-mono font-bold text-text-light tabular-nums">
          ${m.price.toFixed(2)}
        </span>

        {/* Stock badge — only when ingredient is tracked */}
        {stockStatus !== "untracked" && (
          <span
            className={`flex items-center gap-1 rounded-md px-1.5 py-0.5 text-[10px] font-mono font-semibold tabular-nums border ${
              isOutOfStock
                ? "bg-rose-500/10 border-rose-500/20 text-rose-400"
                : isLowStock
                  ? "bg-amber-500/10 border-amber-500/20 text-amber-400"
                  : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}
          >
            <Package className="h-2.5 w-2.5 shrink-0" />
            <span>{m.currentStock}</span>
          </span>
        )}

        <span className="rounded-md bg-primary/10 p-1 text-primary opacity-0 group-hover:opacity-100 transition-opacity ml-auto">
          <Plus className="h-3 w-3" />
        </span>
      </div>
    </button>
  );
});
