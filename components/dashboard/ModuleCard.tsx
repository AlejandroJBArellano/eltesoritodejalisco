import React from "react";
import Link from "next/link";
import { ChevronRight, ArrowUpRight } from "lucide-react";
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
  const isExternal = target === "_blank" || href.startsWith("http");

  return (
    <Link
      href={href}
      target={target}
      rel={target === "_blank" ? "noopener noreferrer" : undefined}
      className="group cursor-pointer focus:outline-none block h-full"
    >
      <div className="h-full rounded-xl bg-card p-3.5 sm:p-5 border border-border transition-all duration-150 hover:border-primary/40 hover:bg-card/90 active:scale-[0.99] flex flex-col justify-between">
        <div>
          {/* Header: Icon + Micro-Badge */}
          <div className="flex items-center justify-between gap-2 mb-2 sm:mb-3">
            <div
              className={`rounded-lg p-2 border border-border/40 ${themeClass} shrink-0 transition-colors`}
            >
              <Icon className="h-4 w-4 sm:h-5 sm:w-5" />
            </div>
            {badge && (
              <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] sm:text-xs font-medium bg-background/80 border border-border/60 text-text-light/80">
                <span className="h-1.5 w-1.5 rounded-full bg-current opacity-80" />
                <span>{badge}</span>
              </div>
            )}
          </div>

          {/* Title & Arrow */}
          <h3
            className="text-xs sm:text-base font-semibold text-text-light transition-colors flex items-center justify-between gap-1 group-hover:text-primary"
            style={{ "--hover-color": hoverColor } as React.CSSProperties}
          >
            <span className="truncate">{title}</span>
            {isExternal ? (
              <ArrowUpRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-light/30 group-hover:text-primary group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all shrink-0" />
            ) : (
              <ChevronRight className="h-3.5 w-3.5 sm:h-4 sm:w-4 text-text-light/30 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0" />
            )}
          </h3>

          {/* Description */}
          {description && (
            <p className="mt-1 text-[11px] sm:text-xs text-text-light/60 font-normal leading-relaxed line-clamp-2">
              {description}
            </p>
          )}
        </div>
      </div>
    </Link>
  );
}
