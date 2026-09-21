import React from "react";
import Link from "next/link";
import { AlertTriangle, Package, ArrowRight } from "lucide-react";
import type { LowStockIngredient } from "./types";

export interface InventoryAlertBannerProps {
  alerts: LowStockIngredient[];
}

export function InventoryAlertBanner({ alerts }: InventoryAlertBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  const outOfStockCount = alerts.filter((i) => i.current_stock <= 0).length;
  const lowStockCount = alerts.filter((i) => i.current_stock > 0).length;

  return (
    <div className="rounded-xl border border-rose-500/25 bg-rose-500/4 overflow-hidden mb-4 sm:mb-6 shadow-xs">
      <div className="flex items-center justify-between px-4 py-3 sm:px-5 sm:py-3.5 border-b border-rose-500/15 gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-rose-500/15 text-rose-400 shrink-0">
            <AlertTriangle className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <p className="text-xs font-bold uppercase tracking-wider text-rose-400 truncate">
              Alerta de Inventario
            </p>
            <p className="text-[11px] text-text-light/50 font-medium truncate">
              {outOfStockCount} agotado(s) · {lowStockCount} bajo mínimo
            </p>
          </div>
        </div>
        <Link
          href="/inventario"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-rose-300 hover:text-rose-200 border border-rose-500/30 hover:border-rose-500/50 bg-rose-500/10 hover:bg-rose-500/20 px-3 py-1.5 rounded-lg transition-all active:scale-[0.98] shrink-0"
        >
          <span>Ver Inventario</span>
          <ArrowRight className="h-3.5 w-3.5" />
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 px-4 py-3 sm:px-5 sm:py-3.5 bg-black/10">
        {alerts.map((ing) => {
          const isOut = ing.current_stock <= 0;
          return (
            <div
              key={ing.id}
              className={`inline-flex items-center gap-2 rounded-lg px-2.5 py-1 border text-xs ${
                isOut
                  ? "bg-rose-500/10 border-rose-500/25 text-rose-300"
                  : "bg-amber-500/10 border-amber-500/25 text-amber-300"
              }`}
            >
              <Package
                className={`h-3.5 w-3.5 shrink-0 ${isOut ? "text-rose-400" : "text-amber-400"}`}
              />
              <span className="font-semibold">{ing.name}</span>
              <span className="tabular-nums font-mono font-bold">
                {ing.current_stock}{" "}
                <span className="font-normal opacity-70">
                  / {ing.minimum_stock} mín
                </span>
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
