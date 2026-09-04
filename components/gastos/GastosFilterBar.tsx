"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { useGastosContextNullable } from "./GastosContext";
import type { Category, ExpenseTypeFilter, InvoiceFilter } from "./types";

export interface GastosFilterBarProps {
  categories?: Category[];
  search?: string;
  onSearchChange?: (val: string) => void;
  categoryFilter?: string;
  onCategoryFilterChange?: (catId: string) => void;
  invoiceFilter?: InvoiceFilter;
  onInvoiceFilterChange?: (filter: InvoiceFilter) => void;
  typeFilter?: ExpenseTypeFilter;
  onTypeFilterChange?: (filter: ExpenseTypeFilter) => void;
}

export function GastosFilterBar(props: GastosFilterBarProps = {}) {
  const context = useGastosContextNullable();
  const categories = props.categories ?? context?.categories ?? [];
  const search = props.search ?? context?.tableSearch ?? "";
  const onSearchChange =
    props.onSearchChange ?? context?.handleSearchChange ?? (() => {});
  const categoryFilter =
    props.categoryFilter ?? context?.tableCategoryFilter ?? "";
  const onCategoryFilterChange =
    props.onCategoryFilterChange ?? context?.handleCategoryFilterChange ?? (() => {});
  const invoiceFilter =
    props.invoiceFilter ?? context?.tableInvoiceFilter ?? "all";
  const onInvoiceFilterChange =
    props.onInvoiceFilterChange ?? context?.handleInvoiceFilterChange ?? (() => {});
  const typeFilter = props.typeFilter ?? context?.tableTypeFilter ?? "all";
  const onTypeFilterChange =
    props.onTypeFilterChange ?? context?.handleTypeFilterChange ?? (() => {});
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-3 bg-dark/40 p-4 rounded-xl border border-border">
      {/* Buscador por texto */}
      <div>
        <label
          htmlFor="gastos-table-search"
          className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1"
        >
          Buscar
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-light/40" />
          <input
            id="gastos-table-search"
            type="text"
            value={search}
            onChange={(e) => onSearchChange(e.target.value)}
            placeholder="Descripción o categoría..."
            className="w-full rounded-xl border border-border bg-dark/40 pl-8 pr-3 py-1.5 text-xs text-text-light outline-none focus:border-primary transition-colors placeholder:text-text-light/30"
          />
          {search && (
            <button
              type="button"
              onClick={() => onSearchChange("")}
              aria-label="Limpiar búsqueda"
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-text-light/40 hover:text-white"
            >
              <X className="h-3 w-3" />
            </button>
          )}
        </div>
      </div>

      {/* Filtro por Categoría */}
      <div>
        <label
          htmlFor="gastos-category-filter"
          className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1"
        >
          Categoría
        </label>
        <select
          id="gastos-category-filter"
          value={categoryFilter}
          onChange={(e) => onCategoryFilterChange(e.target.value)}
          aria-label="Filtrar por categoría"
          className="w-full rounded-xl border border-border bg-dark/40 px-3 py-1.5 text-xs text-text-light outline-none focus:border-primary transition-colors"
        >
          <option value="">Todas las Categorías</option>
          {categories.map((cat) => (
            <option key={cat.id} value={cat.id}>
              {cat.name}
            </option>
          ))}
        </select>
      </div>

      {/* Filtro por Factura */}
      <div>
        <label
          htmlFor="gastos-invoice-filter"
          className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1"
        >
          Factura
        </label>
        <select
          id="gastos-invoice-filter"
          value={invoiceFilter}
          onChange={(e) =>
            onInvoiceFilterChange(
              e.target.value as "all" | "invoiced" | "no_invoice",
            )
          }
          aria-label="Filtrar por factura"
          className="w-full rounded-xl border border-border bg-dark/40 px-3 py-1.5 text-xs text-text-light outline-none focus:border-primary transition-colors"
        >
          <option value="all">Todas</option>
          <option value="invoiced">Solo Facturados (FAC)</option>
          <option value="no_invoice">Sin Factura</option>
        </select>
      </div>

      {/* Filtro por Tipo de Gasto */}
      <div>
        <label
          htmlFor="gastos-type-filter"
          className="text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest block mb-1"
        >
          Tipo de Gasto
        </label>
        <select
          id="gastos-type-filter"
          value={typeFilter}
          onChange={(e) =>
            onTypeFilterChange(e.target.value as "all" | "fijo" | "variable")
          }
          aria-label="Filtrar por tipo de gasto"
          className="w-full rounded-xl border border-border bg-dark/40 px-3 py-1.5 text-xs text-text-light outline-none focus:border-primary transition-colors"
        >
          <option value="all">Todos los Tipos</option>
          <option value="fijo">Solo Fijos</option>
          <option value="variable">Solo Variables</option>
        </select>
      </div>
    </div>
  );
}
