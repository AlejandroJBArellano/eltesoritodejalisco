import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsForm } from "../SettingsForm";
import type { TenantContextType } from "@/lib/tenant";
import { updateTenantSettings } from "@/app/admin/settings/actions";
import { getContrastColor } from "../settings/types";

vi.mock("@/app/admin/settings/actions", () => ({
  updateTenantSettings: vi.fn().mockResolvedValue({ success: true }),
}));

const mockTenant: TenantContextType = {
  id: "tenant-123",
  name: "Restaurante El Sol",
  slug: "el-sol",
  system_name: "SolOS",
  logo_url: "https://example.com/logo.png",
  primary_color: "#FFB7CE",
  secondary_color: "#FFD1DC",
  dark_bg_color: "#121212",
  rfc: "XAXX010101000",
  postal_code: "06000",
  regimen_fiscal: "626 - RESICO",
  custom_domain: null,
  loyalty_enabled: true,
  loyalty_ratio: 10,
  commission_rate: 8,
  terminal_commission_rate: 3.5,
  stripe_account_id: null,
  stripe_charges_enabled: false,
  stripe_details_submitted: false,
  google_reviews_url: "https://maps.app.goo.gl/example",
  ticket_footer_text: "@elsol_restaurante",
  attendance_tolerance_minutes: 10,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("SettingsForm Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders all sections and initial values correctly", () => {
    render(<SettingsForm initialTenant={mockTenant} />);

    expect(screen.getByText("Ajustes del Restaurante")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Restaurante El Sol")).toBeInTheDocument();
    expect(screen.getByDisplayValue("SolOS")).toBeInTheDocument();
    expect(screen.getByDisplayValue("XAXX010101000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("06000")).toBeInTheDocument();
    expect(screen.getByDisplayValue("626 - RESICO")).toBeInTheDocument();
    expect(screen.getByDisplayValue("https://maps.app.goo.gl/example")).toBeInTheDocument();
    expect(screen.getByDisplayValue("@elsol_restaurante")).toBeInTheDocument();
    expect(screen.getByText("Colores de Marca")).toBeInTheDocument();
    expect(screen.getByText("Programa de Lealtad (CRM)")).toBeInTheDocument();
  });

  it("toggles loyalty program and adjusts ratio input", () => {
    render(<SettingsForm initialTenant={mockTenant} />);

    const ratioInput = screen.getByDisplayValue("10");
    expect(ratioInput).toBeInTheDocument();

    fireEvent.change(ratioInput, { target: { value: "15" } });
    expect(screen.getByDisplayValue("15")).toBeInTheDocument();
  });

  it("applies color preset when clicked", () => {
    render(<SettingsForm initialTenant={mockTenant} />);

    const presetBtn = screen.getByRole("button", { name: /Esmeralda/i });
    expect(presetBtn).toBeInTheDocument();

    fireEvent.click(presetBtn);

    expect(screen.getByDisplayValue("#10B981")).toBeInTheDocument();
  });

  it("handles remove logo action", () => {
    render(<SettingsForm initialTenant={mockTenant} />);

    const removeBtn = screen.getByRole("button", { name: /Eliminar Logo/i });
    expect(removeBtn).toBeInTheDocument();

    fireEvent.click(removeBtn);

    expect(screen.queryByAltText("Logo preview")).not.toBeInTheDocument();
    expect(screen.getByText(/Arrastra tu logotipo aquí/i)).toBeInTheDocument();
  });

  it("submits the form successfully and displays success banner", async () => {
    vi.mocked(updateTenantSettings).mockResolvedValue({ success: true });

    render(<SettingsForm initialTenant={mockTenant} />);

    const submitBtns = screen.getAllByRole("button", { name: /Guardar Cambios/i });
    fireEvent.click(submitBtns[0]);

    await waitFor(() => {
      expect(updateTenantSettings).toHaveBeenCalled();
      expect(
        screen.getByText(/Configuración guardada exitosamente/i),
      ).toBeInTheDocument();
    });
  });

  it("displays error banner when submit fails", async () => {
    vi.mocked(updateTenantSettings).mockResolvedValue({
      error: "Error al actualizar base de datos",
    });

    render(<SettingsForm initialTenant={mockTenant} />);

    const submitBtns = screen.getAllByRole("button", { name: /Guardar Cambios/i });
    fireEvent.click(submitBtns[0]);

    await waitFor(() => {
      expect(
        screen.getByText("Error al actualizar base de datos"),
      ).toBeInTheDocument();
    });
  });

  it("getContrastColor returns black for bright backgrounds and white for dark", () => {
    expect(getContrastColor("#FFFFFF")).toBe("#121212");
    expect(getContrastColor("#000000")).toBe("#f5f5f5");
    expect(getContrastColor("")).toBe("#f5f5f5");
  });
});
