"use client";

import React, { useState, useEffect, useMemo, useTransition } from "react";
import { useSearchParams, usePathname, useRouter } from "next/navigation";
import { TableSearchInput } from "@/components/ui/DataTableControls";
import { useMenuItems } from "../hooks/useMenuItems";
import { useMenuCategories } from "../hooks/useMenuCategories";

export function MenuFilters() {
  const router = useRouter();
  const pathname = usePathname();
  const rawSearchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const { items } = useMenuItems();
  const { menuCategories } = useMenuCategories();

  const searchQuery = rawSearchParams.get("q") || "";
  const categoryFilter = rawSearchParams.get("category") || "all";
  const availabilityFilter = (rawSearchParams.get("availability") || "all") as
    | "all"
    | "available"
    | "unavailable";

  const [localQuery, setLocalQuery] = useState(searchQuery);

  useEffect(() => {
    setLocalQuery(searchQuery);
  }, [searchQuery]);

  const categories = useMemo(() => {
    const set = new Set<string>();
    menuCategories.forEach((c) => set.add(c.name));
    items.forEach((i) => {
      if (i.category) set.add(i.category);
    });
    return Array.from(set).sort();
  }, [menuCategories, items]);

  const updateSearchParam = (updates: Record<string, string | number | null>) => {
    const params = new URLSearchParams(rawSearchParams.toString());
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === "" || value === "all") {
        params.delete(key);
      } else {
        params.set(key, String(value));
      }
    });
    if (updates.page === undefined) {
      params.delete("page");
    }
    startTransition(() => {
      router.push(`${pathname}?${params.toString()}`);
    });
  };

  const handleSearchChange = (val: string) => {
    setLocalQuery(val);
    if (val === "") {
      updateSearchParam({ q: null });
    }
  };

  return (
    <div className={`grid grid-cols-1 sm:grid-cols-3 gap-3 bg-dark/40 p-4 rounded-xl border border-border ${isPending ? "opacity-60 transition-opacity duration-200" : ""}`}>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          updateSearchParam({ q: localQuery });
        }}
      >
        <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
          Buscar Producto
        </label>
        <TableSearchInput
          value={localQuery}
          onChange={handleSearchChange}
          placeholder="Buscar por nombre o descripción..."
        />
      </form>

      <div>
        <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
          Categoría
        </label>
        <select
          value={categoryFilter}
          onChange={(e) => updateSearchParam({ category: e.target.value })}
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
        <label className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-wider block mb-1">
          Estado
        </label>
        <select
          value={availabilityFilter}
          onChange={(e) =>
            updateSearchParam({
              availability: e.target.value as "all" | "available" | "unavailable",
            })
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
