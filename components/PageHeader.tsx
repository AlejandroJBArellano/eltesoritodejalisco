"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

interface PageHeaderProps {
  title: string;
  subtitle?: string;
  badgeColor?: string;
  icon?: React.ReactNode;
  backHref?: string;
  backLabel?: string;
  showBack?: boolean;
  actions?: React.ReactNode;
  extra?: React.ReactNode;
}

export function PageHeader({
  title,
  subtitle,
  badgeColor = "bg-primary",
  icon,
  backHref = "/",
  backLabel = "Dashboard",
  showBack = true,
  actions,
  extra,
}: PageHeaderProps) {
  return (
    <header className="bg-background/90 backdrop-blur-md sticky top-0 z-30 border-b border-border/80 no-print">
      <div className="mx-auto max-w-7xl px-4 py-3.5 sm:px-6 lg:px-8 space-y-2.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            {showBack && (
              <>
                <Link
                  href={backHref}
                  className="group flex items-center gap-1.5 text-xs font-semibold text-text-light/60 hover:text-primary transition-colors shrink-0"
                >
                  <ArrowLeft className="h-3.5 w-3.5 transition-transform group-hover:-translate-x-0.5" />
                  <span>{backLabel}</span>
                </Link>
                <span
                  className="w-px h-3.5 bg-border/80 shrink-0"
                  aria-hidden="true"
                />
              </>
            )}
            <div>
              <h1 className="text-base sm:text-lg font-bold text-text-light tracking-tight uppercase flex items-center gap-2">
                {icon ? (
                  icon
                ) : (
                  <span
                    className={`h-2 w-2 rounded-full ${badgeColor} shrink-0`}
                  />
                )}
                <span>{title}</span>
              </h1>
              {subtitle && (
                <p className="text-xs text-text-light/50 font-normal mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && (
            <div className="flex items-center gap-2 flex-wrap">{actions}</div>
          )}
        </div>

        {extra && <div className="pt-0.5">{extra}</div>}
      </div>
    </header>
  );
}
