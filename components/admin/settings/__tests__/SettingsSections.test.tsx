import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsGeneralSection } from "../SettingsGeneralSection";
import { SettingsFiscalSection } from "../SettingsFiscalSection";
import { SettingsLoyaltySection } from "../SettingsLoyaltySection";
import { SettingsBrandingSection } from "../SettingsBrandingSection";
import { SettingsPickupSection } from "../SettingsPickupSection";
import { SettingsHeaderActions } from "../SettingsHeaderActions";
import { SettingsProvider } from "../SettingsContext";
import type { TenantContextType } from "@/lib/tenant";

const mockTenant: TenantContextType = {
  id: "tenant-abc",
  name: "Restaurante Gourmet",
  slug: "gourmet",
  system_name: "GourmetOS",
  logo_url: "https://example.com/logo.jpg",
  primary_color: "#FFB7CE",
  secondary_color: "#FFD1DC",
  dark_bg_color: "#121212",
  rfc: "XAXX010101000",
  postal_code: "44100",
  regimen_fiscal: "626 - Simplificado de Confianza",
  custom_domain: null,
  loyalty_enabled: true,
  loyalty_ratio: 15,
  commission_rate: 8,
  terminal_commission_rate: 2.5,
  stripe_account_id: "acct_test",
  stripe_charges_enabled: true,
  stripe_details_submitted: true,
  google_reviews_url: "https://g.page/r/example",
  ticket_footer_text: "Gracias por su preferencia",
  attendance_tolerance_minutes: 15,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("Settings Subcomponents", () => {
  it("renders SettingsGeneralSection with default values", () => {
    render(
      <SettingsProvider initialTenant={mockTenant}>
        <SettingsGeneralSection />
      </SettingsProvider>,
    );

    expect(screen.getByDisplayValue("Restaurante Gourmet")).toBeInTheDocument();
    expect(screen.getByDisplayValue("GourmetOS")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("https://g.page/r/example"),
    ).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("Gracias por su preferencia"),
    ).toBeInTheDocument();
  });

  it("renders SettingsFiscalSection with default values", () => {
    render(
      <SettingsProvider initialTenant={mockTenant}>
        <SettingsFiscalSection />
      </SettingsProvider>,
    );

    expect(screen.getByDisplayValue("XAXX010101000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("44100")).toBeInTheDocument();
    expect(
      screen.getByDisplayValue("626 - Simplificado de Confianza"),
    ).toBeInTheDocument();
  });

  it("toggles loyalty program in SettingsLoyaltySection and preserves ratio", () => {
    render(
      <SettingsProvider initialTenant={mockTenant}>
        <SettingsLoyaltySection />
      </SettingsProvider>,
    );

    const toggleBtn = screen.getByRole("button");
    expect(screen.getByDisplayValue("15")).toBeInTheDocument();

    // Toggle off loyalty
    fireEvent.click(toggleBtn);
    expect(screen.queryByLabelText(/Pesos por Punto/i)).not.toBeInTheDocument();
  });

  it("renders SettingsBrandingSection and handles drag events", () => {
    render(
      <SettingsProvider initialTenant={mockTenant}>
        <SettingsBrandingSection />
      </SettingsProvider>,
    );

    expect(screen.getByText("Logotipo e Identidad Visual")).toBeInTheDocument();
    expect(screen.getByAltText("Logo preview")).toBeInTheDocument();

    const presetBtn = screen.getByRole("button", { name: /Esmeralda/i });
    fireEvent.click(presetBtn);

    expect(screen.getByDisplayValue("#10B981")).toBeInTheDocument();
  });

  it("renders SettingsPickupSection when Stripe is active and inactive", () => {
    const { rerender } = render(
      <SettingsProvider initialTenant={mockTenant}>
        <SettingsPickupSection />
      </SettingsProvider>,
    );

    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Listo para compartir")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar link/i })).not.toBeDisabled();

    // Inactive state
    const inactiveTenant = {
      ...mockTenant,
      stripe_charges_enabled: false,
    };

    rerender(
      <SettingsProvider initialTenant={inactiveTenant}>
        <SettingsPickupSection />
      </SettingsProvider>,
    );

    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(screen.getByText("Requiere activar Stripe")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /copiar link/i })).toBeDisabled();
  });

  it("renders SettingsHeaderActions and displays titles", () => {
    render(
      <SettingsProvider initialTenant={mockTenant}>
        <SettingsHeaderActions />
      </SettingsProvider>,
    );

    expect(screen.getByText("Ajustes del Restaurante")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Guardar Cambios/i }),
    ).toBeInTheDocument();
  });
});
