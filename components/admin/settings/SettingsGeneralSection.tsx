"use client";

import { Building, QrCode, Share2, Star } from "lucide-react";
import { useSettingsContext } from "./SettingsContext";

export function SettingsGeneralSection() {
  const { initialTenant } = useSettingsContext();

  return (
    <div className="space-y-6">
      {/* Información General */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20">
        <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
          <Building className="h-4 w-4 text-primary" /> Información General
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          <div>
            <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
              Nombre del Restaurante / Sucursal *
            </label>
            <input
              type="text"
              name="name"
              required
              defaultValue={initialTenant.name}
              placeholder="El Tesorito de Jalisco"
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
            <p className="text-[10px] text-text-light/40 mt-1.5">
              Nombre comercial que aparecerá en el encabezado de los tickets y pantalla principal.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
              Nombre del Sistema (Branding)
            </label>
            <input
              type="text"
              name="systemName"
              defaultValue={initialTenant.system_name || "KittnOS"}
              placeholder="KittnOS"
              className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary transition"
            />
            <p className="text-[10px] text-text-light/40 mt-1.5">
              Nombre que se muestra en la barra de navegación superior (ej. TesoritoOS).
            </p>
          </div>
        </div>
      </div>

      {/* Códigos QR y Redes del Ticket */}
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
    </div>
  );
}
