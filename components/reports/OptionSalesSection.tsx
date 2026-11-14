"use client";

import React, { useEffect, useMemo, useState } from "react";
import { SlidersHorizontal } from "lucide-react";
import { ExportButton, type ExportColumn } from "@/components/ui/DataTableControls";
import { useReportsContextNullable } from "./ReportsContext";
import type { OptionSalesRow } from "@/lib/services/optionReports";

type ChannelFilter = "ALL" | "POS" | "PICKUP";

interface ViewRow extends OptionSalesRow {
  viewUnits: number;
  viewRevenue: number;
}

const EXPORT_COLUMNS: ExportColumn<ViewRow>[] = [
  { header: "Producto", key: "productName" },
  { header: "Grupo", key: "groupName" },
  { header: "Opción", key: "optionName" },
  { header: "Unidades", key: "viewUnits" },
  { header: "Ingreso por opción", accessor: (r) => `$${r.viewRevenue.toFixed(2)}` },
  { header: "Unidades POS", accessor: (r) => r.byChannel.POS.units },
  { header: "Unidades Pickup", accessor: (r) => r.byChannel.PICKUP.units },
  { header: "Órdenes", key: "orders" },
];

const selectClass =
  "rounded-lg border border-border bg-dark/40 px-3 py-2 text-xs font-semibold text-text-light outline-none focus:border-primary";

/** Ventas por opción de personalización (respeta el periodo de reportes). */
export function OptionSalesSection() {
  const context = useReportsContextNullable();
  const period = context?.period ?? "7days";
  const customStart = context?.customStartDate ?? "";
  const customEnd = context?.customEndDate ?? "";

  const [rows, setRows] = useState<OptionSalesRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [product, setProduct] = useState("ALL");
  const [group, setGroup] = useState("ALL");
  const [channel, setChannel] = useState<ChannelFilter>("ALL");

  useEffect(() => {
    if (period === "custom" && (!customStart || !customEnd)) return;
    let cancelled = false;
    (async () => {
      try {
        setLoading(true);
        setError(null);
        let url = `/api/reports/options?period=${period}`;
        if (period === "custom") {
          url += `&startDate=${customStart}&endDate=${customEnd}`;
        }
        const response = await fetch(url);
        const data = await response.json();
        if (!response.ok) throw new Error(data?.error || "Error al cargar");
        if (!cancelled) setRows(Array.isArray(data.rows) ? data.rows : []);
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : "Error al cargar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [period, customStart, customEnd]);

  const products = useMemo(
    () =>
      Array.from(new Map(rows.map((r) => [r.menuItemId, r.productName])).entries()),
    [rows],
  );
  const groups = useMemo(
    () =>
      Array.from(
        new Set(
          rows
            .filter((r) => product === "ALL" || r.menuItemId === product)
            .map((r) => r.groupName),
        ),
      ),
    [rows, product],
  );

  const viewRows = useMemo<ViewRow[]>(
    () =>
      rows
        .filter((r) => product === "ALL" || r.menuItemId === product)
        .filter((r) => group === "ALL" || r.groupName === group)
        .map((r) => ({
          ...r,
          viewUnits: channel === "ALL" ? r.units : r.byChannel[channel].units,
          viewRevenue: channel === "ALL" ? r.revenue : r.byChannel[channel].revenue,
        }))
        .filter((r) => r.viewUnits > 0)
        .sort((a, b) => b.viewUnits - a.viewUnits || b.viewRevenue - a.viewRevenue),
    [rows, product, group, channel],
  );

  const totals = viewRows.reduce(
    (acc, r) => ({ units: acc.units + r.viewUnits, revenue: acc.revenue + r.viewRevenue }),
    { units: 0, revenue: 0 },
  );
  const maxUnits = viewRows[0]?.viewUnits ?? 0;
  const currentDateStr = new Date().toISOString().split("T")[0];

  return (
    <section className="rounded-xl border border-border bg-card p-6 shadow-sm sm:p-8">
      <div className="mb-6 flex flex-col gap-4 border-b border-border pb-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="flex items-center gap-2 text-lg font-bold uppercase tracking-tight text-text-light">
            <SlidersHorizontal className="h-4 w-4 text-primary" />
            Opciones de personalización
          </h2>
          <p className="mt-1 text-xs font-medium text-text-light/60">
            Unidades e ingreso extra por opción (incluye las vendidas dentro de
            platillos personalizables).
          </p>
        </div>
        <ExportButton
          data={viewRows}
          columns={EXPORT_COLUMNS}
          filename={() => `opciones_${period}_${currentDateStr}`}
          sheetName="Opciones"
        />
      </div>

      <div className="mb-5 flex flex-wrap gap-3">
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-text-light/60">
          Producto
          <select
            className={selectClass}
            value={product}
            onChange={(e) => {
              setProduct(e.target.value);
              setGroup("ALL");
            }}
          >
            <option value="ALL">Todos</option>
            {products.map(([id, name]) => (
              <option key={id} value={id}>
                {name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-text-light/60">
          Grupo
          <select className={selectClass} value={group} onChange={(e) => setGroup(e.target.value)}>
            <option value="ALL">Todos</option>
            {groups.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-[11px] font-bold uppercase tracking-wider text-text-light/60">
          Canal
          <select
            className={selectClass}
            value={channel}
            onChange={(e) => setChannel(e.target.value as ChannelFilter)}
          >
            <option value="ALL">POS + Pickup</option>
            <option value="POS">POS</option>
            <option value="PICKUP">Pickup</option>
          </select>
        </label>
      </div>

      {loading ? (
        <p className="py-8 text-center text-xs font-bold uppercase tracking-wider text-text-light/50">
          Cargando opciones…
        </p>
      ) : error ? (
        <p className="py-8 text-center text-xs font-bold text-red-400">{error}</p>
      ) : viewRows.length === 0 ? (
        <p className="py-8 text-center text-sm text-text-light/50">
          Sin opciones vendidas en este periodo.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead>
              <tr className="border-b border-border bg-dark/40 text-xs font-black uppercase tracking-wider text-text-light/60">
                <th scope="col" className="px-3 py-3">Opción</th>
                <th scope="col" className="px-3 py-3">Producto · Grupo</th>
                <th scope="col" className="px-3 py-3 text-right">Unidades</th>
                <th scope="col" className="px-3 py-3 text-right">Ingreso extra</th>
                <th scope="col" className="px-3 py-3 text-right">POS / Pickup</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {viewRows.map((r) => (
                <tr key={r.key} className="hover:bg-dark/30">
                  <td className="px-3 py-3">
                    <p className="font-bold text-text-light">{r.optionName}</p>
                    <div className="mt-1 h-1 rounded-full bg-dark/60" aria-hidden>
                      <div
                        className="h-1 rounded-full bg-primary"
                        style={{ width: `${maxUnits ? (r.viewUnits / maxUnits) * 100 : 0}%` }}
                      />
                    </div>
                  </td>
                  <td className="px-3 py-3 text-xs text-text-light/70">
                    {r.productName} · {r.groupName}
                  </td>
                  <td className="px-3 py-3 text-right font-mono font-bold tabular-nums text-text-light">
                    {r.viewUnits}
                  </td>
                  <td className="px-3 py-3 text-right font-mono tabular-nums text-emerald-400">
                    ${r.viewRevenue.toFixed(2)}
                  </td>
                  <td className="px-3 py-3 text-right font-mono text-xs tabular-nums text-text-light/60">
                    {r.byChannel.POS.units} / {r.byChannel.PICKUP.units}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="border-t border-border text-xs font-black uppercase text-text-light/70">
                <td className="px-3 py-3" colSpan={2}>Total</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums">{totals.units}</td>
                <td className="px-3 py-3 text-right font-mono tabular-nums text-emerald-400">
                  ${totals.revenue.toFixed(2)}
                </td>
                <td />
              </tr>
            </tfoot>
          </table>
        </div>
      )}
    </section>
  );
}
