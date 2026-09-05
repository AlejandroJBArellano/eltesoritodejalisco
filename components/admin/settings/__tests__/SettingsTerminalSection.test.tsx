import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SettingsTerminalSection } from "../SettingsTerminalSection";
import { SettingsProvider } from "../SettingsContext";
import type { TenantContextType } from "@/lib/tenant";

const mockTenant: TenantContextType = {
  id: "tenant-123",
  name: "Restaurante Test",
  slug: "test",
  system_name: "TestOS",
  logo_url: null,
  primary_color: "#FFB7CE",
  secondary_color: "#FFD1DC",
  dark_bg_color: "#121212",
  rfc: "XAXX010101000",
  postal_code: "06000",
  regimen_fiscal: "626",
  custom_domain: null,
  loyalty_enabled: true,
  loyalty_ratio: 10,
  commission_rate: 8,
  terminal_commission_rate: 3.5,
  stripe_account_id: null,
  stripe_charges_enabled: false,
  stripe_details_submitted: false,
  google_reviews_url: null,
  ticket_footer_text: null,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

function renderWithProvider(tenant: TenantContextType = mockTenant) {
  return render(
    <SettingsProvider initialTenant={tenant}>
      <SettingsTerminalSection />
    </SettingsProvider>,
  );
}

describe("SettingsTerminalSection Component", () => {
  it("renders with initial commission rate and simulator values", () => {
    renderWithProvider();

    expect(screen.getByText(/Terminal Bancaria/i)).toBeInTheDocument();
    expect(screen.getByText("Corte de Caja")).toBeInTheDocument();

    const input = screen.getByLabelText(/Comisión por tarjeta \(%\)/i);
    expect(input).toBeInTheDocument();
    expect(input).toHaveValue(3.5);

    // Simulator check: $1,000 MXN base with 3.5% = $35.00 fee, $965.00 net
    expect(screen.getByText("$1000.00")).toBeInTheDocument();
    expect(screen.getByText("-$35.00")).toBeInTheDocument();
    expect(screen.getByText("$965.00")).toBeInTheDocument();
    expect(
      screen.getByText(/Se descuenta de la utilidad en cortes y reportes/i),
    ).toBeInTheDocument();
  });

  it("updates real-time simulator when changing commission rate", () => {
    renderWithProvider();

    const input = screen.getByLabelText(/Comisión por tarjeta \(%\)/i);
    fireEvent.change(input, { target: { value: "4.06" } });

    expect(input).toHaveValue(4.06);
    // 4.06% of $1,000 = $40.60, Net = $959.40
    expect(screen.getByText("-$40.60")).toBeInTheDocument();
    expect(screen.getByText("$959.40")).toBeInTheDocument();
  });

  it("handles 0% commission rate and shows zero deduction message", () => {
    const zeroTenant: TenantContextType = {
      ...mockTenant,
      terminal_commission_rate: 0,
    };
    renderWithProvider(zeroTenant);

    const input = screen.getByLabelText(/Comisión por tarjeta \(%\)/i);
    expect(input).toHaveValue(0);

    expect(screen.getByText("-$0.00")).toBeInTheDocument();
    expect(screen.getAllByText("$1000.00")).toHaveLength(2);
    expect(
      screen.getByText(/Sin deducción en cortes ni reportes/i),
    ).toBeInTheDocument();
  });

  it("handles empty or non-numeric input gracefully", () => {
    renderWithProvider();

    const input = screen.getByLabelText(/Comisión por tarjeta \(%\)/i);
    fireEvent.change(input, { target: { value: "" } });

    expect(screen.getByText("-$0.00")).toBeInTheDocument();
    expect(
      screen.getByText(/Sin deducción en cortes ni reportes/i),
    ).toBeInTheDocument();
  });

  it("initializes to 0 when initialTenant has null or undefined terminal_commission_rate", () => {
    const nullTenant: TenantContextType = {
      ...mockTenant,
      terminal_commission_rate: null,
    };
    renderWithProvider(nullTenant);

    const input = screen.getByLabelText(/Comisión por tarjeta \(%\)/i);
    expect(input).toHaveValue(0);
  });
});
