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
    <header className="bg-[#121212]/90 backdrop-blur-md sticky top-0 z-30 border-b border-white/5 no-print">
      <div className="mx-auto max-w-7xl px-4 py-4 sm:px-6 lg:px-8 space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            {showBack && (
              <>
                <Link
                  href={backHref}
                  className="group flex items-center gap-1.5 text-xs font-bold text-[#E0E0E0]/60 hover:text-primary transition-colors shrink-0"
                >
                  <ArrowLeft className="h-4 w-4 transition-transform group-hover:-translate-x-0.5" />
                  {backLabel}
                </Link>
                <span className="w-px h-4 bg-white/10 shrink-0" aria-hidden="true" />
              </>
            )}
            <div>
              <h1 className="text-lg sm:text-xl font-black text-[#E0E0E0] tracking-tight uppercase flex items-center gap-2">
                {icon ? (
                  icon
                ) : (
                  <span className={`h-2.5 w-2.5 rounded-full ${badgeColor} shrink-0`} />
                )}
                {title}
              </h1>
              {subtitle && (
                <p className="text-xs text-[#E0E0E0]/50 font-medium mt-0.5">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {actions && <div className="flex items-center gap-2.5 flex-wrap">{actions}</div>}
        </div>

        {extra && <div className="pt-1">{extra}</div>}
      </div>
    </header>
  );
}
