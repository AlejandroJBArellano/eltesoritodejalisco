"use client";

import { useState, useEffect } from "react";
import { TableSearchInput } from "@/components/ui/DataTableControls";

interface MenuFiltersProps {
  searchQuery: string;
  categoryFilter: string;
  availabilityFilter: "all" | "available" | "unavailable";
  categories: string[];
  onSearchSubmit: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onAvailabilityChange: (value: "all" | "available" | "unavailable") => void;
}

export function MenuFilters({
  searchQuery,
  categoryFilter,
  availabilityFilter,
  categories,
  onSearchSubmit,
  onCategoryChange,
  onAvailabilityChange,
}: MenuFiltersProps) {
  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const handleSearchChange = (val: string) => {
    setLocalQuery(val);
    if (val === "") {
      onSearchSubmit("");
    }
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 bg-dark/40 p-4 rounded-xl border border-border">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          onSearchSubmit(localQuery);
        }}
      >
        <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1">
          Buscar Producto
        </label>
        <TableSearchInput
          value={localQuery}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre o descripción..."
        />
      </form>

      <div>
        <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1">
          Categoría
        </label>
        <select
          value={categoryFilter}
          onChange={(e) => onCategoryChange(e.target.value)}
          className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs font-bold text-text-light outline-none focus:border-primary cursor-pointer transition-colors duration-200"
        >
          <option value="all">Todas las Categorías</option>
          {categories.map((cat) => (
            <option key={cat} value={cat}>
              {cat}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1">
          Estado
        </label>
        <select
          value={availabilityFilter}
          onChange={(e) =>
            onAvailabilityChange(
              e.target.value as "all" | "available" | "unavailable",
            )
          }
          className="w-full rounded-xl border border-border bg-dark/40 px-3 py-2 text-xs font-bold text-text-light outline-none focus:border-primary cursor-pointer transition-colors duration-200"
        >
          <option value="all">Todos los Estados</option>
          <option value="available">Disponibles</option>
          <option value="unavailable">No Disponibles</option>
        </select>
      </div>
    </div>
  );
}
