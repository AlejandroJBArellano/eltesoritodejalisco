"use client";

import { FileText } from "lucide-react";
import { useSettingsContext } from "./SettingsContext";

export function SettingsFiscalSection() {
  const { initialTenant } = useSettingsContext();

  return (
    <div className="rounded-xl bg-card border border-border p-6 space-y-6 transition hover:border-border/80 shadow-sm">
      <h3 className="text-xs font-black text-text-light/60 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
        <FileText className="h-4 w-4 text-primary" /> Datos Fiscales del
        Restaurante
      </h3>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div>
          <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
            RFC del Restaurante
          </label>
          <input
            type="text"
            name="rfc"
            maxLength={13}
            defaultValue={initialTenant.rfc || ""}
            placeholder="XAXX010101000"
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition font-mono uppercase"
          />
          <p className="text-[10px] text-text-light/40 mt-1.5">
            Se imprimirá en el pie de página de los tickets de venta.
          </p>
        </div>

        <div>
          <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
            Código Postal
          </label>
          <input
            type="text"
            name="postalCode"
            defaultValue={initialTenant.postal_code || ""}
            placeholder="09090"
            className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition font-mono"
          />
        </div>
      </div>

      <div>
        <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
          Régimen Fiscal
        </label>
        <input
          type="text"
          name="regimenFiscal"
          defaultValue={initialTenant.regimen_fiscal || ""}
          placeholder="626 - Simplificado de Confianza (RESICO)"
          className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition"
        />
      </div>
    </div>
  );
}
