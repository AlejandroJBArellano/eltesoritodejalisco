"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

import { useGastosContextNullable } from "./GastosContext";

export interface GastosPaginationProps {
  currentPage?: number;
  totalPages?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
}

export function GastosPagination(props: GastosPaginationProps = {}) {
  const context = useGastosContextNullable();
  const currentPage = props.currentPage ?? context?.currentPage ?? 1;
  const totalPages = props.totalPages ?? context?.totalPages ?? 1;
  const pageSize = props.pageSize ?? context?.pageSize ?? 10;
  const onPageChange =
    props.onPageChange ?? context?.setCurrentPage ?? (() => {});
  const onPageSizeChange =
    props.onPageSizeChange ?? context?.handlePageSizeChange ?? (() => {});
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-border text-xs text-text-light/60 font-medium">
      <div className="flex items-center gap-2">
        <label htmlFor="gastos-page-size" className="text-xs">
          Filas por página:
        </label>
        <select
          id="gastos-page-size"
          value={pageSize}
          onChange={(e) => onPageSizeChange(Number(e.target.value))}
          aria-label="Filas por página"
          className="bg-dark/40 border border-border rounded-lg px-2 py-1 text-xs text-text-light outline-none"
        >
          <option value={10}>10</option>
          <option value={25}>25</option>
          <option value={50}>50</option>
        </select>
      </div>

      <div className="flex items-center gap-4">
        <span>
          Página <strong className="text-text-light">{currentPage}</strong> de{" "}
          <strong className="text-text-light">{totalPages}</strong>
        </span>

        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all active:scale-95"
            title="Página anterior"
            aria-label="Página anterior"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          <button
            type="button"
            onClick={() => onPageChange(Math.min(currentPage + 1, totalPages))}
            disabled={currentPage === totalPages}
            className="p-1.5 rounded-lg bg-white/5 hover:bg-white/10 disabled:opacity-30 disabled:hover:bg-white/5 transition-all active:scale-95"
            title="Página siguiente"
            aria-label="Página siguiente"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
        </div>
      </div>
    </div>
  );
}
