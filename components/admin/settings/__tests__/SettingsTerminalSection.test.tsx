import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
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
  attendance_tolerance_minutes: 10,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

const mockTerminals = [
  {
    id: "term-1",
    tenant_id: "tenant-123",
    name: "Terminal Principal",
    short_name: "General",
    commission_rate: 3.5,
    is_default: true,
    is_active: true,
  },
  {
    id: "term-2",
    tenant_id: "tenant-123",
    name: "Clip Pro Barra",
    short_name: "Clip",
    commission_rate: 4.06,
    is_default: false,
    is_active: true,
  },
];

function renderWithProvider(tenant: TenantContextType = mockTenant) {
  return render(
    <SettingsProvider initialTenant={tenant}>
      <SettingsTerminalSection />
    </SettingsProvider>,
  );
}

describe("SettingsTerminalSection Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation((url: string) => {
      if (url === "/api/admin/terminals") {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ terminals: mockTerminals }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });
    });
  });

  it("renders terminal header and lists registered terminals", async () => {
    renderWithProvider();

    expect(
      screen.getByText(/Terminales Bancarias y Comisiones/i),
    ).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.getByText("Terminal Principal")).toBeInTheDocument();
      expect(screen.getByText("Clip Pro Barra")).toBeInTheDocument();
    });

    expect(screen.getByText("General")).toBeInTheDocument();
    expect(screen.getByText("Clip")).toBeInTheDocument();
    expect(screen.getByText("Predeterminada")).toBeInTheDocument();
  });

  it("calculates simulator values based on default terminal rate (3.5%)", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Terminal Principal")).toBeInTheDocument();
    });

    // $1,000 MXN base with 3.5% = $35.00 fee, $965.00 net
    expect(screen.getByText("$1000.00")).toBeInTheDocument();
    expect(screen.getByText("-$35.00")).toBeInTheDocument();
    expect(screen.getByText("$965.00")).toBeInTheDocument();
  });

  it("opens create terminal modal, validates input and creates a terminal", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Clip Pro Barra")).toBeInTheDocument();
    });

    const newBtn = screen.getByRole("button", { name: /Nueva Terminal/i });
    fireEvent.click(newBtn);

    expect(screen.getByText("Nueva Terminal Bancaria")).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/Terminal Clip Barra/i);
    const shortNameInput = screen.getByPlaceholderText(/Clip, BBVA/i);
    const rateInput = screen.getByPlaceholderText(/Ej. 3.60/i);

    fireEvent.change(nameInput, { target: { value: "Terminal Santander" } });
    fireEvent.change(shortNameInput, { target: { value: "Santander" } });
    fireEvent.change(rateInput, { target: { value: "2.5" } });

    const submitBtn = screen.getByRole("button", { name: /Crear Terminal/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/terminals",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            name: "Terminal Santander",
            short_name: "Santander",
            commission_rate: 2.5,
            is_default: false,
          }),
        }),
      );
    });
  });

  it("opens edit modal and updates an existing terminal", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Clip Pro Barra")).toBeInTheDocument();
    });

    const editBtns = screen.getAllByTitle("Editar terminal");
    fireEvent.click(editBtns[1]);

    expect(screen.getByText("Editar Terminal")).toBeInTheDocument();
    const rateInput = screen.getByPlaceholderText(/Ej. 3.60/i);
    fireEvent.change(rateInput, { target: { value: "4.5" } });

    const saveBtn = screen.getByRole("button", { name: /Guardar Cambios/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/terminals/term-2",
        expect.objectContaining({
          method: "PATCH",
        }),
      );
    });
  });

  it("handles toggling active state of a terminal", async () => {
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Clip Pro Barra")).toBeInTheDocument();
    });

    const checkboxes = screen.getAllByRole("checkbox");
    fireEvent.click(checkboxes[1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/terminals/term-2",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ is_active: false }),
        }),
      );
    });
  });

  it("handles delete terminal with window.confirm", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getByText("Clip Pro Barra")).toBeInTheDocument();
    });

    const deleteBtns = screen.getAllByTitle("Eliminar o desactivar");
    fireEvent.click(deleteBtns[1]);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/admin/terminals/term-2",
        expect.objectContaining({
          method: "DELETE",
        }),
      );
    });
  });

  it("falls back gracefully when API returns error or is offline", async () => {
    global.fetch = vi.fn().mockRejectedValue(new Error("Network error"));
    renderWithProvider();

    await waitFor(() => {
      expect(screen.getAllByText("General").length).toBeGreaterThanOrEqual(1);
    });
  });
});
