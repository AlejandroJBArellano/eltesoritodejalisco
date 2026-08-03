import React from "react";
import { Search, X, Plus, PackageSearch } from "lucide-react";
import { MenuItem } from "@/types/pos";
import { isMixedOrderItem } from "@/hooks/pos/usePOSCart";

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

interface POSMenuGridProps {
  searchQuery: string;
  setSearchQuery: (query: string) => void;
  activeCategory: string;
  setActiveCategory: (category: string) => void;
  categories: string[];
  filteredMenuItems: MenuItem[];
  handleGridItemClick: (item: MenuItem) => void;
}

export function POSMenuGrid({
  searchQuery,
  setSearchQuery,
  activeCategory,
  setActiveCategory,
  categories,
  filteredMenuItems,
  handleGridItemClick,
}: POSMenuGridProps) {
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
          className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap border ${
            activeCategory === ""
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
              className={`px-4 py-2 rounded-full font-black text-xs uppercase tracking-wider transition-all whitespace-nowrap border ${
                isActive
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
            return (
              <button
                key={m.id}
                type="button"
                onClick={() => handleGridItemClick(m)}
                className="group relative rounded-2xl bg-card-light p-4 border border-border hover:border-primary/40 transition-all shadow-sm hover:shadow-md hover:-translate-y-0.5 flex flex-col justify-between text-left h-28 overflow-hidden active:scale-95"
              >
                <div className="flex items-start justify-between gap-1 w-full">
                  <span className="font-black text-xs text-text-light uppercase tracking-tight leading-snug line-clamp-2 group-hover:text-primary transition-colors">
                    {m.name}
                  </span>
                  {isMixed && (
                    <span className="rounded-full bg-amber-500/10 text-amber-400 text-[9px] font-black px-1.5 py-0.5 uppercase tracking-widest shrink-0 border border-amber-500/20">
                      Mixto
                    </span>
                  )}
                </div>
                <div className="mt-2 flex items-center justify-between w-full">
                  <span className="rounded-xl bg-white/5 border border-border px-2.5 py-1 text-xs font-black text-text-light tabular-nums">
                    ${m.price.toFixed(2)}
                  </span>
                  <span className="rounded-lg bg-primary/10 p-1.5 text-primary opacity-0 group-hover:opacity-100 transition-opacity">
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
