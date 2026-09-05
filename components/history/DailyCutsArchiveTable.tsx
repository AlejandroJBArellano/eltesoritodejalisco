"use client";

import React from "react";
import { Folder, Receipt } from "lucide-react";
import {
  TableHeaderSortCell,
  TablePagination,
  ExportButton,
} from "@/components/ui/DataTableControls";
import { useDailyCutsArchive } from "./hooks/useDailyCutsArchive";
import { DailyCutDetailModal } from "./DailyCutDetailModal";
import { DAILY_CUTS_EXPORT_COLUMNS } from "./exportColumns";
import type { CutSortField, DailyCut } from "./types";

export interface DailyCutsArchiveTableProps {
  dailyCuts?: DailyCut[];
  sortedDailyCuts?: DailyCut[];
  paginatedDailyCuts?: DailyCut[];
  isLoadingCuts?: boolean;
  cutsSortField?: CutSortField;
  cutsSortDir?: "asc" | "desc";
  cutsPage?: number;
  cutsPageSize?: number;
  cutsTotalPages?: number;
  onSort?: (field: CutSortField) => void;
  onPageChange?: (page: number) => void;
  onPageSizeChange?: (pageSize: number) => void;
  onViewCutDetail?: (cut: DailyCut) => void;
}

export function DailyCutsArchiveTable(props: DailyCutsArchiveTableProps = {}) {
  // Use internal hook if props are not provided
  const internalHook = useDailyCutsArchive({
    autoFetch: props.dailyCuts === undefined,
  });

  const dailyCuts = props.dailyCuts ?? internalHook.dailyCuts;
  const sortedDailyCuts = props.sortedDailyCuts ?? internalHook.sortedDailyCuts;
  const paginatedDailyCuts = props.paginatedDailyCuts ?? internalHook.paginatedDailyCuts;
  const isLoadingCuts = props.isLoadingCuts ?? internalHook.isLoadingCuts;
  const cutsSortField = props.cutsSortField ?? internalHook.cutsSortField;
  const cutsSortDir = props.cutsSortDir ?? internalHook.cutsSortDir;
  const cutsPage = props.cutsPage ?? internalHook.cutsPage;
  const cutsPageSize = props.cutsPageSize ?? internalHook.cutsPageSize;
  const cutsTotalPages = props.cutsTotalPages ?? internalHook.cutsTotalPages;

  const onSort = props.onSort ?? ((f) => {
    internalHook.setCutsSortField(f);
    internalHook.setCutsSortDir((d) => (d === "asc" ? "desc" : "asc"));
  });
  const onPageChange = props.onPageChange ?? internalHook.setCutsPage;
  const onPageSizeChange = props.onPageSizeChange ?? internalHook.setCutsPageSize;
  const onViewCutDetail = props.onViewCutDetail ?? internalHook.setSelectedCutDetail;

  return (
    <>
      <section className="rounded-2xl bg-card p-6 shadow-sm border border-border space-y-4">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
            <Folder className="h-5 w-5 text-blue-400" />
            Archivo de Cortes Diarios
          </h2>
          {dailyCuts.length > 0 && (
            <ExportButton
              data={sortedDailyCuts}
              columns={DAILY_CUTS_EXPORT_COLUMNS}
              filename={() =>
                `cortes_diarios_${new Date().toISOString().split("T")[0]}`
              }
              sheetName="Cortes Diarios"
            />
          )}
        </div>

        {isLoadingCuts ? (
          <p className="text-xs text-text-light/50 font-bold italic py-4">
            Cargando archivo de cortes...
          </p>
        ) : dailyCuts.length === 0 ? (
          <p className="text-xs text-text-light/50 font-bold italic py-4">
            No hay cortes registrados aún.
          </p>
        ) : (
          <div className="overflow-x-auto space-y-4">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-border text-[10px] font-extrabold text-text-light/50 uppercase tracking-widest">
                  <TableHeaderSortCell
                    field="cut_date"
                    label="Fecha"
                    currentSortField={cutsSortField}
                    sortDirection={cutsSortDir}
                    onSort={onSort}
                  />
                  <TableHeaderSortCell
                    field="total_orders"
                    label="Órdenes"
                    currentSortField={cutsSortField}
                    sortDirection={cutsSortDir}
                    onSort={onSort}
                    className="text-right"
                  />
                  <th className="py-3 px-3 text-right">Venta Bruta</th>
                  <TableHeaderSortCell
                    field="venta_neta"
                    label="Venta Neta"
                    currentSortField={cutsSortField}
                    sortDirection={cutsSortDir}
                    onSort={onSort}
                    className="text-right"
                  />
                  <th className="py-3 px-3 text-right">IVA</th>
                  <th className="py-3 px-3 text-right">Gastos</th>
                  <th className="py-3 px-3 text-right">Comisión</th>
                  <TableHeaderSortCell
                    field="utilidad_final"
                    label="Utilidad Final"
                    currentSortField={cutsSortField}
                    sortDirection={cutsSortDir}
                    onSort={onSort}
                    className="text-right"
                  />
                  <th className="py-3 px-3 text-center">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {paginatedDailyCuts.map((cut) => {
                  const ventaBruta =
                    Number(cut.venta_neta) + Number(cut.iva_acumulado);
                  return (
                    <tr
                      key={cut.id}
                      className="hover:bg-white/5 transition-colors"
                    >
                      <td className="py-3.5 px-3 font-bold text-text-light">
                        {new Date(`${cut.cut_date}T12:00:00`).toLocaleDateString(
                          "es-MX",
                          {
                            weekday: "short",
                            year: "numeric",
                            month: "short",
                            day: "numeric",
                          },
                        )}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-text-light/70">
                        {cut.total_orders}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-text-light/70">
                        ${ventaBruta.toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-text-light font-bold">
                        ${Number(cut.venta_neta).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-amber-400/80">
                        ${Number(cut.iva_acumulado).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-red-400">
                        -${Number(cut.total_gastos).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-right font-mono text-blue-400/80">
                        {Number(cut.comision_tarjeta || 0) > 0
                          ? `-$${Number(cut.comision_tarjeta).toFixed(2)}`
                          : "$0.00"}
                      </td>
                      <td
                        className={`py-3.5 px-3 text-right font-mono font-black ${
                          Number(cut.utilidad_final) >= 0
                            ? "text-emerald-400"
                            : "text-red-400"
                        }`}
                      >
                        ${Number(cut.utilidad_final).toFixed(2)}
                      </td>
                      <td className="py-3.5 px-3 text-center">
                        <button
                          type="button"
                          onClick={() => onViewCutDetail(cut)}
                          className="inline-flex items-center gap-1 bg-white/5 hover:bg-white/10 text-text-light px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors cursor-pointer"
                        >
                          <Receipt className="h-3 w-3 text-blue-400" />
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>

            <TablePagination
              currentPage={cutsPage}
              totalPages={cutsTotalPages}
              totalItems={sortedDailyCuts.length}
              pageSize={cutsPageSize}
              onPageChange={onPageChange}
              onPageSizeChange={onPageSizeChange}
            />
          </div>
        )}
      </section>

      {/* MODAL DETALLE DE CORTE AUTOCONTENIDO */}
      {props.onViewCutDetail === undefined && (
        <DailyCutDetailModal
          cut={internalHook.selectedCutDetail}
          onClose={() => internalHook.setSelectedCutDetail(null)}
        />
      )}
    </>
  );
}
