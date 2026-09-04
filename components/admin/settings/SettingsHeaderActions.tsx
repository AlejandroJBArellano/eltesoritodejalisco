"use client";

import { AlertCircle, CheckCircle2 } from "lucide-react";
import { useSettingsContext } from "./SettingsContext";

export function SettingsHeaderActions() {
  const { success, error, loading } = useSettingsContext();

  return (
    <div className="space-y-4">
      {success && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-3 animate-in fade-in duration-200">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>Configuración guardada exitosamente. Los cambios se reflejarán de inmediato.</span>
        </div>
      )}

      {error && (
        <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/30 text-red-400 text-xs font-bold flex items-center gap-3 animate-in fade-in duration-200">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      <div className="flex items-center justify-between py-2 border-b border-border/50">
        <div>
          <h2 className="text-base font-black text-text-light uppercase tracking-tight">
            Ajustes del Restaurante
          </h2>
          <p className="text-xs text-text-light/50 font-medium">
            Personaliza la identidad visual, datos de facturación y servicios en línea.
          </p>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="px-6 py-2.5 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-wider hover:brightness-105 active:scale-95 transition disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-primary/20 cursor-pointer"
        >
          {loading ? (
            <>
              <span className="h-3.5 w-3.5 border-2 border-black border-t-transparent rounded-full animate-spin" />
              Guardando...
            </>
          ) : (
            "Guardar Cambios"
          )}
        </button>
      </div>
    </div>
  );
}
