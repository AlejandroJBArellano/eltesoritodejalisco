"use client";

import { ArrowRight, CheckCircle2, ExternalLink } from "lucide-react";
import { useSettingsContext } from "./SettingsContext";

export function SettingsStripeSection() {
  const {
    initialTenant,
    connectingStripe,
    handleStripeConnect,
    handleStripeLogin,
  } = useSettingsContext();

  return (
    <div className="space-y-4">
      {initialTenant.stripe_charges_enabled ? (
        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
            <div>
              <h4 className="text-sm font-bold text-emerald-300">
                Cuenta de Stripe Activa & Cobros Habilitados
              </h4>
              <p className="text-xs text-emerald-200/70">
                Tus clientes ya pueden pedir y pagar en línea en Kittn Pickup. Los cobros se depositan en tu cuenta bancaria (Comisión Kittn: 8%).
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={handleStripeLogin}
            disabled={connectingStripe}
            className="px-4 py-2 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/40 transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Ver Saldo y Depósitos
          </button>
        </div>
      ) : initialTenant.stripe_account_id ? (
        <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h4 className="text-sm font-bold text-amber-300">
              Verificación Pendiente en Stripe
            </h4>
            <p className="text-xs text-amber-200/70">
              Tu cuenta de Stripe requiere información fiscal o bancaria adicional antes de poder recibir pagos de clientes en Kittn Pickup.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStripeConnect}
            disabled={connectingStripe}
            className="px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-bold rounded-xl border border-amber-500/40 transition flex items-center gap-2 shrink-0 cursor-pointer"
          >
            {connectingStripe ? "Cargando..." : "Completar Registro en Stripe"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <div className="bg-dark/20 border border-border/50 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h4 className="text-sm font-bold text-text-light">
              Conecta tu cuenta bancaria con Stripe
            </h4>
            <p className="text-xs text-text-light/50">
              Configura tu CLABE y datos fiscales para recibir depósitos directos y activar tu menú en línea de Kittn Pickup.
            </p>
          </div>
          <button
            type="button"
            onClick={handleStripeConnect}
            disabled={connectingStripe}
            className="px-5 py-2.5 bg-primary text-dark font-extrabold text-xs uppercase tracking-wider rounded-xl hover:opacity-90 transition flex items-center gap-2 shrink-0 cursor-pointer shadow-md"
          >
            {connectingStripe ? "Generando liga..." : "Conectar Stripe y Activar Pickup"}
            <ArrowRight className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
