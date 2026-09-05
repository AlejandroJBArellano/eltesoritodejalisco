"use client";

import type { TenantContextType } from "@/lib/tenant";
import {
  SettingsProvider,
  useSettingsContext,
} from "./settings/SettingsContext";
import { SettingsHeaderActions } from "./settings/SettingsHeaderActions";
import { SettingsGeneralSection } from "./settings/SettingsGeneralSection";
import { SettingsFiscalSection } from "./settings/SettingsFiscalSection";
import { SettingsLoyaltySection } from "./settings/SettingsLoyaltySection";
import { SettingsPickupSection } from "./settings/SettingsPickupSection";
import { SettingsStripeSection } from "./settings/SettingsStripeSection";
import { SettingsTerminalSection } from "./settings/SettingsTerminalSection";
import { SettingsBrandingSection } from "./settings/SettingsBrandingSection";
import { getContrastColor } from "./settings/types";

export { COLOR_PRESETS, getContrastColor } from "./settings/types";
export { SettingsProvider, useSettingsContext } from "./settings/SettingsContext";

interface SettingsFormProps {
  initialTenant: TenantContextType;
}

function SettingsFormContent() {
  const {
    loading,
    primaryColor,
    secondaryColor,
    handleSubmit,
  } = useSettingsContext();

  return (
    <form onSubmit={handleSubmit} className="space-y-8 max-w-7xl mx-auto pb-12">
      <SettingsHeaderActions />

      {/* Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Left Column: Core Configurations */}
        <div className="lg:col-span-2 space-y-8">
          <SettingsGeneralSection />
          <SettingsTerminalSection />
          <SettingsFiscalSection />
          <SettingsLoyaltySection />
          <div className="space-y-4">
            <SettingsPickupSection />
            <SettingsStripeSection />
          </div>
        </div>

        {/* Right Column: Branding, Colors and Logo */}
        <div className="space-y-8">
          <SettingsBrandingSection />
        </div>
      </div>

      {/* Bottom Submit Action */}
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
              <span className="h-4 w-4 border-2 border-current border-t-transparent rounded-full animate-spin" />
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

export function SettingsForm({ initialTenant }: SettingsFormProps) {
  return (
    <SettingsProvider initialTenant={initialTenant}>
      <SettingsFormContent />
    </SettingsProvider>
  );
}
