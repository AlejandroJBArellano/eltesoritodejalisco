"use client";

import React from "react";
import { Receipt, X } from "lucide-react";
import type { DailyCut } from "./types";

export interface DailyCutDetailModalProps {
  cut: DailyCut | null;
  onClose: () => void;
}

export function DailyCutDetailModal({
  cut,
  onClose,
}: DailyCutDetailModalProps) {
  if (!cut) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4 no-print">
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-2xl border border-border max-h-[90vh] overflow-y-auto custom-scrollbar space-y-5">
        <div className="flex items-center justify-between border-b border-border pb-3">
          <div>
            <h3 className="text-base font-black text-text-light uppercase tracking-tight flex items-center gap-2">
              <Receipt className="h-4 w-4 text-blue-400" />
              Detalle del Corte
            </h3>
            <p className="text-xs font-bold text-text-light/50 mt-0.5">
              {new Date(`${cut.cut_date}T12:00:00`).toLocaleDateString("es-MX", {
                weekday: "long",
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-text-light/40 hover:text-text-light transition-colors cursor-pointer"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div className="bg-dark/40 p-3 rounded-xl border border-border">
            <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
              Venta Neta (Sin IVA)
            </span>
            <span className="text-text-light text-lg font-mono font-bold">
              ${Number(cut.venta_neta).toFixed(2)}
            </span>
          </div>
          <div className="bg-dark/40 p-3 rounded-xl border border-border">
            <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
              IVA Acumulado
            </span>
            <span className="text-amber-400 text-lg font-mono font-bold">
              ${Number(cut.iva_acumulado).toFixed(2)}
            </span>
          </div>
          <div className="bg-dark/40 p-3 rounded-xl border border-border">
            <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
              Propinas (Efectivo)
            </span>
            <span className="text-emerald-400 text-lg font-mono font-bold">
              ${Number(cut.propinas_efectivo).toFixed(2)}
            </span>
          </div>
          <div className="bg-dark/40 p-3 rounded-xl border border-border">
            <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
              Propinas (Tarjeta)
            </span>
            <span className="text-blue-400 text-lg font-mono font-bold">
              ${Number(cut.propinas_tarjeta).toFixed(2)}
            </span>
          </div>
          <div className="bg-dark/40 p-3 rounded-xl border border-border">
            <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
              Caja Final (Efectivo)
            </span>
            <span className="text-emerald-400 text-lg font-mono font-bold">
              ${Number(cut.caja_efectivo).toFixed(2)}
            </span>
          </div>
          <div className="bg-dark/40 p-3 rounded-xl border border-border">
            <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
              Caja Final (Tarjeta)
            </span>
            <span className="text-blue-400 text-lg font-mono font-bold">
              ${Number(cut.caja_tarjeta).toFixed(2)}
            </span>
          </div>
          <div className="bg-dark/40 p-3 rounded-xl border border-border">
            <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
              Total Gastos
            </span>
            <span className="text-red-400 text-lg font-mono font-bold">
              -${Number(cut.total_gastos).toFixed(2)}
            </span>
          </div>
          <div className="bg-dark/40 p-3 rounded-xl border border-border">
            <span className="text-text-light/50 text-[10px] font-extrabold uppercase tracking-widest block mb-1">
              Utilidad Final
            </span>
            <span
              className={`text-lg font-mono font-bold ${
                Number(cut.utilidad_final) >= 0
                  ? "text-emerald-400"
                  : "text-red-400"
              }`}
            >
              ${Number(cut.utilidad_final).toFixed(2)}
            </span>
          </div>
        </div>

        {/* GASTOS DETALLADOS */}
        {cut.expenses_detail && cut.expenses_detail.length > 0 && (
          <div className="space-y-2 border-t border-border pt-3">
            <h4 className="text-xs font-black text-text-light/60 uppercase tracking-wider">
              Desglose de Gastos
            </h4>
            <div className="space-y-1.5 max-h-40 overflow-y-auto">
              {cut.expenses_detail.map((exp, idx) => (
                <div
                  key={idx}
                  className="flex justify-between items-center bg-dark/30 p-2 rounded-lg border border-border text-xs"
                >
                  <div>
                    <span className="font-bold text-text-light">
                      {exp.description}
                    </span>
                    {exp.category && (
                      <span className="text-[10px] text-text-light/40 ml-2">
                        ({exp.category})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {exp.has_invoice && (
                      <span className="text-[9px] bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-bold">
                        FAC
                      </span>
                    )}
                    <span className="font-mono text-red-400 font-bold">
                      -${Number(exp.amount).toFixed(2)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <button
          type="button"
          onClick={onClose}
          className="w-full bg-white/5 text-text-light/60 py-3 rounded-xl font-black hover:bg-white/10 transition-colors uppercase text-xs tracking-wider cursor-pointer"
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
