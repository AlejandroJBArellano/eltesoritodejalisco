import React from "react";
import type { StatCardProps } from "./types";

export function StatCard({
  title,
  icon: Icon,
  value,
  themeClass,
}: StatCardProps) {
  return (
    <div className="group relative rounded-xl bg-card p-3.5 sm:p-5 border border-border transition-all duration-150 hover:border-border/80 hover:bg-card/95 flex flex-col justify-between">
      <div className="flex items-center justify-between gap-2">
        <span className="text-[11px] font-semibold text-text-light/60 uppercase tracking-wider block truncate">
          {title}
        </span>
        <div
          className={`rounded-lg p-1.5 sm:p-2 ${themeClass} shrink-0 transition-transform duration-150 group-hover:scale-105`}
        >
          <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
        </div>
      </div>
      <div className="mt-2 sm:mt-3 flex items-baseline justify-between min-w-0">
        <p className="text-xl sm:text-3xl font-bold text-text-light tracking-tight tabular-nums font-mono truncate">
          {value}
        </p>
      </div>
    </div>
  );
}
