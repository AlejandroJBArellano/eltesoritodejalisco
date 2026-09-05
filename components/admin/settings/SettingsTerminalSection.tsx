"use client";

import React from "react";
import { Calculator, CreditCard, Info } from "lucide-react";
import { useSettingsContext } from "./SettingsContext";

export function SettingsTerminalSection() {
  const { terminalCommissionRate, setTerminalCommissionRate } =
    useSettingsContext();

  const parsed = parseFloat(terminalCommissionRate);
  const rate = Number.isFinite(parsed) ? Math.max(0, Math.min(100, parsed)) : 0;
  const sampleAmount = 1000;
  const simulatedFee = (sampleAmount * rate) / 100;
  const simulatedNet = Math.max(0, sampleAmount - simulatedFee);

  return (
    <div className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2">
          <CreditCard className="h-4 w-4 text-primary" /> Terminal Bancaria
        </h3>
        <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-primary/10 text-primary border border-primary/20 w-fit">
          Corte de Caja
        </span>
      </div>

      <div className="space-y-4">
        <div>
          <label
            htmlFor="terminalCommissionRate"
            className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5"
          >
            Comisión por tarjeta (%)
          </label>
          <div className="relative max-w-xs">
            <input
              id="terminalCommissionRate"
              type="number"
              name="terminalCommissionRate"
              step="0.01"
              min="0"
              max="100"
              value={terminalCommissionRate}
              onChange={(e) => setTerminalCommissionRate(e.target.value)}
              placeholder="Ej. 4.06"
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 pr-10 text-sm text-text-light font-mono outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
            <span className="absolute right-3.5 top-1/2 -translate-y-1/2 text-xs font-black text-text-light/40 pointer-events-none">
              %
            </span>
          </div>
          <p className="text-[10px] text-text-light/40 mt-1.5 leading-relaxed">
            Descuento por cobro con tarjeta.
          </p>
        </div>

        {/* Simulador en tiempo real */}
        <div className="rounded-xl bg-dark/50 border border-border/80 p-4 space-y-3 shadow-inner">
          <div className="flex items-center gap-2 text-xs font-black text-text-light uppercase tracking-wider">
            <Calculator className="h-3.5 w-3.5 text-primary" />
            <span>Ejemplo ($1,000 MXN)</span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div className="bg-card/70 border border-border rounded-lg p-3">
              <span className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider block">
                Cobro
              </span>
              <span className="text-base font-black text-text-light font-mono mt-0.5 block">
                ${sampleAmount.toFixed(2)}
              </span>
            </div>

            <div className="bg-card/70 border border-border rounded-lg p-3">
              <span className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider block">
                Comisión ({rate.toFixed(2)}%)
              </span>
              <span className="text-base font-black text-red-400 font-mono mt-0.5 block">
                -${simulatedFee.toFixed(2)}
              </span>
            </div>

            <div className="bg-card/70 border border-border rounded-lg p-3">
              <span className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider block">
                Neto
              </span>
              <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
                ${simulatedNet.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="flex items-start gap-2 pt-1 text-[11px] text-text-light/60">
            <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
            <p>
              {rate > 0
                ? "Se descuenta de la utilidad en cortes y reportes."
                : "Sin deducción en cortes ni reportes."}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
