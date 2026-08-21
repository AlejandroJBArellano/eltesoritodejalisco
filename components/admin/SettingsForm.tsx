"use client";

import { updateTenantSettings } from "@/app/admin/settings/actions";
import type { TenantContextType } from "@/lib/tenant";
import {
  AlertCircle,
  ArrowRight,
  Building,
  Check,
  CheckCircle2,
  Copy,
  ExternalLink,
  FileText,
  Gift,
  Globe,
  QrCode,
  Share2,
  ShoppingBag,
  Sliders,
  Sparkles,
  Star,
  Upload,
} from "lucide-react";
import React, { useRef, useState } from "react";

interface SettingsFormProps {
  initialTenant: TenantContextType;
}

const COLOR_PRESETS = [
  {
    name: "Rosa",
    primary: "#FFB7CE",
    secondary: "#FFD1DC",
    darkBg: "#121212",
  },
  {
    name: "Warm Amber",
    primary: "#F2A104",
    secondary: "#D95204",
    darkBg: "#14100E",
  },
  {
    name: "Esmeralda",
    primary: "#10B981",
    secondary: "#047857",
    darkBg: "#0B0F12",
  },
  {
    name: "Classic Steakhouse",
    primary: "#EF4444",
    secondary: "#B91C1C",
    darkBg: "#110D0D",
  },
  {
    name: "Electric Neon",
    primary: "#3B82F6",
    secondary: "#8B5CF6",
    darkBg: "#0B0C10",
  },
];

export function SettingsForm({ initialTenant }: SettingsFormProps) {
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Live preview state
  const [primaryColor, setPrimaryColor] = useState(
    initialTenant.primary_color || "#FFB7CE",
  );
  const [secondaryColor, setSecondaryColor] = useState(
    initialTenant.secondary_color || "#FFD1DC",
  );
  const [darkBgColor, setDarkBgColor] = useState(
    initialTenant.dark_bg_color || "#121212",
  );

  const [logoPreview, setLogoPreview] = useState<string | null>(
    initialTenant.logo_url || null,
  );

  const [loyaltyEnabled, setLoyaltyEnabled] = useState<boolean>(
    initialTenant.loyalty_enabled !== false,
  );
  const [loyaltyRatio, setLoyaltyRatio] = useState<number>(
    initialTenant.loyalty_ratio || 10,
  );

  const [isDragging, setIsDragging] = useState(false);
  const [connectingStripe, setConnectingStripe] = useState(false);
  const [copied, setCopied] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const pickupUrl =
    typeof window !== "undefined" && window.location.hostname.endsWith(".localhost")
      ? `http://${initialTenant.slug}.localhost:5173`
      : `https://${initialTenant.slug}.trykittn.com`;

  const handleCopyLink = async () => {
    try {
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(pickupUrl);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }
    } catch (err) {
      console.error("Error al copiar enlace:", err);
    }
  };

  const handleStripeConnect = async () => {
    try {
      setConnectingStripe(true);
      setError(null);
      const res = await fetch("/api/stripe/connect/onboarding-link", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else {
        setError(data.error || "Error al conectar con Stripe");
      }
    } catch (err) {
      console.error(err);
      setError("Error de red al conectar con Stripe");
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleStripeLogin = async () => {
    try {
      setConnectingStripe(true);
      setError(null);
      const res = await fetch("/api/stripe/connect/login-link", {
        method: "POST",
      });
      const data = await res.json();
      if (data.url) {
        window.open(data.url, "_blank");
      } else {
        setError(data.error || "Error al abrir el panel de Stripe");
      }
    } catch (err) {
      console.error(err);
      setError("Error de red al consultar Stripe");
    } finally {
      setConnectingStripe(false);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
      if (fileInputRef.current) {
        const dataTransfer = new DataTransfer();
        dataTransfer.items.add(file);
        fileInputRef.current.files = dataTransfer.files;
      }
    }
  };

  const handleRemoveLogo = (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    setLogoPreview(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const applyPreset = (preset: typeof COLOR_PRESETS[0]) => {
    setPrimaryColor(preset.primary);
    setSecondaryColor(preset.secondary);
    setDarkBgColor(preset.darkBg);
  };

  /** Returns #121212 or #f5f5f5 depending on the relative luminance of the hex color. */
  const getContrastColor = (hex: string): string => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    // Perceived luminance (WCAG formula)
    const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return luminance > 0.55 ? "#121212" : "#f5f5f5";
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSuccess(false);
    setError(null);
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    const result = await updateTenantSettings(formData);

    setLoading(false);
    if (result.error) {
      setError(result.error);
    } else if (result.success) {
      setSuccess(true);
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-7xl mx-auto pb-12">
      {/* Alert Banner */}
      {success && (
        <div className="rounded-2xl p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg shadow-emerald-500/5">
          <CheckCircle2 className="h-5 w-5 shrink-0 text-emerald-400" />
          <span>
            ¡Configuración actualizada con éxito! Los cambios se aplicaron de
            inmediato.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-2xl p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-3 animate-in fade-in slide-in-from-top-2 duration-300 shadow-lg shadow-red-500/5">
          <AlertCircle className="h-5 w-5 shrink-0 text-red-400" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Config Forms */}
        <div className="lg:col-span-2 space-y-8">
          {/* Section 1: General Info */}
          <div className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20">
            <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
              <Building className="h-4 w-4 text-primary" /> Datos de la Empresa
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
                  Nombre del Restaurante *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={initialTenant.name}
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
                  Nombre del Sistema (OS)
                </label>
                <input
                  type="text"
                  name="systemName"
                  defaultValue={initialTenant.system_name}
                  placeholder="KittnOS"
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
              </div>
            </div>

            {/* Custom Drag & Drop Logo Uploader */}
            <div className="space-y-2">
              <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block">
                Logotipo del Restaurante
              </label>

              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-300 ${isDragging
                    ? "border-primary bg-primary/5"
                    : "border-border bg-dark/20 hover:bg-dark/30 hover:border-text-light/20"
                  }`}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  name="logoFile"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="absolute inset-0 opacity-0 w-full h-full cursor-pointer z-10"
                />

                {logoPreview ? (
                  <div className="flex flex-col items-center gap-4 text-center">
                    <div className="h-24 w-24 rounded-xl border border-border bg-background overflow-hidden flex items-center justify-center p-2 relative group shadow-inner">
                      <img
                        src={logoPreview}
                        alt="Logo preview"
                        className="h-full w-full object-contain"
                      />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-text-light">Logotipo cargado</p>
                      <p className="text-[10px] text-text-light/40">Arrastra una nueva imagen para cambiarla</p>
                    </div>
                    <button
                      type="button"
                      onClick={handleRemoveLogo}
                      className="relative z-20 px-3.5 py-1.5 rounded-lg text-xs font-bold uppercase tracking-wider text-red-400 bg-red-500/10 hover:bg-red-500/20 border border-red-500/20 transition cursor-pointer"
                    >
                      Eliminar Logo
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col items-center gap-3 text-center py-4">
                    <div className="h-12 w-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mb-1">
                      <Upload className="h-6 w-6" />
                    </div>
                    <div className="space-y-1">
                      <p className="text-xs font-bold text-text-light">
                        Arrastra tu logotipo aquí, o <span className="text-primary hover:underline">haz clic para buscar</span>
                      </p>
                      <p className="text-[10px] text-text-light/40">
                        Soporta imágenes JPG, PNG o SVG. Recomendado formato cuadrado de mín. 200x200px.
                      </p>
                    </div>
                  </div>
                )}
              </div>

              {/* Keep current logo_url if uploader is not used */}
              <input
                type="hidden"
                name="logoUrl"
                value={logoPreview || ""}
              />
            </div>
          </div>

          {/* Section 2: Ticket Config */}
          <div className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20">
            <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
              <FileText className="h-4 w-4 text-primary" /> Configuración del Ticket Fiscal
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
              <div>
                <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
                  RFC
                </label>
                <input
                  type="text"
                  name="rfc"
                  defaultValue={initialTenant.rfc || ""}
                  placeholder="AIVK991104QJ0"
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
                  Código Postal (C.P.)
                </label>
                <input
                  type="text"
                  name="postalCode"
                  defaultValue={initialTenant.postal_code || ""}
                  placeholder="09090"
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-mono"
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
                className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
              />
            </div>
          </div>

          {/* Section 2.5: Códigos QR y Redes del Ticket */}
          <div className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20">
            <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
              <QrCode className="h-4 w-4 text-primary" /> Personalización de QRs y Redes en el Ticket
            </h3>

            <p className="text-xs text-text-light/60 leading-relaxed">
              Configura los accesos y redes que se imprimirán en el pie de página de tus tickets de venta. El sistema imprimirá automáticamente un QR para tu menú digital de <strong className="text-text-light">Kittn Pickup</strong> y, si lo configuras, un segundo QR para <strong className="text-text-light">Reseñas en Google Maps</strong>.
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Star className="h-3.5 w-3.5 text-amber-400" /> Enlace para Reseñas (Google Maps / TripAdvisor)
                </label>
                <input
                  type="url"
                  name="googleReviewsUrl"
                  defaultValue={initialTenant.google_reviews_url || ""}
                  placeholder="https://g.page/r/CbXxExample/review o https://maps.app.goo.gl/..."
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary transition font-mono"
                />
                <p className="text-[10px] text-text-light/40 mt-1.5">
                  Al ingresar este enlace, tu ticket imprimirá 2 códigos QR en paralelo: <strong>[Menú en Línea]</strong> y <strong>[Califícanos]</strong>. Si lo dejas vacío, solo se mostrará el QR del menú.
                </p>
              </div>

              <div>
                <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
                  <Share2 className="h-3.5 w-3.5 text-primary" /> Redes Sociales o Mensaje en el Ticket
                </label>
                <input
                  type="text"
                  name="ticketFooterText"
                  defaultValue={initialTenant.ticket_footer_text || ""}
                  placeholder="📸 @el_tesorito_jalisco • 🎵 @tesorito • 💬 33 1234 5678"
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
                />
                <p className="text-[10px] text-text-light/40 mt-1.5">
                  Línea de texto personalizada que se imprimirá debajo de los códigos QR (ej. tus usuarios de Instagram, TikTok o promociones).
                </p>
              </div>
            </div>
          </div>

          {/* Section 3: Loyalty Program */}
          <div className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20">
            <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
              <Gift className="h-4 w-4 text-primary" /> Programa de Lealtad (CRM)
            </h3>

            <div className="flex items-center justify-between p-4 rounded-xl bg-dark/20 border border-border/50">
              <div className="space-y-1">
                <span className="text-sm font-bold text-text-light block">Activar Programa de Lealtad</span>
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
                className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out outline-none ${loyaltyEnabled ? "bg-primary" : "bg-dark/60"
                  } border border-border`}
              >
                <span
                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-text-light shadow ring-0 transition duration-200 ease-in-out ${loyaltyEnabled ? "translate-x-5" : "translate-x-0"
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
                      onChange={(e) => setLoyaltyRatio(Math.max(1, parseInt(e.target.value) || 1))}
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

            {/* Section 4: Portal Kittn Pickup & Pagos con Stripe */}
            <div id="pickup" className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20 scroll-mt-6">
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

              {/* Estado de Cuenta Stripe */}
              <div className="space-y-4">
                {initialTenant.stripe_charges_enabled ? (
                  <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-emerald-300">Cuenta de Stripe Activa & Cobros Habilitados</h4>
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
                    <div className="flex items-center gap-3">
                      <AlertCircle className="h-5 w-5 text-amber-400 shrink-0" />
                      <div>
                        <h4 className="text-sm font-bold text-amber-300">Verificación Pendiente en Stripe</h4>
                        <p className="text-xs text-amber-200/70">
                          Tu cuenta de Stripe requiere información fiscal o bancaria adicional antes de poder recibir pagos de clientes en Kittn Pickup.
                        </p>
                      </div>
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
                      <h4 className="text-sm font-bold text-text-light">Conecta tu cuenta bancaria con Stripe</h4>
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
            </div>
          </div>

          {/* Right Column: Visual Theme / Presets */}
          <div className="space-y-8">
          <div className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20">
            <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
              <Sliders className="h-4 w-4 text-primary" /> Colores de Marca
            </h3>

            {/* Suggested Color Palettes */}
            <div className="space-y-3">
              <label className="text-xs font-bold text-text-light/50 uppercase tracking-wider flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-primary animate-pulse" /> Paletas Recomendadas
              </label>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-1">
                {COLOR_PRESETS.map((preset) => {
                  const isSelected =
                    primaryColor.toLowerCase() === preset.primary.toLowerCase() &&
                    secondaryColor.toLowerCase() === preset.secondary.toLowerCase() &&
                    darkBgColor.toLowerCase() === preset.darkBg.toLowerCase();
                  return (
                    <button
                      key={preset.name}
                      type="button"
                      onClick={() => applyPreset(preset)}
                      aria-pressed={isSelected}
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition duration-200 cursor-pointer ${isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border bg-dark/20 hover:bg-dark/40 hover:border-text-light/20"
                        }`}
                    >
                      <div className="flex -space-x-1 shrink-0">
                        <div
                          className="size-4.5 rounded-full border border-black/30 shadow-sm"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div
                          className="size-4.5 rounded-full border border-black/30 shadow-sm"
                          style={{ backgroundColor: preset.secondary }}
                        />
                        <div
                          className="size-4.5 rounded-full border border-black/30 shadow-sm"
                          style={{ backgroundColor: preset.darkBg }}
                        />
                      </div>
                      <span className="text-xs font-bold truncate text-text-light flex-1">
                        {preset.name}
                      </span>
                      {isSelected && (
                        <Check className="h-3.5 w-3.5 shrink-0 text-primary" aria-hidden="true" />
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom color configuration pickers */}
            <div className="space-y-4 pt-2">
              {/* Color 1: Primary */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-light/50 uppercase tracking-wider block">
                  Color Primario
                </label>
                <div className="flex gap-2.5 items-center">
                  <div
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-xl border border-border relative overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-sm"
                    style={{ backgroundColor: primaryColor }}
                  >
                    <input
                      type="color"
                      value={primaryColor}
                      aria-label="Seleccionar color primario"
                      onChange={(e) => setPrimaryColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    name="primaryColor"
                    value={primaryColor}
                    onChange={(e) => setPrimaryColor(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono transition"
                  />
                </div>
              </div>

              {/* Color 2: Secondary */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-light/50 uppercase tracking-wider block">
                  Color Secundario
                </label>
                <div className="flex gap-2.5 items-center">
                  <div
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-xl border border-border relative overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-sm"
                    style={{ backgroundColor: secondaryColor }}
                  >
                    <input
                      type="color"
                      value={secondaryColor}
                      aria-label="Seleccionar color secundario"
                      onChange={(e) => setSecondaryColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    name="secondaryColor"
                    value={secondaryColor}
                    onChange={(e) => setSecondaryColor(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono transition"
                  />
                </div>
              </div>

              {/* Color 3: Dark Background */}
              <div className="space-y-1.5">
                <label className="text-xs font-bold text-text-light/50 uppercase tracking-wider block">
                  Fondo Oscuro
                </label>
                <div className="flex gap-2.5 items-center">
                  <div
                    className="h-10 w-10 shrink-0 cursor-pointer rounded-xl border border-border relative overflow-hidden transition-transform hover:scale-105 active:scale-95 shadow-sm"
                    style={{ backgroundColor: darkBgColor }}
                  >
                    <input
                      type="color"
                      value={darkBgColor}
                      aria-label="Seleccionar color de fondo oscuro"
                      onChange={(e) => setDarkBgColor(e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </div>
                  <input
                    type="text"
                    name="darkBgColor"
                    value={darkBgColor}
                    onChange={(e) => setDarkBgColor(e.target.value)}
                    className="flex-1 rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary font-mono transition"
                  />
                </div>
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="border border-border rounded-xl p-4 bg-black/30 text-center space-y-3 mt-2">
              <span className="text-[10px] font-bold text-text-light/40 uppercase tracking-widest block">
                Vista Previa de Botón
              </span>
              <button
                type="button"
                className="w-full py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg transition active:scale-95 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                  color: getContrastColor(primaryColor),
                  boxShadow: `0 4px 14px 0 ${primaryColor}40`,
                }}
              >
                Comprar / Pagar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Form Actions */}
      <div className="flex justify-end gap-3 border-t border-border pt-6">
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl font-extrabold px-8 py-3.5 text-sm uppercase tracking-wider transition active:scale-95 shadow-lg cursor-pointer flex items-center justify-center gap-2 disabled:cursor-not-allowed"
          style={{
            background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
            color: getContrastColor(primaryColor),
            boxShadow: `0 4px 14px 0 ${primaryColor}30`,
            opacity: loading ? 0.7 : 1,
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-dark" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              Guardando...
            </>
          ) : (
            "Guardar Cambios"
          )}
        </button>
      </div>
    </form>
  );
}

