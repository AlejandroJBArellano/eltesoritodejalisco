"use client";

import { Building, QrCode, Share2, Star } from "lucide-react";
import { useSettingsContext } from "./SettingsContext";

export function SettingsGeneralSection() {
  const { initialTenant } = useSettingsContext();

  return (
    <div className="space-y-6">
      {/* Información General */}
      <div className="rounded-xl bg-card border border-border p-6 space-y-6 transition hover:border-border/80 shadow-sm">
        <h3 className="text-xs font-black text-text-light/60 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
          <Building className="h-4 w-4 text-primary" /> Información General
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
              placeholder="El Tesorito de Jalisco"
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition"
            />
            <p className="text-[10px] text-text-light/40 mt-1.5">
              Visible en tickets y pantalla principal.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block mb-1.5">
              Nombre del Sistema
            </label>
            <input
              type="text"
              name="systemName"
              defaultValue={initialTenant.system_name || "KittnOS"}
              placeholder="KittnOS"
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition"
            />
            <p className="text-[10px] text-text-light/40 mt-1.5">
              Visible en la barra de navegación (ej. TesoritoOS).
            </p>
          </div>
        </div>
      </div>

      {/* Códigos QR y Redes del Ticket */}
      <div className="rounded-xl bg-card border border-border p-6 space-y-6 transition hover:border-border/80 shadow-sm">
        <h3 className="text-xs font-black text-text-light/60 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
          <QrCode className="h-4 w-4 text-primary" /> QR y Redes del Ticket
        </h3>

        <p className="text-xs text-text-light/60 leading-relaxed">
          Configura los accesos impresos al pie del ticket. El QR del menú
          digital se incluye por defecto.
        </p>

        <div className="space-y-4">
          <div>
            <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Star className="h-3.5 w-3.5 text-amber-400" /> Enlace de Reseñas
              (Google Maps)
            </label>
            <input
              type="url"
              name="googleReviewsUrl"
              defaultValue={initialTenant.google_reviews_url || ""}
              placeholder="https://maps.app.goo.gl/..."
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition font-mono"
            />
            <p className="text-[10px] text-text-light/40 mt-1.5">
              Imprime un QR de "Califícanos" junto al menú. Déjalo vacío para no
              incluirlo.
            </p>
          </div>

          <div>
            <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider flex items-center gap-1.5 mb-1.5">
              <Share2 className="h-3.5 w-3.5 text-primary" /> Redes Sociales o
              Mensaje
            </label>
            <input
              type="text"
              name="ticketFooterText"
              defaultValue={initialTenant.ticket_footer_text || ""}
              placeholder="📸 @el_tesorito_jalisco • 💬 33 1234 5678"
              className="w-full rounded-lg border border-border bg-background px-4 py-2 text-sm text-text-light outline-none focus:border-primary focus:ring-1 focus:ring-primary/40 transition"
            />
            <p className="text-[10px] text-text-light/40 mt-1.5">
              Texto impreso debajo de los QR (ej. Instagram, WhatsApp o
              promociones).
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
