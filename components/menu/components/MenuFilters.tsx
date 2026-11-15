"use client";

import React, { useMemo } from "react";
import { TableSearchInput } from "@/components/ui/DataTableControls";
import { useMenuCategories } from "../hooks/useMenuCategories";

interface MenuFiltersProps {
  searchQuery: string;
  categoryFilter: string;
  availabilityFilter: "all" | "available" | "unavailable";
  onSearchChange: (q: string) => void;
  onCategoryChange: (category: string) => void;
  onAvailabilityChange: (
    availability: "all" | "available" | "unavailable",
  ) => void;
}

export function MenuFilters({
  searchQuery,
  categoryFilter,
  availabilityFilter,
  onSearchChange,
  onCategoryChange,
  onAvailabilityChange,
}: MenuFiltersProps) {
  const { menuCategories } = useMenuCategories();

  const categories = useMemo(() => {
    return menuCategories
      .filter((c) => c.is_active !== false)
      .slice()
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((c) => c.name);
  }, [menuCategories]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-dark/40 p-4 rounded-xl border border-border">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearchChange(searchQuery);
        }}
      >
        <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
          Buscar Producto
        </label>
        <TableSearchInput
          value={searchQuery}
          onChange={onSearchChange}
          placeholder="Buscar por nombre o descripción..."
        />
      </form>

      <div>
        <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
          Categoría
        </label>
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-text-light outline-none focus:border-primary cursor-pointer transition-colors duration-200"
        >
          <option value="all">Todas las Categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
          <option value="uncategorized">Sin categoría / Otros</option>
        </select>
      </div>

      <div>
        <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
          Estado
        </label>
        <select
          value={availabilityFilter}
          onChange={(e) =>
            onAvailabilityChange(
              e.target.value as "all" | "available" | "unavailable",
            )
          }
          className="w-full rounded-lg border border-border bg-card px-3 py-2 text-xs font-bold text-text-light outline-none focus:border-primary cursor-pointer transition-colors duration-200"
        >
          <option value="all">Todos los Estados</option>
          <option value="available">Disponibles</option>
          <option value="unavailable">No Disponibles</option>
        </select>
      </div>
    </div>
  );
}
