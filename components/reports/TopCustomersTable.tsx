"use client";

import React from "react";
import { Users } from "lucide-react";
import { ExportButton } from "@/components/ui/DataTableControls";
import { TOP_CUSTOMERS_EXPORT_COLUMNS } from "./exportColumns";
import type { Period, ReportData } from "./types";

export interface TopCustomersTableProps {
  topCustomers: ReportData["customers"]["topCustomers"];
  period: Period;
}

export function TopCustomersTable({
  topCustomers = [],
  period,
}: TopCustomersTableProps) {
  const currentDateStr = new Date().toISOString().split("T")[0];

  return (
    <section className="rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-border">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
          <Users className="h-5 w-5 text-primary" />
          Mejores Clientes
        </h2>
        <ExportButton
          data={topCustomers}
          columns={TOP_CUSTOMERS_EXPORT_COLUMNS}
          filename={() => `mejores_clientes_${period}_${currentDateStr}`}
          sheetName="Mejores Clientes"
        />
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-xs font-black text-text-light/40 uppercase tracking-wider">
              <th scope="col" className="py-3 px-3">
                Cliente
              </th>
              <th scope="col" className="py-3 px-3 text-right">
                Gasto Total
              </th>
              <th scope="col" className="py-3 px-3 text-right">
                Puntos Lealtad
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {topCustomers.map((customer, index) => {
              const name = customer.name || "Cliente";
              const totalSpend =
                customer.totalSpend ??
                (customer as unknown as { total_spend?: number }).total_spend ??
                0;
              const loyaltyPoints =
                customer.loyaltyPoints ??
                (customer as unknown as { loyalty_points?: number })
                  .loyalty_points ??
                0;

              return (
                <tr key={index} className="hover:bg-white/5 transition-colors">
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-3">
                      <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-primary/10 text-xs font-black text-primary">
                        {name.substring(0, 2).toUpperCase()}
                      </span>
                      <span className="font-bold text-text-light uppercase">
                        {name}
                      </span>
                    </div>
                  </td>
                  <td className="py-3.5 px-3 text-right text-base font-black text-emerald-400">
                    ${Number(totalSpend).toFixed(2)}
                  </td>
                  <td className="py-3.5 px-3 text-right">
                    <span className="inline-flex items-center rounded-full bg-purple-500/10 px-3 py-1 text-xs font-black text-purple-400 uppercase tracking-widest border border-purple-500/20">
                      {loyaltyPoints} pts
                    </span>
                  </td>
                </tr>
              );
            })}
            {topCustomers.length === 0 && (
              <tr>
                <td
                  colSpan={3}
                  className="py-8 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest"
                >
                  No hay clientes registrados en este período.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
