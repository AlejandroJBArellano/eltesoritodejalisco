"use client";

import { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { useTenant } from "@/components/TenantProvider";
import {
  Mail,
  Users,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Clock,
  Award,
  Send,
  Loader2,
  ShieldCheck,
  Eye,
} from "lucide-react";

interface NewCampaignModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export type TemplateKey = "te_extranamos" | "canje_puntos" | "personalizado";

const DEFAULT_TEMPLATES: Record<
  TemplateKey,
  { name: string; subject: string; message: string; badge: string }
> = {
  te_extranamos: {
    name: "Te Extrañamos",
    subject: "¡Te extrañamos en {restaurante}! 🍽️",
    message:
      "Hola {nombre},\n\nHace tiempo que no te vemos por aquí y queremos consentirte de nuevo.\n\nRecuerda que tienes {puntos} puntos acumulados para canjear en tu próxima visita o pedido en línea.\n\n¡Esperamos verte pronto!",
    badge: "👋 ¡Te Extrañamos!",
  },
  canje_puntos: {
    name: "Canjea tus Puntos",
    subject: "¡{nombre}, tienes {puntos} puntos listos para canjear! 🎉",
    message:
      "Hola {nombre},\n\n¡Tus puntos de lealtad en {restaurante} te están esperando!\n\nTienes un saldo de {puntos} puntos que puedes canjear por platillos o promociones especiales en tu próxima orden.\n\n¡Ven y disfruta tus recompensas!",
    badge: "🎁 Puntos de Lealtad",
  },
  personalizado: {
    name: "Mensaje Libre",
    subject: "Novedades y promociones exclusivas en {restaurante}",
    message:
      "Hola {nombre},\n\nTenemos sorpresas especiales preparadas para ti en {restaurante}.\n\n¡Aprovecha tus {puntos} puntos y disfruta de nuestro menú!",
    badge: "✨ Promoción Especial",
  },
};

export function NewCampaignModal({
  isOpen,
  onClose,
  onSuccess,
}: NewCampaignModalProps) {
  const tenant = useTenant();
  const [step, setStep] = useState<1 | 2 | 3>(1);

  // Form State
  const [name, setName] = useState("");
  const [templateKey, setTemplateKey] = useState<TemplateKey>("te_extranamos");
  const [subject, setSubject] = useState(DEFAULT_TEMPLATES.te_extranamos.subject);
  const [messageContent, setMessageContent] = useState(
    DEFAULT_TEMPLATES.te_extranamos.message,
  );

  // Segment Filters
  const [inactiveDays, setInactiveDays] = useState<number>(30);
  const [minPoints, setMinPoints] = useState<number>(0);
  const [frequency, setFrequency] = useState<"all" | "recurrent" | "inactive">(
    "all",
  );
  const [antiSaturationDays, setAntiSaturationDays] = useState<number>(7);
  const [enableAntiSaturation, setEnableAntiSaturation] = useState<boolean>(true);

  // Audience Preview State
  const [audienceCount, setAudienceCount] = useState<number | null>(null);
  const [isLoadingAudience, setIsLoadingAudience] = useState<boolean>(false);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Reset modal on open
  useEffect(() => {
    if (isOpen) {
      setStep(1);
      setName("");
      setTemplateKey("te_extranamos");
      setSubject(DEFAULT_TEMPLATES.te_extranamos.subject);
      setMessageContent(DEFAULT_TEMPLATES.te_extranamos.message);
      setInactiveDays(30);
      setMinPoints(0);
      setFrequency("all");
      setAntiSaturationDays(7);
      setEnableAntiSaturation(true);
      setErrorMessage(null);
    }
  }, [isOpen]);

  // Fetch Audience Count Preview
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchAudience = async () => {
      try {
        setIsLoadingAudience(true);
        const params = new URLSearchParams({
          preview: "true",
          inactiveDays: String(inactiveDays),
          minPoints: String(minPoints),
          frequency,
          antiSaturationDays: enableAntiSaturation
            ? String(antiSaturationDays)
            : "0",
        });

        const res = await fetch(`/api/customers/campaigns?${params.toString()}`);
        if (!res.ok) throw new Error("Error calculando audiencia");
        const data = await res.json();
        if (isMounted) {
          setAudienceCount(data.totalAudienceCount ?? 0);
        }
      } catch (err) {
        console.error("Error previewing audience:", err);
        if (isMounted) setAudienceCount(0);
      } finally {
        if (isMounted) setIsLoadingAudience(false);
      }
    };

    const timer = setTimeout(fetchAudience, 250);
    return () => {
      isMounted = false;
      clearTimeout(timer);
    };
  }, [isOpen, inactiveDays, minPoints, frequency, antiSaturationDays, enableAntiSaturation]);

  const handleTemplateSelect = (key: TemplateKey) => {
    setTemplateKey(key);
    const template = DEFAULT_TEMPLATES[key];
    setSubject(template.subject);
    setMessageContent(template.message);
  };

  const insertVariable = (variable: "{nombre}" | "{puntos}" | "{restaurante}") => {
    setMessageContent((prev) => `${prev} ${variable}`);
  };

  const insertVariableToSubject = (
    variable: "{nombre}" | "{puntos}" | "{restaurante}",
  ) => {
    setSubject((prev) => `${prev} ${variable}`);
  };

  // Preview formatting
  const tenantName = tenant.name || tenant.system_name || "KittnOS";
  const primaryColor = tenant.primary_color || "#10B981";

  const previewSubject = useMemo(() => {
    return subject
      .replace(/\{nombre\}/gi, "Juan Pérez")
      .replace(/\{puntos\}/gi, "150")
      .replace(/\{restaurante\}/gi, tenantName);
  }, [subject, tenantName]);

  const previewBody = useMemo(() => {
    return messageContent
      .replace(/\{nombre\}/gi, "Juan Pérez")
      .replace(/\{puntos\}/gi, "150")
      .replace(/\{restaurante\}/gi, tenantName);
  }, [messageContent, tenantName]);

  const handleSubmit = async () => {
    try {
      setIsSubmitting(true);
      setErrorMessage(null);

      const payload = {
        name: name.trim() || `Campaña ${DEFAULT_TEMPLATES[templateKey].name}`,
        subject: subject.trim(),
        templateKey,
        messageContent: messageContent.trim(),
        filters: {
          inactiveDays,
          minPoints,
          frequency,
          antiSaturationDays: enableAntiSaturation ? antiSaturationDays : 0,
        },
      };

      const response = await fetch("/api/customers/campaigns", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.error || "Error al enviar la campaña");
      }

      onSuccess();
      onClose();
    } catch (err) {
      console.error("Error submitting campaign:", err);
      setErrorMessage(
        err instanceof Error ? err.message : "Error inesperado al enviar",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        step === 1
          ? "Nueva Campaña: Segmentación"
          : step === 2
            ? "Nueva Campaña: Redacción"
            : "Nueva Campaña: Confirmación"
      }
      subtitle="Envío segmentado de correos de fidelización y lealtad"
      icon={<Mail className="h-5 w-5 text-emerald-400" />}
      maxWidth="2xl"
    >
      <div className="space-y-6">
        {/* Step Indicator */}
        <div className="flex items-center justify-between border-b border-border pb-4">
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                step >= 1
                  ? "bg-emerald-500 text-black"
                  : "bg-white/10 text-text-light/40"
              }`}
            >
              1
            </span>
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                step === 1 ? "text-emerald-400" : "text-text-light/40"
              }`}
            >
              Segmento
            </span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-border" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                step >= 2
                  ? "bg-emerald-500 text-black"
                  : "bg-white/10 text-text-light/40"
              }`}
            >
              2
            </span>
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                step === 2 ? "text-emerald-400" : "text-text-light/40"
              }`}
            >
              Mensaje
            </span>
          </div>
          <div className="h-0.5 flex-1 mx-3 bg-border" />
          <div className="flex items-center gap-2">
            <span
              className={`flex h-6 w-6 items-center justify-center rounded-full text-xs font-black ${
                step === 3
                  ? "bg-emerald-500 text-black"
                  : "bg-white/10 text-text-light/40"
              }`}
            >
              3
            </span>
            <span
              className={`text-xs font-bold uppercase tracking-wider ${
                step === 3 ? "text-emerald-400" : "text-text-light/40"
              }`}
            >
              Envío
            </span>
          </div>
        </div>

        {errorMessage && (
          <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-400 flex items-center gap-2">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* PASO 1: SEGMENTACIÓN */}
        {step === 1 && (
          <div className="space-y-5">
            {/* Live Audience Banner */}
            <div className="rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-4 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400">
                  <Users className="h-5 w-5" />
                </div>
                <div>
                  <span className="text-[10px] font-black uppercase tracking-wider text-emerald-400">
                    Audiencia Objetivo
                  </span>
                  <p className="text-xl font-black text-text-light">
                    {isLoadingAudience ? (
                      <span className="flex items-center gap-2 text-sm text-text-light/60">
                        <Loader2 className="h-4 w-4 animate-spin text-emerald-400" />
                        Calculando clientes...
                      </span>
                    ) : (
                      `${audienceCount ?? 0} cliente(s) recibirán este correo`
                    )}
                  </p>
                </div>
              </div>
              <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-xs font-bold text-emerald-300">
                Solo con email
              </span>
            </div>

            {/* Inactivity filter */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-text-light/60 uppercase tracking-wider flex items-center gap-1.5">
                <Clock className="h-3.5 w-3.5 text-text-light/40" />
                Días de Inactividad (Sin visitar)
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Todos", value: 0 },
                  { label: "15+ días", value: 15 },
                  { label: "30+ días", value: 30 },
                  { label: "60+ días", value: 60 },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setInactiveDays(item.value)}
                    className={`rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
                      inactiveDays === item.value
                        ? "border-emerald-500 bg-emerald-500/15 text-emerald-400 shadow-sm"
                        : "border-border bg-card text-text-light/70 hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Points filter */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-text-light/60 uppercase tracking-wider flex items-center gap-1.5">
                <Award className="h-3.5 w-3.5 text-amber-400" />
                Saldo Mínimo de Puntos
              </label>
              <div className="grid grid-cols-4 gap-2">
                {[
                  { label: "Sin mínimo", value: 0 },
                  { label: "50+ pts", value: 50 },
                  { label: "100+ pts", value: 100 },
                  { label: "200+ pts", value: 200 },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setMinPoints(item.value)}
                    className={`rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
                      minPoints === item.value
                        ? "border-amber-400 bg-amber-500/15 text-amber-300 shadow-sm"
                        : "border-border bg-card text-text-light/70 hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Frequency filter */}
            <div className="space-y-2">
              <label className="text-xs font-extrabold text-text-light/60 uppercase tracking-wider flex items-center gap-1.5">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                Frecuencia de Compra
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { label: "Todos", value: "all" },
                  { label: "Recurrentes (3+)", value: "recurrent" },
                  { label: "Solo Inactivos", value: "inactive" },
                ].map((item) => (
                  <button
                    key={item.value}
                    type="button"
                    onClick={() => setFrequency(item.value as any)}
                    className={`rounded-xl border py-2 text-xs font-bold transition-all cursor-pointer ${
                      frequency === item.value
                        ? "border-purple-400 bg-purple-500/15 text-purple-300 shadow-sm"
                        : "border-border bg-card text-text-light/70 hover:bg-white/5"
                    }`}
                  >
                    {item.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Anti-Saturation Toggle */}
            <div className="rounded-xl border border-border bg-card/60 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4 text-emerald-400" />
                  <span className="text-xs font-extrabold text-text-light uppercase tracking-wider">
                    Protección Anti-Saturación
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enableAntiSaturation}
                  onChange={(e) => setEnableAntiSaturation(e.target.checked)}
                  className="h-4 w-4 rounded accent-emerald-500 cursor-pointer"
                  data-testid="anti-saturation-toggle"
                />
              </div>
              <p className="text-[11px] text-text-light/60">
                Evita enviar más de un correo promocional al mismo cliente en un periodo de tiempo.
              </p>
              {enableAntiSaturation && (
                <div className="flex items-center gap-3 pt-1">
                  {[7, 14].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => setAntiSaturationDays(days)}
                      className={`px-3 py-1 rounded-lg text-xs font-bold border transition-all cursor-pointer ${
                        antiSaturationDays === days
                          ? "bg-emerald-500/20 border-emerald-400 text-emerald-300"
                          : "border-border text-text-light/60 hover:bg-white/5"
                      }`}
                    >
                      Excluir últimos {days} días
                    </button>
                  ))}
                </div>
              )}
            </div>

            <div className="flex justify-end pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={(audienceCount ?? 0) === 0 || isLoadingAudience}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-black hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                data-testid="next-step-button"
              >
                Siguiente: Diseñar Mensaje
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASO 2: MENSAJE Y PLANTILLA */}
        {step === 2 && (
          <div className="space-y-5">
            <div>
              <label className="text-xs font-extrabold text-text-light/60 uppercase tracking-wider block mb-1">
                Nombre de la Campaña (Interno)
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ej. Reactivación Clientes Septiembre"
                className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-xs text-text-light outline-none focus:border-emerald-500 transition-colors"
                data-testid="campaign-name-input"
              />
            </div>

            {/* Template selector */}
            <div className="space-y-1.5">
              <label className="text-xs font-extrabold text-text-light/60 uppercase tracking-wider block">
                Seleccionar Plantilla
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(Object.keys(DEFAULT_TEMPLATES) as TemplateKey[]).map((key) => {
                  const t = DEFAULT_TEMPLATES[key];
                  return (
                    <button
                      key={key}
                      type="button"
                      onClick={() => handleTemplateSelect(key)}
                      className={`rounded-xl border p-3 text-left transition-all cursor-pointer ${
                        templateKey === key
                          ? "border-emerald-500 bg-emerald-500/15 shadow-sm"
                          : "border-border bg-card text-text-light/70 hover:bg-white/5"
                      }`}
                      data-testid={`template-btn-${key}`}
                    >
                      <p className="text-xs font-black text-text-light">{t.name}</p>
                      <span className="text-[10px] text-text-light/50 line-clamp-1 mt-0.5">
                        {t.badge}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Subject input */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-extrabold text-text-light/60 uppercase tracking-wider">
                  Asunto del Correo *
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-light/40">Insertar:</span>
                  {(["{nombre}", "{puntos}", "{restaurante}"] as const).map(
                    (v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariableToSubject(v)}
                        className="rounded-md bg-white/5 border border-border px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 hover:bg-white/10"
                      >
                        {v}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-xs text-text-light outline-none focus:border-emerald-500 transition-colors"
                placeholder="Asunto llamativo..."
                data-testid="campaign-subject-input"
              />
            </div>

            {/* Message content */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="text-xs font-extrabold text-text-light/60 uppercase tracking-wider">
                  Cuerpo del Mensaje *
                </label>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] text-text-light/40">Variables:</span>
                  {(["{nombre}", "{puntos}", "{restaurante}"] as const).map(
                    (v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(v)}
                        className="rounded-md bg-white/5 border border-border px-1.5 py-0.5 text-[10px] font-mono text-emerald-400 hover:bg-white/10"
                      >
                        {v}
                      </button>
                    ),
                  )}
                </div>
              </div>
              <textarea
                rows={4}
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                className="w-full rounded-xl border border-border bg-dark/40 p-3 text-xs text-text-light outline-none focus:border-emerald-500 transition-colors"
                placeholder="Escribe el mensaje..."
                data-testid="campaign-message-input"
              />
            </div>

            {/* Live Visual Preview */}
            <div className="rounded-2xl border border-border bg-card/40 p-4 space-y-3">
              <div className="flex items-center gap-2 text-xs font-extrabold text-text-light/70 uppercase tracking-wider">
                <Eye className="h-4 w-4 text-emerald-400" />
                Vista Previa del Cliente
              </div>

              <div className="rounded-xl border border-border bg-[#18181b] p-4 text-xs space-y-3 text-text-light">
                <div className="border-b border-border pb-2 flex items-center justify-between">
                  <span className="font-bold text-text-light/60">
                    Asunto: <strong className="text-text-light">{previewSubject}</strong>
                  </span>
                  <span className="text-[10px] font-mono text-emerald-400">
                    remember@trykittn.com
                  </span>
                </div>

                <div className="text-center py-2 space-y-2">
                  <span
                    className="inline-block rounded-full px-3 py-1 text-[11px] font-black uppercase tracking-wider border"
                    style={{
                      borderColor: `${primaryColor}44`,
                      backgroundColor: `${primaryColor}18`,
                      color: primaryColor,
                    }}
                  >
                    {DEFAULT_TEMPLATES[templateKey].badge}
                  </span>
                  <p className="font-black text-sm text-white">{tenantName}</p>
                </div>

                {minPoints > 0 && (
                  <div className="rounded-xl border border-border bg-dark/60 p-3 text-center">
                    <span className="text-[10px] font-bold text-amber-400 block">
                      ⭐ Tu Saldo de Puntos
                    </span>
                    <strong className="text-lg text-amber-300">150 puntos</strong>
                  </div>
                )}

                <div className="whitespace-pre-line text-xs text-text-light/90 leading-relaxed bg-dark/20 p-3 rounded-lg">
                  {previewBody}
                </div>

                <div className="pt-2 text-center">
                  <span
                    className="inline-block rounded-xl px-4 py-2 text-xs font-black text-black shadow-md cursor-default"
                    style={{ backgroundColor: primaryColor }}
                  >
                    🍽️ Ver Menú y Ordenar →
                  </span>
                </div>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(1)}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-text-light/70 hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer"
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </button>
              <button
                type="button"
                onClick={() => setStep(3)}
                disabled={!subject.trim() || !messageContent.trim()}
                className="rounded-xl bg-emerald-500 px-5 py-2.5 text-xs font-black text-black hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-40"
                data-testid="go-to-confirm-button"
              >
                Siguiente: Confirmar
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}

        {/* PASO 3: CONFIRMACIÓN Y ENVÍO */}
        {step === 3 && (
          <div className="space-y-5">
            <div className="rounded-2xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-3 border-b border-border pb-3">
                <div className="rounded-xl bg-emerald-500/20 p-2.5 text-emerald-400">
                  <CheckCircle2 className="h-5 w-5" />
                </div>
                <div>
                  <h3 className="text-sm font-black text-text-light">
                    Resumen del Despacho
                  </h3>
                  <p className="text-xs text-text-light/50">
                    Revisa los detalles antes de enviar
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="rounded-xl bg-dark/40 p-3 border border-border">
                  <span className="text-text-light/50 block text-[10px] font-bold uppercase">
                    Campaña
                  </span>
                  <strong className="text-text-light font-bold">
                    {name.trim() || DEFAULT_TEMPLATES[templateKey].name}
                  </strong>
                </div>

                <div className="rounded-xl bg-dark/40 p-3 border border-border">
                  <span className="text-text-light/50 block text-[10px] font-bold uppercase">
                    Destinatarios Estimados
                  </span>
                  <strong className="text-emerald-400 font-bold text-sm">
                    {audienceCount} cliente(s)
                  </strong>
                </div>

                <div className="rounded-xl bg-dark/40 p-3 border border-border">
                  <span className="text-text-light/50 block text-[10px] font-bold uppercase">
                    Plantilla
                  </span>
                  <span className="text-text-light font-bold">
                    {DEFAULT_TEMPLATES[templateKey].name}
                  </span>
                </div>

                <div className="rounded-xl bg-dark/40 p-3 border border-border">
                  <span className="text-text-light/50 block text-[10px] font-bold uppercase">
                    Remitente Oficial
                  </span>
                  <span className="text-text-light font-mono text-[11px]">
                    remember@trykittn.com
                  </span>
                </div>
              </div>

              <div className="rounded-xl bg-dark/40 p-3 border border-border space-y-1">
                <span className="text-text-light/50 block text-[10px] font-bold uppercase">
                  Asunto
                </span>
                <p className="text-xs font-bold text-text-light">{subject}</p>
              </div>
            </div>

            <div className="flex justify-between pt-3 border-t border-border">
              <button
                type="button"
                onClick={() => setStep(2)}
                disabled={isSubmitting}
                className="rounded-xl border border-border px-4 py-2.5 text-xs font-bold text-text-light/70 hover:bg-white/5 transition-all flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <ArrowLeft className="h-4 w-4" />
                Atrás
              </button>
              <button
                type="button"
                onClick={handleSubmit}
                disabled={isSubmitting || (audienceCount ?? 0) === 0}
                className="rounded-xl bg-emerald-500 px-6 py-2.5 text-xs font-black text-black hover:brightness-105 active:scale-95 transition-all flex items-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 disabled:opacity-50"
                data-testid="send-campaign-button"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Enviando Campaña...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4" />
                    Enviar Campaña Ahora
                  </>
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
}
