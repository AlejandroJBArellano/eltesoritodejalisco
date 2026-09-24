import { ArrowUpRight, ChevronRight } from "lucide-react";
import Link from "next/link";
import React from "react";
import type { ModuleCardProps } from "./types";

export function ModuleCard({
  title,
  href,
  icon: Icon,
  themeClass,
  hoverColor,
  target,
}: ModuleCardProps) {
  const isExternal = target === "_blank" || href.startsWith("http");

  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className="group cursor-pointer focus:outline-none block h-full"
    >
      <div className="h-full rounded-xl bg-card px-3.5 py-3 sm:px-4 sm:py-3.5 border border-border transition-all duration-150 hover:border-primary/40 hover:bg-card/90 active:scale-[0.99] flex items-center justify-between gap-2.5 sm:gap-3 shadow-sm">
        {/* Left: Icon + Title */}
        <div className="flex items-center gap-2.5 sm:gap-3 min-w-0 flex-1">
          <div
            className={`rounded-lg p-2 border border-border/40 ${themeClass} shrink-0 transition-colors flex items-center justify-center`}
          >
            <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0 flex-1">
            <h3
              className="text-xs sm:text-sm font-semibold text-text-light truncate transition-colors group-hover:text-primary"
              style={{ "--hover-color": hoverColor } as React.CSSProperties}
            >
              {title}
            </h3>
          </div>
        </div>

        {/* Right: Chevron / Arrow */}
        <div className="shrink-0 flex items-center">
          {isExternal ? (
            <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-light/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
          ) : (
            <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-light/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
          )}
        </div>
      </div>
    </Link>
  );
}
