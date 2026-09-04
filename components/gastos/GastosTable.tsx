"use client";

import React from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";
import { ExportButton } from "@/components/ui/DataTableControls";
import { EXPENSES_EXPORT_COLUMNS } from "./exportColumns";
import { useGastosContextNullable } from "./GastosContext";
import type { Expense, ExpenseSortField } from "./types";

export interface GastosTableProps {
  expenses?: Expense[];
  filteredCount?: number;
  totalCount?: number;
  sortField?: ExpenseSortField;
  sortDirection?: "asc" | "desc";
  onSort?: (field: ExpenseSortField) => void;
  children?: React.ReactNode;
}

export const getGastosExportFilename = () => {
  const currentDateStr = new Date().toISOString().split("T")[0];
  return `gastos_${currentDateStr}`;
};

export function GastosTable(props: GastosTableProps = {}) {
  const context = useGastosContextNullable();
  const expenses = props.expenses ?? context?.paginatedExpenses ?? [];
  const filteredCount =
    props.filteredCount ?? context?.filteredExpenses.length ?? 0;
  const totalCount = props.totalCount ?? context?.expenses.length ?? 0;
  const sortField = props.sortField ?? context?.sortField ?? "date";
  const sortDirection = props.sortDirection ?? context?.sortDirection ?? "desc";
  const onSort = props.onSort ?? context?.handleSort ?? (() => {});
  const children = props.children;
  const renderSortArrow = (field: ExpenseSortField) => {
    if (sortField !== field) {
      return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="h-3 w-3 text-primary" />
    ) : (
      <ArrowDown className="h-3 w-3 text-primary" />
    );
  };

  return (
    <section className="rounded-2xl bg-card p-6 shadow-sm border border-border overflow-hidden space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-red-500"></span>
          Historial de Gastos
        </h2>
        <div className="flex items-center gap-3">
          <span className="text-xs font-bold text-text-light/50 uppercase tracking-widest hidden sm:inline">
            Mostrando {expenses.length} de {filteredCount} egresos ({totalCount} totales)
          </span>
          <ExportButton
            data={expenses}
            columns={EXPENSES_EXPORT_COLUMNS}
            filename={getGastosExportFilename}
            sheetName="Gastos Operativos"
          />
        </div>
      </div>

      {/* Ranura para barra de filtros o controles superiores */}
      {children}

      {/* Contenedor de Tabla */}
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-black text-text-light/40 uppercase tracking-wider select-none">
              <th
                scope="col"
                className="py-3 px-3 cursor-pointer hover:text-text-light transition-colors"
                onClick={() => onSort("date")}
              >
                <div className="flex items-center gap-1.5">
                  Fecha
                  {renderSortArrow("date")}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-3 cursor-pointer hover:text-text-light transition-colors"
                onClick={() => onSort("category")}
              >
                <div className="flex items-center gap-1.5">
                  Rubro / Categoría
                  {renderSortArrow("category")}
                </div>
              </th>
              <th
                scope="col"
                className="py-3 px-3 cursor-pointer hover:text-text-light transition-colors"
                onClick={() => onSort("description")}
              >
                <div className="flex items-center gap-1.5">
                  Descripción / Motivo
                  {renderSortArrow("description")}
                </div>
              </th>
              <th scope="col" className="py-3 px-3 text-center">
                Factura
              </th>
              <th
                scope="col"
                className="py-3 px-3 text-right cursor-pointer hover:text-text-light transition-colors"
                onClick={() => onSort("amount")}
              >
                <div className="flex items-center justify-end gap-1.5">
                  Monto
                  {renderSortArrow("amount")}
                </div>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {expenses.map((exp) => (
              <tr key={exp.id} className="hover:bg-white/5 transition-colors">
                <td className="py-3.5 px-3 font-mono text-xs font-bold text-text-light/80 whitespace-nowrap">
                  {exp.date}
                </td>
                <td className="py-3.5 px-3">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-2.5 h-2.5 rounded-full shrink-0 shadow-sm"
                      style={{
                        backgroundColor:
                          exp.expense_categories?.color || "#FFB7CE",
                      }}
                    />
                    <span className="text-xs font-black text-text-light uppercase">
                      {exp.expense_categories?.name || "Sin Categoría"}
                    </span>
                    <span
                      className={`text-[9px] px-1.5 py-0.2 rounded font-black uppercase tracking-wider ${
                        exp.expense_categories?.tipo_gasto === "fijo"
                          ? "bg-amber-500/10 text-amber-400"
                          : "bg-emerald-500/10 text-emerald-400"
                      }`}
                    >
                      {exp.expense_categories?.tipo_gasto === "fijo"
                        ? "Fijo"
                        : "Var"}
                    </span>
                  </div>
                </td>
                <td className="py-3.5 px-3 font-medium text-text-light/90 text-xs">
                  {exp.description}
                </td>
                <td className="py-3.5 px-3 text-center">
                  {exp.has_invoice ? (
                    <span className="rounded-full bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 text-[9px] font-black text-blue-400 uppercase">
                      FAC
                    </span>
                  ) : (
                    <span className="text-text-light/30 font-bold">—</span>
                  )}
                </td>
                <td className="py-3.5 px-3 text-right font-mono font-black text-red-400">
                  - ${exp.amount.toFixed(2)}
                </td>
              </tr>
            ))}
            {expenses.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="py-8 text-center text-text-light/40 italic"
                >
                  No hay registros de gastos encontrados para los filtros seleccionados.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
