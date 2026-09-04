import React from "react";
import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ModuleCardProps } from "./types";

export function ModuleCard({
  title,
  description,
  href,
  icon: Icon,
  themeClass,
  hoverColor,
  badge,
  target,
}: ModuleCardProps) {
  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className="group cursor-pointer focus:outline-none"
    >
      <div className="h-full rounded-2xl bg-card p-3 sm:p-8 shadow-sm border border-border transition-all hover:shadow-xl hover:-translate-y-1 hover:border-border/15 flex flex-col justify-between min-h-22.5 sm:min-h-0">
        <div>
          {/* Top section: Icon + Badge */}
          <div className="mb-2 sm:mb-6 flex items-center justify-between">
            <div className={`rounded-lg p-1.5 sm:p-3 ${themeClass}`}>
              <Icon className="h-4 w-4 sm:h-7 sm:w-7" />
            </div>
            {badge && (
              <span
                className={`rounded-full px-1.5 py-0.5 sm:px-4 sm:py-1 text-[8px] sm:text-xs font-black uppercase tracking-widest ${themeClass}`}
              >
                {badge}
              </span>
            )}
          </div>

          {/* Content: Title */}
          <h3
            className="text-xs sm:text-xl font-black text-text-light tracking-tight uppercase transition-colors flex items-center justify-between"
            style={{ "--hover-color": hoverColor } as React.CSSProperties}
          >
            <span className="group-hover:text-(--hover-color) transition-colors truncate">
              {title}
            </span>
            <ArrowUpRight className="hidden sm:block h-4 w-4 opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </h3>

          {/* Description (desktop-only) */}
          <p className="hidden sm:block mt-2 text-sm text-text-light/60 font-medium leading-relaxed">
            {description}
          </p>
        </div>
      </div>
    </Link>
  );
}
