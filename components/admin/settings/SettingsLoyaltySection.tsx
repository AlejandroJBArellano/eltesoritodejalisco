"use client";

import { Gift } from "lucide-react";
import { useSettingsContext } from "./SettingsContext";

export function SettingsLoyaltySection() {
  const { loyaltyEnabled, setLoyaltyEnabled, loyaltyRatio, setLoyaltyRatio } =
    useSettingsContext();

  return (
    <div className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20">
      <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
        <Gift className="h-4 w-4 text-primary" /> Programa de Lealtad (CRM)
      </h3>

      <div className="flex items-center justify-between p-4 rounded-xl bg-dark/20 border border-border/50">
        <div className="space-y-1">
          <span className="text-sm font-bold text-text-light block">
            Activar Programa de Lealtad
          </span>
          <span className="text-xs text-text-light/40">
            Permite a los clientes acumular puntos por sus compras usando su número telefónico.
          </span>
        </div>

        <input
          type="hidden"
          name="loyaltyEnabled"
          value={loyaltyEnabled ? "true" : "false"}
        />

        <button
          type="button"
          onClick={() => setLoyaltyEnabled(!loyaltyEnabled)}
          className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${
            loyaltyEnabled ? "bg-primary" : "bg-dark/60"
          } border border-border`}
        >
          <span
            className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-text-light shadow ring-0 transition duration-200 ease-in-out ${
              loyaltyEnabled ? "translate-x-5" : "translate-x-0"
            }`}
          />
        </button>
      </div>

      {loyaltyEnabled && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5 animate-in fade-in duration-200">
          <div>
            <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
              Pesos por Punto ($ MXN)
            </label>
            <div className="flex items-center gap-2">
              <span className="text-sm text-text-light/40">$</span>
              <input
                type="number"
                name="loyaltyRatio"
                min="1"
                required={loyaltyEnabled}
                value={loyaltyRatio}
                onChange={(e) =>
                  setLoyaltyRatio(Math.max(1, parseInt(e.target.value) || 1))
                }
                className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-mono"
              />
            </div>
            <p className="text-[10px] text-text-light/40 mt-1.5">
              Define cuántos pesos debe gastar el cliente para acumular 1 punto (ej. 10 pesos = 1 punto).
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
