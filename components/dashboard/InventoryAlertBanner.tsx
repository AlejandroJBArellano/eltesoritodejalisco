import React from "react";
import Link from "next/link";
import { AlertTriangle, Package } from "lucide-react";
import type { LowStockIngredient } from "./types";

export interface InventoryAlertBannerProps {
  alerts: LowStockIngredient[];
}

export function InventoryAlertBanner({ alerts }: InventoryAlertBannerProps) {
  if (!alerts || alerts.length === 0) return null;

  const outOfStockCount = alerts.filter((i) => i.current_stock <= 0).length;
  const lowStockCount = alerts.filter((i) => i.current_stock > 0).length;

  return (
    <div className="rounded-2xl border border-red-500/25 bg-red-500/5 overflow-hidden mb-2 sm:mb-6">
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-red-500/15">
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-red-500/15">
            <AlertTriangle className="h-4 w-4 text-red-400" />
          </span>
          <div>
            <p className="text-xs font-black uppercase tracking-wider text-red-400">
              Alerta de Inventario
            </p>
            <p className="text-[11px] text-text-light/40 font-medium">
              {outOfStockCount} agotado(s) · {lowStockCount} bajo mínimo
            </p>
          </div>
        </div>
        <Link
          href="/inventario"
          className="text-[11px] font-black uppercase tracking-wider text-red-400 hover:text-red-300 border border-red-500/30 hover:border-red-500/50 bg-red-500/10 hover:bg-red-500/20 px-3 py-1.5 rounded-xl transition-all"
        >
          Ver Inventario →
        </Link>
      </div>
      <div className="flex flex-wrap gap-2 px-5 py-3.5">
        {alerts.map((ing) => {
          const isOut = ing.current_stock <= 0;
          return (
            <div
              key={ing.id}
              className={`flex items-center gap-2 rounded-xl px-3 py-1.5 border text-xs ${
                isOut
                  ? "bg-red-500/10 border-red-500/20"
                  : "bg-amber-500/10 border-amber-500/20"
              }`}
            >
              <Package
                className={`h-3 w-3 ${isOut ? "text-red-400" : "text-amber-400"}`}
              />
              <span
                className={`font-bold ${isOut ? "text-red-300" : "text-amber-300"}`}
              >
                {ing.name}
              </span>
              <span
                className={`tabular-nums font-black ${isOut ? "text-red-400" : "text-amber-400"}`}
              >
                {ing.current_stock}{" "}
                <span className="font-medium opacity-70">
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
