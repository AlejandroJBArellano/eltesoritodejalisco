"use client";

import { useState } from "react";
import { AlertTriangle, ChevronDown, ChevronUp, Package } from "lucide-react";
import type { MenuItem } from "@/types/pos";

interface LowStockBannerProps {
  items: MenuItem[];
}

export function LowStockBanner({ items }: LowStockBannerProps) {
  const [expanded, setExpanded] = useState(false);

  if (items.length === 0) return null;

  const outOfStock = items.filter(
    (i) => i.currentStock != null && i.currentStock <= 0,
  );
  const lowStock = items.filter(
    (i) =>
      i.currentStock != null &&
      i.currentStock > 0 &&
      i.minimumStock != null &&
      i.currentStock <= i.minimumStock,
  );

  return (
    <div className="rounded-xl border border-amber-500/25 bg-amber-500/4 overflow-hidden shadow-xs">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-3.5 py-2.5 hover:bg-amber-500/10 transition-colors cursor-pointer"
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-500/15 text-amber-400 shrink-0">
            <AlertTriangle className="h-3.5 w-3.5" />
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-bold uppercase tracking-wider text-amber-400">
              Alertas de Stock
            </span>
            {outOfStock.length > 0 && (
              <span className="rounded-md bg-rose-500/15 border border-rose-500/30 px-1.5 py-0.5 text-[10px] font-bold text-rose-300 uppercase tracking-wider">
                {outOfStock.length} agotado{outOfStock.length > 1 ? "s" : ""}
              </span>
            )}
            {lowStock.length > 0 && (
              <span className="rounded-md bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 text-[10px] font-bold text-amber-300 uppercase tracking-wider">
                {lowStock.length} bajo{lowStock.length > 1 ? "s" : ""}
              </span>
            )}
          </div>
        </div>
        {expanded ? (
          <ChevronUp className="h-4 w-4 text-amber-400/60 shrink-0" />
        ) : (
          <ChevronDown className="h-4 w-4 text-amber-400/60 shrink-0" />
        )}
      </button>

      {/* Expanded detail */}
      {expanded && (
        <div className="px-3.5 pb-3 space-y-2.5 border-t border-amber-500/20 pt-2.5 bg-black/10">
          {outOfStock.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-rose-400 mb-1.5">
                Agotados
              </p>
              <div className="flex flex-wrap gap-1.5">
                {outOfStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 rounded-lg bg-rose-500/10 border border-rose-500/20 px-2.5 py-1"
                  >
                    <Package className="h-3 w-3 text-rose-400" />
                    <span className="text-xs font-medium text-rose-300">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-rose-400 tabular-nums">
                      {item.currentStock} uds
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lowStock.length > 0 && (
            <div>
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-400 mb-1.5">
                Stock Bajo
              </p>
              <div className="flex flex-wrap gap-1.5">
                {lowStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 px-2.5 py-1"
                  >
                    <Package className="h-3 w-3 text-amber-400" />
                    <span className="text-xs font-medium text-amber-300">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-mono font-bold text-amber-400 tabular-nums">
                      {item.currentStock} / {item.minimumStock} mín
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
