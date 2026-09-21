"use client";

import React, { useState } from "react";
import { ChevronDown } from "lucide-react";

interface CollapsibleSectionProps {
  title: string;
  dotColorClass?: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

export default function CollapsibleSection({
  title,
  dotColorClass,
  defaultOpen = true,
  children,
}: CollapsibleSectionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="mb-6 sm:mb-8">
      {/* Header Row: Clickable to toggle collapse state */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="mb-3 sm:mb-4 flex items-center justify-between border-b border-border/80 pb-2.5 cursor-pointer sm:cursor-default select-none group/header"
      >
        <h2 className="text-xs sm:text-sm font-bold text-text-light/90 uppercase tracking-wider flex items-center gap-2">
          {dotColorClass && (
            <span
              className={`h-1.5 w-1.5 rounded-full ${dotColorClass} shrink-0`}
            />
          )}
          <span>{title}</span>
        </h2>

        {/* Chevron icon visible only on mobile */}
        <div className="sm:hidden text-text-light/40 group-hover/header:text-text-light transition-colors">
          <ChevronDown
            className={`h-4 w-4 transition-transform duration-200 ${
              isOpen ? "rotate-180" : ""
            }`}
          />
        </div>
      </div>

      {/* Content wrapper: toggled on mobile, always visible on desktop */}
      <div className={`${isOpen ? "block" : "hidden"} sm:block`}>
        {children}
      </div>
    </div>
  );
}
