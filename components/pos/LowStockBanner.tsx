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
    <div className="rounded-2xl border border-amber-500/30 bg-amber-500/5 overflow-hidden">
      {/* Header row */}
      <button
        type="button"
        onClick={() => setExpanded((p) => !p)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-amber-500/10 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-amber-500/15">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs font-black uppercase tracking-wider text-amber-400">
              Alertas de Stock
            </span>
            {outOfStock.length > 0 && (
              <span className="rounded-full bg-red-500/15 border border-red-500/30 px-2 py-0.5 text-[10px] font-black text-red-400 uppercase tracking-widest">
                {outOfStock.length} agotado{outOfStock.length > 1 ? "s" : ""}
              </span>
            )}
            {lowStock.length > 0 && (
              <span className="rounded-full bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 text-[10px] font-black text-amber-400 uppercase tracking-widest">
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
        <div className="px-4 pb-4 space-y-2 border-t border-amber-500/20 pt-3">
          {outOfStock.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-red-400 mb-1.5">
                Agotados
              </p>
              <div className="flex flex-wrap gap-2">
                {outOfStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 rounded-xl bg-red-500/10 border border-red-500/20 px-3 py-1.5"
                  >
                    <Package className="h-3 w-3 text-red-400" />
                    <span className="text-xs font-bold text-red-300">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-black text-red-400 tabular-nums">
                      {item.currentStock} uds
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          {lowStock.length > 0 && (
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-amber-400 mb-1.5">
                Stock Bajo
              </p>
              <div className="flex flex-wrap gap-2">
                {lowStock.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center gap-1.5 rounded-xl bg-amber-500/10 border border-amber-500/20 px-3 py-1.5"
                  >
                    <Package className="h-3 w-3 text-amber-400" />
                    <span className="text-xs font-bold text-amber-300">
                      {item.name}
                    </span>
                    <span className="text-[10px] font-black text-amber-400 tabular-nums">
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
