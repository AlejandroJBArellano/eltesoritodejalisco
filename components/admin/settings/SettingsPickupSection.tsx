"use client";

import { Check, Copy, ExternalLink, Globe, ShoppingBag } from "lucide-react";
import { useSettingsContext } from "./SettingsContext";

export function SettingsPickupSection() {
  const { initialTenant, pickupUrl, copied, handleCopyLink } =
    useSettingsContext();

  return (
    <div
      id="pickup"
      className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20 scroll-mt-6"
    >
      <div className="flex items-center justify-between border-b border-border pb-3">
        <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2">
          <ShoppingBag className="h-4 w-4 text-primary" /> Portal Kittn Pickup & Pagos con Stripe
        </h3>
        {initialTenant.stripe_charges_enabled ? (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            Online
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-zinc-800 text-text-light/40 border border-border">
            Inactivo
          </span>
        )}
      </div>

      {/* Explicación de Kittn Pickup */}
      <p className="text-xs text-text-light/60 leading-relaxed">
        <strong className="text-text-light">Kittn Pickup</strong> es el portal web donde tus comensales exploran tu menú digital, configuran pedidos para llevar o comer aquí, y pagan con tarjeta bancaria. Para que tu portal esté activo y reciba cobros, tu restaurante debe conectarse con Stripe.
      </p>

      {/* Enlace de tu Menú Pickup */}
      <div className="rounded-xl bg-dark/30 border border-border/70 p-4 space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-[11px] font-bold text-text-light/50 uppercase tracking-wider flex items-center gap-1.5">
            <Globe className="h-3.5 w-3.5 text-primary" /> Enlace de tu Menú Kittn Pickup
          </label>
          {initialTenant.stripe_charges_enabled ? (
            <span className="text-[10px] font-bold text-emerald-400">Listo para compartir</span>
          ) : (
            <span className="text-[10px] font-bold text-amber-400/80">Requiere activar Stripe</span>
          )}
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <div className="flex-1 rounded-lg bg-background/80 border border-border px-3.5 py-2 text-xs font-mono text-text-light truncate select-all">
            {pickupUrl}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={handleCopyLink}
              className="flex-1 sm:flex-none px-3.5 py-2 rounded-lg bg-border/40 hover:bg-border/70 text-text-light text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-border/50"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span className="text-emerald-400 font-bold">¡Copiado!</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5 text-text-light/70" />
                  <span>Copiar Link</span>
                </>
              )}
            </button>
            <a
              href={pickupUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3.5 py-2 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer border border-primary/25"
            >
              <ExternalLink className="h-3.5 w-3.5" />
              <span>Abrir Tienda</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
