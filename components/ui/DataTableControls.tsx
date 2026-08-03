"use client";

import React from "react";
import {
  Search,
  X,
  ChevronLeft,
  ChevronRight,
  ArrowUpDown,
  ArrowUp,
  ArrowDown,
} from "lucide-react";

// --- BÚSQUEDA EN TABLA ---
interface TableSearchInputProps {
  value: string;
  onChange: (val: string) => void;
  placeholder?: string;
}

export function TableSearchInput({
  value,
  onChange,
  placeholder = "Buscar...",
}: TableSearchInputProps) {
  return (
    <div className="relative w-full sm:w-64">
      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-text-light/40" />
      <input
        type="text"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full rounded-xl border border-border bg-dark/40 pl-9 pr-8 py-2 text-xs font-medium text-text-light placeholder-[#666666] outline-none focus:border-primary transition-all"
      />
      {value && (
        <button
          onClick={() => onChange("")}
          className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-light/40 hover:text-text-light"
        >
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </div>
  );
}

// --- ENCABEZADO CON ORDENAMIENTO ---
interface TableHeaderSortCellProps<T extends string> {
  field: T;
  label: string;
  currentSortField: T;
  sortDirection: "asc" | "desc";
  onSort: (field: T) => void;
  className?: string;
}

export function TableHeaderSortCell<T extends string>({
  field,
  label,
  currentSortField,
  sortDirection,
  onSort,
  className = "",
}: TableHeaderSortCellProps<T>) {
  const isSelected = currentSortField === field;

  return (
    <th
      className={`py-3 px-4 font-bold text-text-light/70 select-none ${className}`}
    >
      <button
        type="button"
        onClick={() => onSort(field)}
        className="group flex items-center gap-1.5 hover:text-white transition-colors focus:outline-none"
      >
        <span>{label}</span>
        {isSelected ? (
          sortDirection === "asc" ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary" />
          ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary" />
          )
        ) : (
          <ArrowUpDown className="h-3.5 w-3.5 opacity-30 group-hover:opacity-80 transition-opacity" />
        )}
      </button>
    </th>
  );
}

// --- PAGINACIÓN DE TABLA ---
interface TablePaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  pageSizeOptions?: number[];
}

export function TablePagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [5, 10, 20, 50],
}: TablePaginationProps) {
  const safeTotalPages = Math.max(1, totalPages);
  const safeCurrentPage = Math.min(Math.max(1, currentPage), safeTotalPages);

  const startItem = totalItems === 0 ? 0 : (safeCurrentPage - 1) * pageSize + 1;
  const endItem = Math.min(safeCurrentPage * pageSize, totalItems);

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4 border-t border-border text-xs text-text-light/60">
      <div className="flex items-center gap-3">
        <span>
          Mostrando{" "}
          <strong className="text-text-light">
            {startItem}-{endItem}
          </strong>{" "}
          de <strong className="text-text-light">{totalItems}</strong> registros
        </span>

        {onPageSizeChange && (
          <div className="flex items-center gap-1.5 ml-2">
            <span className="text-[10px] uppercase font-bold tracking-wider text-text-light/40">
              Mostrar:
            </span>
            <select
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              className="rounded-lg border border-border bg-dark/40 px-2 py-1 text-xs text-text-light outline-none focus:border-primary"
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          onClick={() => onPageChange(safeCurrentPage - 1)}
          disabled={safeCurrentPage <= 1}
          className="flex items-center gap-1 rounded-xl border border-border bg-dark/40 px-3 py-1.5 font-bold hover:bg-card hover:text-white disabled:opacity-30 disabled:hover:bg-dark/40 transition-all"
        >
          <ChevronLeft className="h-4 w-4" />
          Anterior
        </button>

        <span className="px-2 font-bold text-text-light">
          {safeCurrentPage} / {safeTotalPages}
        </span>

        <button
          onClick={() => onPageChange(safeCurrentPage + 1)}
          disabled={safeCurrentPage >= safeTotalPages}
          className="flex items-center gap-1 rounded-xl border border-border bg-dark/40 px-3 py-1.5 font-bold hover:bg-card hover:text-white disabled:opacity-30 disabled:hover:bg-dark/40 transition-all"
        >
          Siguiente
          <ChevronRight className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
}
