"use client";

import React from "react";
import { Calendar } from "lucide-react";
import { useGastosContextNullable } from "./GastosContext";

export interface GastosMonthPickerProps {
  currentMonth?: string;
  onMonthChange?: (month: string) => void;
}

export function GastosMonthPicker(props: GastosMonthPickerProps = {}) {
  const context = useGastosContextNullable();
  const currentMonth = props.currentMonth ?? context?.currentMonth ?? "";
  const onMonthChange = props.onMonthChange ?? context?.handleMonthChange;

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
      <div>
        <h2 className="text-xs font-extrabold text-text-light/50 uppercase tracking-widest">
          Resumen Financiero
        </h2>
        <p className="text-lg font-black text-text-light tracking-tight uppercase">
          Control de Egresos y Balance
        </p>
      </div>
      <div className="flex items-center gap-2">
        <label htmlFor="gastos-month-select" className="sr-only">
          Seleccionar mes
        </label>
        <Calendar className="h-4 w-4 text-text-light/40" />
        <input
          id="gastos-month-select"
          type="month"
          value={currentMonth}
          onChange={(e) => onMonthChange?.(e.target.value)}
          aria-label="Seleccionar mes"
          className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-bold text-text-light outline-none focus:border-primary transition-all scheme-dark cursor-pointer"
        />
      </div>
    </div>
  );
}
