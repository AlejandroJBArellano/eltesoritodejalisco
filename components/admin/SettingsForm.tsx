"use client";

import React, { useState } from "react";
import { updateTenantSettings } from "@/app/admin/settings/actions";
import { Sliders, Building, CheckCircle2, AlertCircle } from "lucide-react";
import type { TenantContextType } from "@/lib/tenant";

interface SettingsFormProps {
  initialTenant: TenantContextType;
}

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

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setLogoPreview(URL.createObjectURL(file));
    }
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
    <form onSubmit={handleSubmit} className="space-y-6 max-w-4xl mx-auto pb-12">
      {/* Alert Banner */}
      {success && (
        <div className="rounded-xl p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-sm font-bold flex items-center gap-2.5">
          <CheckCircle2 className="h-5 w-5 shrink-0" />
          <span>
            ¡Configuración actualizada con éxito! Los cambios se aplicaron de
            inmediato.
          </span>
        </div>
      )}

      {error && (
        <div className="rounded-xl p-4 bg-red-500/10 border border-red-500/20 text-red-400 text-sm font-bold flex items-center gap-2.5">
          <AlertCircle className="h-5 w-5 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: 2 columns */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {/* Left Column: Form Fields */}
        <div className="md:col-span-2 space-y-6">
          {/* Section 1: General Info */}
          <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-sm font-bold text-text-light/50 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Building className="h-4 w-4" /> Datos de la Empresa
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-light/40 uppercase tracking-wider block mb-1">
                  Nombre del Restaurante *
                </label>
                <input
                  type="text"
                  name="name"
                  required
                  defaultValue={initialTenant.name}
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-blue-500 transition"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-light/40 uppercase tracking-wider block mb-1">
                  Nombre del Sistema (OS)
                </label>
                <input
                  type="text"
                  name="systemName"
                  defaultValue={initialTenant.system_name}
                  placeholder="KittnOS"
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-blue-500 transition"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-light/40 uppercase tracking-wider block mb-2">
                Logotipo del Restaurante
              </label>

              <div className="flex flex-col sm:flex-row items-center gap-6 p-4 rounded-xl border border-border bg-card/50">
                {/* Logo Preview box */}
                <div className="h-20 w-20 shrink-0 rounded-2xl border border-border bg-background overflow-hidden flex items-center justify-center relative group">
                  {logoPreview ? (
                    <img
                      src={logoPreview}
                      alt="Logo preview"
                      className="h-full w-full object-contain p-2"
                    />
                  ) : (
                    <span className="text-[10px] font-bold text-text-light/30 uppercase tracking-wider text-center px-1">
                      Sin Logo
                    </span>
                  )}
                </div>

                {/* Upload action */}
                <div className="flex-1 space-y-2 w-full">
                  <input
                    type="file"
                    name="logoFile"
                    accept="image/*"
                    onChange={handleFileChange}
                    className="block w-full text-xs text-slate-400
                      file:mr-4 file:py-2 file:px-4
                      file:rounded-full file:border-0
                      file:text-xs file:font-semibold
                      file:bg-blue-600/15 file:text-blue-400
                      hover:file:bg-blue-600/20
                      file:transition-all file:cursor-pointer"
                  />
                  <p className="text-[10px] text-text-light/40 font-medium leading-relaxed">
                    Soporta imágenes JPG, PNG o SVG. Recomendado formato
                    cuadrado de al menos 200x200px.
                  </p>
                </div>
              </div>

              {/* Keep the current logoUrl if uploader is not used */}
              <input
                type="hidden"
                name="logoUrl"
                value={initialTenant.logo_url || ""}
              />
            </div>
          </div>

          {/* Section 2: Ticket Config */}
          <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-sm font-bold text-text-light/50 uppercase tracking-wider flex items-center gap-2 mb-2">
              📄 Configuración del Ticket Físcal
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-xs font-bold text-text-light/40 uppercase tracking-wider block mb-1">
                  RFC
                </label>
                <input
                  type="text"
                  name="rfc"
                  defaultValue={initialTenant.rfc || ""}
                  placeholder="AIVK991104QJ0"
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-blue-500 transition font-mono uppercase"
                />
              </div>
              <div>
                <label className="text-xs font-bold text-text-light/40 uppercase tracking-wider block mb-1">
                  Código Postal (C.P.)
                </label>
                <input
                  type="text"
                  name="postalCode"
                  defaultValue={initialTenant.postal_code || ""}
                  placeholder="09090"
                  className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-blue-500 transition font-mono"
                />
              </div>
            </div>

            <div>
              <label className="text-xs font-bold text-text-light/40 uppercase tracking-wider block mb-1">
                Régimen Fiscal
              </label>
              <input
                type="text"
                name="regimenFiscal"
                defaultValue={initialTenant.regimen_fiscal || ""}
                placeholder="626 - Simplificado de Confianza (RESICO)"
                className="w-full rounded-xl border border-border bg-dark/40 px-4 py-2.5 text-sm text-text-light outline-none focus:border-blue-500 transition"
              />
            </div>
          </div>
        </div>

        {/* Right Column: Visual Theme / Colors */}
        <div className="space-y-6">
          <div className="rounded-2xl bg-card border border-border p-6 space-y-4">
            <h3 className="text-sm font-bold text-text-light/50 uppercase tracking-wider flex items-center gap-2 mb-2">
              <Sliders className="h-4 w-4" /> Colores de Marca
            </h3>

            {/* Color 1: Primary */}
            <div>
              <label className="text-xs font-bold text-text-light/40 uppercase tracking-wider block mb-1">
                Color Primario
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-0"
                />
                <input
                  type="text"
                  name="primaryColor"
                  value={primaryColor}
                  onChange={(e) => setPrimaryColor(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-dark/40 px-4 py-2 text-sm text-text-light outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Color 2: Secondary */}
            <div>
              <label className="text-xs font-bold text-text-light/40 uppercase tracking-wider block mb-1">
                Color Secundario
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-0"
                />
                <input
                  type="text"
                  name="secondaryColor"
                  value={secondaryColor}
                  onChange={(e) => setSecondaryColor(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-dark/40 px-4 py-2 text-sm text-text-light outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Color 3: Dark Background */}
            <div>
              <label className="text-xs font-bold text-text-light/40 uppercase tracking-wider block mb-1">
                Fondo Oscuro
              </label>
              <div className="flex gap-2">
                <input
                  type="color"
                  value={darkBgColor}
                  onChange={(e) => setDarkBgColor(e.target.value)}
                  className="h-10 w-10 cursor-pointer rounded-lg border border-border bg-transparent p-0"
                />
                <input
                  type="text"
                  name="darkBgColor"
                  value={darkBgColor}
                  onChange={(e) => setDarkBgColor(e.target.value)}
                  className="flex-1 rounded-xl border border-border bg-dark/40 px-4 py-2 text-sm text-text-light outline-none focus:border-blue-500 font-mono"
                />
              </div>
            </div>

            {/* Live Preview Box */}
            <div className="border border-border rounded-xl p-4 bg-black/20 text-center space-y-2 mt-4">
              <span className="text-[10px] font-bold text-text-light/40 uppercase tracking-widest block">
                Vista Previa de Botón
              </span>
              <button
                type="button"
                className="w-full py-2.5 rounded-xl font-black text-xs text-white uppercase tracking-wider shadow-lg transition-transform active:scale-95 pointer-events-none"
                style={{
                  background: `linear-gradient(to right, ${primaryColor}, ${secondaryColor})`,
                  boxShadow: `0 4px 14px 0 ${primaryColor}20`,
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
          className="rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-extrabold px-8 py-3.5 text-sm uppercase tracking-wider transition active:scale-95 shadow-md shadow-blue-500/10 cursor-pointer"
        >
          {loading ? "Guardando..." : "Guardar Cambios"}
        </button>
      </div>
    </form>
  );
}
