"use client";

import React from "react";
import { Store } from "lucide-react";
import type { ReportData } from "./types";

export interface SalesSourceCardProps {
  salesBySource: ReportData["salesBySource"];
}

export function SalesSourceCard({ salesBySource = {} }: SalesSourceCardProps) {
  const sources = Object.entries(salesBySource || {});

  return (
    <section className="rounded-2xl bg-card p-6 sm:p-8 shadow-sm border border-border">
      <div className="mb-6 flex items-center justify-between border-b border-border pb-3">
        <h2 className="text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
          <Store className="h-5 w-5 text-secondary" />
          Ventas por Canal / Fuente
        </h2>
      </div>

      <div className="space-y-4">
        {sources.map(([source, stats]) => (
          <div
            key={source}
            className="p-4 rounded-xl bg-dark/40 border border-border flex items-center justify-between"
          >
            <div className="flex items-center gap-3">
              <div className="rounded-lg bg-secondary/10 p-2.5 text-secondary">
                <Store className="h-4 w-4" />
              </div>
              <div>
                <span className="font-bold text-text-light uppercase text-sm block">
                  {source}
                </span>
                <span className="text-xs text-text-light/40 font-medium">
                  {stats.count} órdenes procesadas
                </span>
              </div>
            </div>
            <div className="text-right">
              <p className="text-base font-black text-text-light">
                $
                {(stats.total || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                })}
              </p>
            </div>
          </div>
        ))}
        {sources.length === 0 && (
          <p className="py-8 text-center text-xs font-bold text-text-light/40 uppercase tracking-widest">
            No hay fuentes registradas.
          </p>
        )}
      </div>
    </section>
  );
}
