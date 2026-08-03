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
    <div className="mb-6 sm:mb-10">
      {/* Header Row: Clickable to toggle collapse state */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        className="mb-4 sm:mb-6 flex items-center justify-between border-b border-border pb-2 cursor-pointer sm:cursor-default select-none group/header"
      >
        <h2 className="text-base sm:text-lg font-black text-text-light tracking-tight uppercase flex items-center gap-2">
          {dotColorClass && (
            <span className={`h-2 w-2 rounded-full ${dotColorClass}`}></span>
          )}
          <span>{title}</span>
        </h2>

        {/* Chevron icon visible only on mobile */}
        <div className="sm:hidden text-text-light/40 group-hover/header:text-text-light transition-colors">
          <ChevronDown
            className={`h-5 w-5 transition-transform duration-200 ${
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
