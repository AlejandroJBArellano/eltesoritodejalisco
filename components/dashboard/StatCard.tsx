import React from "react";
import type { StatCardProps } from "./types";

export function StatCard({
  title,
  icon: Icon,
  value,
  themeClass,
}: StatCardProps) {
  return (
    <div className="rounded-2xl bg-card p-3 sm:p-6 shadow-sm border border-border transition-all hover:border-border/15">
      <div className="flex items-center justify-between sm:items-start gap-1">
        <div className="min-w-0">
          <span className="text-[9px] sm:text-xs font-bold text-text-light/50 uppercase tracking-wider block truncate">
            {title}
          </span>
          <p className="mt-0.5 sm:mt-3 text-base sm:text-3xl font-black text-text-light tracking-tight tabular-nums truncate">
            {value}
          </p>
        </div>
        <div
          className={`rounded-lg p-1.5 sm:p-3 ${themeClass} shrink-0 sm:-mt-1`}
        >
          <Icon className="h-3.5 w-3.5 sm:h-5 sm:w-5" />
        </div>
      </div>
    </div>
  );
}
