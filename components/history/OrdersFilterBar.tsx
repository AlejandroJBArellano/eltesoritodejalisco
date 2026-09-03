"use client";

import React from "react";
import { Search, X } from "lucide-react";
import { ExportButton } from "@/components/ui/DataTableControls";
import { PaymentMethod } from "@/types";
import { useHistoryContextNullable } from "./HistoryContext";
import { ORDERS_EXPORT_COLUMNS } from "./exportColumns";
import type { Order, OrderFilters } from "./types";

export interface OrdersFilterBarProps {
  filters?: OrderFilters;
  availableTables?: string[];
  sortedOrders?: Order[];
  onFilterChange?: <K extends keyof OrderFilters>(
    key: K,
    value: OrderFilters[K],
  ) => void;
  onResetFilters?: () => void;
}

export function OrdersFilterBar(props: OrdersFilterBarProps = {}) {
  const context = useHistoryContextNullable();

  const filters = props.filters ?? context?.filters ?? {
    searchQuery: "",
    dateFilter: "",
    tableFilter: "",
    paymentMethodFilter: "",
    sourceFilter: "",
  };
  const availableTables = props.availableTables ?? context?.availableTables ?? [];
  const sortedOrders = props.sortedOrders ?? context?.sortedOrders ?? [];
  const onFilterChange = props.onFilterChange ?? context?.setFilter ?? (() => {});
  const onResetFilters = props.onResetFilters ?? context?.resetFilters ?? (() => {});

  const hasActiveFilters = Boolean(
    filters.searchQuery ||
      filters.dateFilter ||
      filters.tableFilter ||
      filters.paymentMethodFilter ||
      filters.sourceFilter,
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col md:flex-row items-center justify-between gap-4">
        {/* BUSCADOR */}
        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-text-light/40" />
          <input
            type="text"
            placeholder="Buscar por folio (#1001)..."
            value={filters.searchQuery}
            onChange={(e) => onFilterChange("searchQuery", e.target.value)}
            className="w-full bg-dark/40 border border-border rounded-xl pl-10 pr-4 py-2 text-xs text-text-light placeholder:text-text-light/30 focus:border-primary focus:outline-none transition-all"
          />
        </div>

        {/* FILTROS Y ACCIONES */}
        <div className="flex items-center gap-2.5 w-full md:w-auto overflow-x-auto pb-1 md:pb-0 flex-wrap">
          {/* FECHA */}
          <div className="relative flex items-center">
            <input
              type="date"
              value={filters.dateFilter}
              onChange={(e) => onFilterChange("dateFilter", e.target.value)}
              className="bg-dark/40 border border-border rounded-xl px-3 py-2 text-xs text-text-light focus:border-primary focus:outline-none transition-all cursor-pointer"
            />
          </div>

          {/* MESA */}
          <select
            value={filters.tableFilter}
            onChange={(e) => onFilterChange("tableFilter", e.target.value)}
            className="bg-dark/40 border border-border rounded-xl px-3 py-2 text-xs text-text-light focus:border-primary focus:outline-none transition-all cursor-pointer"
          >
            <option value="">Todas las Mesas</option>
            {availableTables.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>

          {/* MÉTODO DE PAGO */}
          <select
            value={filters.paymentMethodFilter}
            onChange={(e) =>
              onFilterChange("paymentMethodFilter", e.target.value)
            }
            className="bg-dark/40 border border-border rounded-xl px-3 py-2 text-xs text-text-light focus:border-primary focus:outline-none transition-all cursor-pointer"
          >
            <option value="">Todos los Métodos</option>
            <option value={PaymentMethod.CASH}>Efectivo</option>
            <option value={PaymentMethod.CARD}>Tarjeta</option>
            <option value={PaymentMethod.TRANSFER}>Transferencia</option>
          </select>

          {/* CANAL DE VENTA (SOURCE) */}
          <select
            value={filters.sourceFilter}
            onChange={(e) => onFilterChange("sourceFilter", e.target.value)}
            className="bg-dark/40 border border-border rounded-xl px-3 py-2 text-xs text-text-light focus:border-primary focus:outline-none transition-all cursor-pointer"
          >
            <option value="">Todos los Canales</option>
            <option value="POS">Punto de Venta (POS)</option>
            <option value="PICKUP_APP">App Móvil / Pickup</option>
          </select>

          {/* LIMPIAR */}
          {hasActiveFilters && (
            <button
              type="button"
              onClick={onResetFilters}
              className="flex items-center gap-1 text-xs text-text-light/50 hover:text-text-light px-2 py-1 transition-colors"
            >
              <X className="h-3.5 w-3.5" />
              Limpiar
            </button>
          )}

          {/* BOTÓN EXPORTAR EXCEL / CSV */}
          <ExportButton
            data={sortedOrders}
            columns={ORDERS_EXPORT_COLUMNS}
            filename={() =>
              `ordenes_${new Date().toISOString().split("T")[0]}`
            }
            sheetName="Historial de Órdenes"
          />
        </div>
      </div>
    </div>
  );
}
