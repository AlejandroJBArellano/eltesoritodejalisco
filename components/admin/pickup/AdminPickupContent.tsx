"use client";

import React, { useState } from "react";
import {
  ShoppingBag,
  ExternalLink,
  Copy,
  Check,
  QrCode,
  Clock,
  Save,
  Loader2,
  AlertCircle,
  CheckCircle2,
  Globe,
  CreditCard,
  Download,
  ArrowRight,
} from "lucide-react";
import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { Modal } from "@/components/ui/Modal";
import { StripeEmbeddedOnboardingModal } from "@/components/admin/settings/StripeEmbeddedOnboardingModal";

export interface DbBusinessHours {
  id: string;
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

export interface AdminPickupContentProps {
  initialTenant: {
    id: string;
    slug?: string | null;
    name?: string | null;
    stripe_account_id?: string | null;
    stripe_charges_enabled?: boolean | null;
    stripe_details_submitted?: boolean | null;
  };
  initialHours: DbBusinessHours[];
}

const DAYS_OF_WEEK_NAMES = [
  "Domingo",
  "Lunes",
  "Martes",
  "Miércoles",
  "Jueves",
  "Viernes",
  "Sábado",
];

export function AdminPickupContent({
  initialTenant,
  initialHours,
}: AdminPickupContentProps) {
  const router = useRouter();
  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [isStripeModalOpen, setIsStripeModalOpen] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const [hoursList, setHoursList] = useState<DbBusinessHours[]>(initialHours);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  const slug = initialTenant.slug || "demo";
  const pickupUrl = `https://${slug}.trykittn.com`;
  const isStripeEnabled = Boolean(initialTenant.stripe_charges_enabled);
  const hasStripeAccount = Boolean(initialTenant.stripe_account_id);

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=400x400&data=${encodeURIComponent(
    pickupUrl,
  )}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pickupUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleOpenStripeModal = () => {
    setIsStripeModalOpen(true);
  };

  const handleCloseStripeModal = () => {
    setIsStripeModalOpen(false);
  };

  const handleStripeOnboardingSuccess = () => {
    router.refresh();
  };

  const handleStripeLogin = async () => {
    try {
      setConnectingStripe(true);
      setStripeError(null);
      const res = await fetch("/api/stripe/connect/login-link", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        setStripeError(data.error || "Error al abrir panel de Stripe");
      }
    } catch (err) {
      console.error(err);
      setStripeError("Error al conectar con Stripe");
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleToggleClosed = (index: number) => {
    setHoursList((prev) =>
      prev.map((h, i) => (i === index ? { ...h, is_closed: !h.is_closed } : h)),
    );
  };

  const handleTimeChange = (
    index: number,
    field: "open_time" | "close_time",
    value: string,
  ) => {
    const formattedTime = value.length === 5 ? `${value}:00` : value;
    setHoursList((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: formattedTime } : h)),
    );
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setError(null);
    setSuccess(false);

    // Validate times
    for (let i = 0; i < hoursList.length; i++) {
      const day = hoursList[i];
      if (!day.is_closed) {
        if (day.open_time >= day.close_time) {
          setError(
            `El horario de apertura debe ser anterior al de cierre para el día ${DAYS_OF_WEEK_NAMES[day.day_of_week]}.`,
          );
          setIsSaving(false);
          return;
        }
      }
    }

    try {
      const response = await fetch("/api/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: hoursList }),
      });

      const data = await response.json();
      if (!response.ok)
        throw new Error(data?.error || "Error al guardar horarios");

      setSuccess(true);
      setTimeout(() => setSuccess(false), 4000);
    } catch (err) {
      console.error(err);
      setError(
        err instanceof Error ? err.message : "Ocurrió un error inesperado",
      );
    } finally {
      setIsSaving(false);
    }
  };

  const formatTimeForInput = (timeStr: string) => {
    return timeStr ? timeStr.slice(0, 5) : "09:00";
  };

  return (
    <div className="min-h-screen bg-background text-text-light pb-16">
      <PageHeader
        title="Kittn Pickup & Horarios"
        subtitle="Configuración de pagos con Stripe, menú digital para llevar y horarios de atención"
        badgeColor="bg-primary"
        icon={<ShoppingBag className="h-5 w-5 text-primary" />}
      />

      <main className="max-w-7xl mx-auto px-4 py-8 sm:px-6 lg:px-8 space-y-8">
        {/* Section 1: Stripe Integration & Onboarding */}
        <div className="rounded-2xl bg-card border border-border/80 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <CreditCard className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Cobros y Pagos con Stripe Connect
                </h2>
                <p className="text-xs text-text-light/60">
                  Conexión bancaria requerida para procesar pedidos y depósitos
                  en línea
                </p>
              </div>
            </div>

            {isStripeEnabled ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 self-start sm:self-auto">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
                Stripe Activo
              </span>
            ) : hasStripeAccount ? (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-amber-500/15 text-amber-400 border border-amber-500/30 self-start sm:self-auto">
                <span className="h-2 w-2 rounded-full bg-amber-400" />
                Verificación Pendiente
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider bg-dark/40 text-text-light/40 border border-border self-start sm:self-auto">
                Inactivo
              </span>
            )}
          </div>

          {stripeError && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{stripeError}</span>
            </div>
          )}

          {isStripeEnabled ? (
            <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <h4 className="text-sm font-bold text-emerald-300">
                    Cuenta de Stripe Activa & Cobros Habilitados
                  </h4>
                  <p className="text-xs text-emerald-200/70 mt-0.5 leading-relaxed">
                    Tus clientes ya pueden ordenar y pagar en línea en Kittn
                    Pickup. Los cobros se depositan directamente en tu cuenta
                    bancaria.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleStripeLogin}
                disabled={connectingStripe}
                className="px-4 py-2.5 bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-xs font-bold rounded-xl border border-emerald-500/40 transition flex items-center gap-2 shrink-0 cursor-pointer disabled:opacity-50"
              >
                <ExternalLink className="h-4 w-4" />
                <span>
                  {connectingStripe ? "Cargando..." : "Ver Saldo y Depósitos"}
                </span>
              </button>
            </div>
          ) : hasStripeAccount ? (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="flex items-start sm:items-center gap-3">
                <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5 sm:mt-0" />
                <div>
                  <h4 className="text-sm font-bold text-amber-300">
                    Verificación Pendiente en Stripe
                  </h4>
                  <p className="text-xs text-amber-200/70 mt-0.5 leading-relaxed">
                    Tu cuenta de Stripe requiere información adicional antes de
                    poder recibir pagos de comensales.
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleOpenStripeModal}
                disabled={connectingStripe}
                className="px-4 py-2.5 bg-amber-400 text-dark text-xs font-bold rounded-xl hover:brightness-110 transition flex items-center gap-2 shrink-0 cursor-pointer shadow-md disabled:opacity-50"
              >
                <span>
                  {connectingStripe
                    ? "Cargando..."
                    : "Completar Registro en Stripe"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="bg-dark/40 border border-border/70 rounded-xl p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div className="space-y-1">
                <h4 className="text-sm font-bold text-text-light">
                  Conecta tu cuenta bancaria con Stripe
                </h4>
                <p className="text-xs text-text-light/60 leading-relaxed">
                  Configura tu CLABE y datos fiscales para recibir depósitos
                  directos y activar tu menú en línea de Kittn Pickup.
                </p>
              </div>
              <button
                type="button"
                onClick={handleOpenStripeModal}
                disabled={connectingStripe}
                className="px-5 py-2.5 bg-primary text-dark font-black text-xs uppercase tracking-wider rounded-xl hover:brightness-110 transition flex items-center gap-2 shrink-0 cursor-pointer shadow-md disabled:opacity-50"
              >
                <span>
                  {connectingStripe
                    ? "Cargando..."
                    : "Conectar Stripe y Activar Pickup"}
                </span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Section 2: Kittn Pickup Link & Status */}
        <div className="rounded-2xl bg-card border border-border/80 p-6 sm:p-8 space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 border border-primary/20 text-primary">
                <Globe className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Enlace del Menú Digital
                </h2>
                <p className="text-xs text-text-light/60">
                  Enlace directo para que tus clientes ordenen y paguen en línea
                </p>
              </div>
            </div>

            {isStripeEnabled ? (
              <span className="text-[11px] font-bold text-emerald-400">
                Listo para compartir
              </span>
            ) : (
              <span className="text-[11px] font-bold text-amber-400/80">
                Requiere activar Stripe
              </span>
            )}
          </div>

          {/* URL & Action buttons */}
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex-1 rounded-xl bg-dark/60 border border-border px-4 py-3 text-xs font-mono text-text-light truncate select-all">
                {pickupUrl}
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <button
                  type="button"
                  disabled={!isStripeEnabled}
                  onClick={handleCopyLink}
                  title={
                    !isStripeEnabled
                      ? "Conecta Stripe para habilitar el portal"
                      : undefined
                  }
                  className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl bg-card hover:bg-white/5 text-text-light text-xs font-bold transition flex items-center justify-center gap-2 border border-border disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  {copied ? (
                    <>
                      <Check className="h-4 w-4 text-emerald-400" />
                      <span className="text-emerald-400">¡Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="h-4 w-4 text-text-light/70" />
                      <span>Copiar Enlace</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  disabled={!isStripeEnabled}
                  onClick={() => setShowQrModal(true)}
                  title={
                    !isStripeEnabled
                      ? "Conecta Stripe para habilitar el portal"
                      : undefined
                  }
                  className="px-4 py-2.5 rounded-xl bg-primary/10 hover:bg-primary/20 text-primary text-xs font-bold transition flex items-center justify-center gap-2 border border-primary/25 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                >
                  <QrCode className="h-4 w-4" />
                  <span>Código QR</span>
                </button>

                {isStripeEnabled ? (
                  <a
                    href={pickupUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-4 py-2.5 rounded-xl bg-primary text-dark hover:brightness-110 text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Abrir Portal</span>
                  </a>
                ) : (
                  <button
                    type="button"
                    disabled
                    title="Conecta Stripe para habilitar el portal"
                    className="px-4 py-2.5 rounded-xl bg-primary/30 text-dark/60 text-xs font-bold flex items-center justify-center gap-2 cursor-not-allowed"
                  >
                    <ExternalLink className="h-4 w-4" />
                    <span>Abrir Portal</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Horarios de Atención del Portal */}
        <form
          onSubmit={handleSave}
          className="rounded-2xl bg-card border border-border/80 p-6 sm:p-8 space-y-6 shadow-sm"
        >
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-border/80 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
                <Clock className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-white tracking-tight">
                  Horarios de Atención del Portal
                </h2>
                <p className="text-xs text-text-light/60">
                  Días y rangos de horario en los que el portal acepta pedidos
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSaving}
              className="inline-flex items-center justify-center gap-2 rounded-xl bg-primary px-5 py-2.5 text-xs font-bold text-dark hover:brightness-110 transition disabled:opacity-50 cursor-pointer self-start sm:self-auto"
            >
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4" />
                  Guardar Horarios
                </>
              )}
            </button>
          </div>

          {error && (
            <div className="p-3.5 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs font-bold text-rose-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div className="p-3.5 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-xs font-bold text-emerald-400 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Horarios actualizados exitosamente.</span>
            </div>
          )}

          <div className="divide-y divide-border/60">
            {hoursList.map((day, index) => {
              const dayName = DAYS_OF_WEEK_NAMES[day.day_of_week];

              return (
                <div
                  key={day.id || `day-${day.day_of_week}`}
                  className="py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 first:pt-0 last:pb-0"
                >
                  <div className="flex items-center gap-3 w-36">
                    <span className="text-xs font-bold text-text-light">
                      {dayName}
                    </span>
                  </div>

                  <div className="flex items-center gap-4 flex-1 justify-end">
                    <button
                      type="button"
                      onClick={() => handleToggleClosed(index)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                        day.is_closed
                          ? "bg-rose-500/10 text-rose-400 border-rose-500/20"
                          : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                      }`}
                    >
                      {day.is_closed ? "Cerrado" : "Abierto"}
                    </button>

                    {!day.is_closed ? (
                      <div className="flex items-center gap-2">
                        <input
                          type="time"
                          value={formatTimeForInput(day.open_time)}
                          onChange={(e) =>
                            handleTimeChange(index, "open_time", e.target.value)
                          }
                          className="bg-dark/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-light font-mono focus:outline-none focus:border-primary"
                        />
                        <span className="text-text-light/40 text-xs">a</span>
                        <input
                          type="time"
                          value={formatTimeForInput(day.close_time)}
                          onChange={(e) =>
                            handleTimeChange(
                              index,
                              "close_time",
                              e.target.value,
                            )
                          }
                          className="bg-dark/60 border border-border rounded-lg px-2.5 py-1.5 text-xs text-text-light font-mono focus:outline-none focus:border-primary"
                        />
                      </div>
                    ) : (
                      <span className="text-xs text-text-light/40 italic">
                        Sin servicio al público
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </form>
      </main>

      {/* QR Code Modal */}
      {showQrModal && (
        <Modal
          isOpen={showQrModal}
          onClose={() => setShowQrModal(false)}
          title="Código QR del Menú Digital"
        >
          <div className="flex flex-col items-center gap-4 p-4 text-center">
            <div className="p-4 bg-white rounded-2xl shadow-md border border-border">
              <img
                src={qrImageUrl}
                alt="Código QR Kittn Pickup"
                className="w-56 h-56 object-contain"
              />
            </div>
            <div className="space-y-1">
              <p className="text-xs font-bold text-text-light">
                Escanea para abrir el menú en línea
              </p>
              <p className="text-[11px] font-mono text-text-light/50">
                {pickupUrl}
              </p>
            </div>
            <a
              href={qrImageUrl}
              download={`qr-${slug}.png`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-dark text-xs font-bold hover:brightness-110 transition"
            >
              <Download className="w-4 h-4" />
              <span>Descargar Imagen QR</span>
            </a>
          </div>
        </Modal>
      )}

      {/* Stripe Embedded Onboarding Modal */}
      {isStripeModalOpen && (
        <StripeEmbeddedOnboardingModal
          isOpen={isStripeModalOpen}
          onClose={handleCloseStripeModal}
          onSuccess={handleStripeOnboardingSuccess}
        />
      )}
    </div>
  );
}
