"use client";

import { Check, Sliders, Sparkles, Upload } from "lucide-react";
import { useSettingsContext } from "./SettingsContext";
import { COLOR_PRESETS, getContrastColor } from "./types";

export function SettingsBrandingSection() {
  const {
    primaryColor,
    setPrimaryColor,
    secondaryColor,
    setSecondaryColor,
    darkBgColor,
    setDarkBgColor,
    logoPreview,
    handleRemoveLogo,
    isDragging,
    fileInputRef,
    handleFileSelect,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    handleApplyPreset,
  } = useSettingsContext();

  return (
    <div className="space-y-6">
      {/* Logotipo e Identidad Visual */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20">
        <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
          <Upload className="h-4 w-4 text-primary" /> Logotipo e Identidad Visual
        </h3>

        <div className="space-y-4">
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
              onChange={handleFileSelect}
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

          <input type="hidden" name="logoUrl" value={logoPreview || ""} />
        </div>
      </div>

      {/* Colores de Marca */}
      <div className="rounded-2xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20">
        <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2 border-b border-border pb-3">
          <Sliders className="h-4 w-4 text-primary" /> Colores de Marca
        </h3>

        {/* Paletas Recomendadas */}
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
                  onClick={() => handleApplyPreset(preset)}
                  aria-pressed={isSelected}
                  className={`flex items-center gap-3 p-2.5 rounded-xl border text-left transition duration-200 cursor-pointer ${
                    isSelected
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

        {/* Pickers Personalizados */}
        <div className="space-y-4 pt-2">
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
  );
}
