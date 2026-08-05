"use client";

import React, { useState, useRef } from "react";
import { updateTenantSettings } from "@/app/admin/settings/actions";
import { Sliders, Building, CheckCircle2, AlertCircle, Upload, Sparkles, FileText, Check } from "lucide-react";
import type { TenantContextType } from "@/lib/tenant";

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

  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

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
                className={`relative flex flex-col items-center justify-center p-8 rounded-xl border-2 border-dashed transition-all duration-300 ${
                  isDragging
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
                      className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition duration-200 cursor-pointer ${
                        isSelected
                          ? "border-primary bg-primary/10 ring-1 ring-primary/30"
                          : "border-border bg-dark/20 hover:bg-dark/40 hover:border-text-light/20"
                      }`}
                    >
                      <div className="flex -space-x-1 shrink-0">
                        <div
                          className="h-[18px] w-[18px] rounded-full border border-black/30 shadow-sm"
                          style={{ backgroundColor: preset.primary }}
                        />
                        <div
                          className="h-[18px] w-[18px] rounded-full border border-black/30 shadow-sm"
                          style={{ backgroundColor: preset.secondary }}
                        />
                        <div
                          className="h-[18px] w-[18px] rounded-full border border-black/30 shadow-sm"
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

