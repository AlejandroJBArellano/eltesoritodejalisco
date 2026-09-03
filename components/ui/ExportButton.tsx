"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import {
  Download,
  FileSpreadsheet,
  FileText,
  ChevronDown,
} from "lucide-react";
import {
  exportToCSV,
  exportToExcel,
  type ExportColumn,
} from "@/lib/export";

export interface ExportButtonProps<T> {
  data: T[];
  columns: ExportColumn<T>[];
  filename: string | (() => string);
  sheetName?: string;
  label?: string;
  disabled?: boolean;
  className?: string;
  variant?: "default" | "primary" | "ghost" | "outline";
  align?: "left" | "right";
}

export function ExportButton<T>({
  data,
  columns,
  filename,
  sheetName = "Datos",
  label = "Exportar",
  disabled = false,
  className = "",
  variant = "default",
  align = "right",
}: ExportButtonProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const getResolvedFilename = useCallback((): string => {
    return typeof filename === "function" ? filename() : filename;
  }, [filename]);

  // Close dropdown on click outside
  useEffect(() => {
    if (!isOpen) return;

    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [isOpen]);

  const handleExportCSV = () => {
    exportToCSV({
      filename: getResolvedFilename(),
      columns,
      data,
    });
    setIsOpen(false);
  };

  const handleExportExcel = () => {
    exportToExcel({
      filename: getResolvedFilename(),
      columns,
      data,
      sheetName,
    });
    setIsOpen(false);
  };

  // Base button style variants
  const variantStyles = {
    default:
      "bg-dark/40 border border-border text-text-light hover:bg-card hover:text-white focus-visible:ring-primary",
    primary:
      "bg-primary text-black hover:brightness-105 shadow-md shadow-primary/20 focus-visible:ring-white",
    ghost:
      "bg-transparent text-text-light/70 hover:bg-white/5 hover:text-text-light border border-transparent focus-visible:ring-primary",
    outline:
      "bg-transparent border border-border text-text-light hover:bg-white/5 hover:text-white focus-visible:ring-primary",
  };

  const isButtonDisabled = disabled;

  return (
    <div className={`relative inline-block text-left ${className}`} ref={dropdownRef}>
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        disabled={isButtonDisabled}
        aria-haspopup="true"
        aria-expanded={isOpen}
        className={`flex items-center gap-2 rounded-xl px-3 py-1.5 text-xs font-black uppercase tracking-wider transition-all duration-150 cursor-pointer select-none active:scale-95 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 outline-none focus-visible:ring-2 ${
          variantStyles[variant]
        }`}
      >
        <Download className="h-3.5 w-3.5 shrink-0" />
        <span>{label}</span>
        <ChevronDown
          className={`h-3 w-3 shrink-0 opacity-60 transition-transform duration-200 ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div
          role="menu"
          aria-orientation="vertical"
          className={`absolute z-50 mt-1.5 w-56 rounded-2xl border border-border bg-card p-1.5 shadow-2xl backdrop-blur-md animate-in fade-in zoom-in-95 duration-150 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="px-2.5 py-1.5 text-[10px] font-black uppercase tracking-widest text-text-light/40 border-b border-border/60 mb-1">
            Formato de Exportación ({data.length} filas)
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={handleExportExcel}
            className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/5 group cursor-pointer"
          >
            <div className="rounded-lg bg-emerald-500/10 p-1.5 text-emerald-400 group-hover:bg-emerald-500/20 transition-colors shrink-0">
              <FileSpreadsheet className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-light group-hover:text-white">
                Excel (.xls)
              </p>
              <p className="text-[10px] text-text-light/50 font-normal">
                Con formato y tipado de celdas
              </p>
            </div>
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleExportCSV}
            className="flex w-full items-start gap-2.5 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-white/5 group cursor-pointer"
          >
            <div className="rounded-lg bg-blue-500/10 p-1.5 text-blue-400 group-hover:bg-blue-500/20 transition-colors shrink-0">
              <FileText className="h-4 w-4" />
            </div>
            <div>
              <p className="text-xs font-bold text-text-light group-hover:text-white">
                CSV (.csv)
              </p>
              <p className="text-[10px] text-text-light/50 font-normal">
                Texto plano UTF-8 universal
              </p>
            </div>
          </button>
        </div>
      )}
    </div>
  );
}
