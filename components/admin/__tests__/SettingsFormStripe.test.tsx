import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { SettingsForm } from "../SettingsForm";
import type { TenantContextType } from "@/lib/tenant";

// Mock updateTenantSettings server action
vi.mock("@/app/admin/settings/actions", () => ({
  updateTenantSettings: vi.fn().mockResolvedValue({ success: true }),
}));

const mockBaseTenant: TenantContextType = {
  id: "tenant-123",
  name: "Tacos El Guero",
  slug: "tacos-el-guero",
  system_name: "KittnOS",
  logo_url: "https://example.com/logo.png",
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
  stripe_account_id: null,
  stripe_charges_enabled: false,
  stripe_details_submitted: false,
  created_at: "2026-01-01T00:00:00Z",
  updated_at: "2026-01-01T00:00:00Z",
};

describe("SettingsForm - Kittn Pickup & Stripe Integration", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders Inactive state when tenant has no Stripe account", () => {
    render(<SettingsForm initialTenant={mockBaseTenant} />);

    expect(
      screen.getByText("Portal Kittn Pickup & Pagos con Stripe"),
    ).toBeInTheDocument();
    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(
      screen.getByText("https://tacos-el-guero.trykittn.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("Requiere activar Stripe")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Conectar Stripe y Activar Pickup/i }),
    ).toBeInTheDocument();
  });

  it("renders Pending Verification state when tenant has stripe_account_id but charges are not enabled", () => {
    const pendingTenant: TenantContextType = {
      ...mockBaseTenant,
      stripe_account_id: "acct_123456",
      stripe_charges_enabled: false,
      stripe_details_submitted: false,
    };

    render(<SettingsForm initialTenant={pendingTenant} />);

    expect(
      screen.getByText("Verificación Pendiente en Stripe"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Completar Registro en Stripe/i }),
    ).toBeInTheDocument();
    expect(screen.getByText("Requiere activar Stripe")).toBeInTheDocument();
  });

  it("renders Active state when tenant has stripe_charges_enabled = true", () => {
    const activeTenant: TenantContextType = {
      ...mockBaseTenant,
      stripe_account_id: "acct_123456",
      stripe_charges_enabled: true,
      stripe_details_submitted: true,
    };

    render(<SettingsForm initialTenant={activeTenant} />);

    expect(screen.getByText("Online")).toBeInTheDocument();
    expect(screen.getByText("Listo para compartir")).toBeInTheDocument();
    expect(
      screen.getByText("Cuenta de Stripe Activa & Cobros Habilitados"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Ver Saldo y Depósitos/i }),
    ).toBeInTheDocument();

    const openStoreLink = screen.getByRole("link", { name: /Abrir Tienda/i });
    expect(openStoreLink).toBeInTheDocument();
    expect(openStoreLink).toHaveAttribute(
      "href",
      "https://tacos-el-guero.trykittn.com",
    );
    expect(openStoreLink).toHaveAttribute("target", "_blank");
  });

  it("copies pickup URL to clipboard and shows feedback", async () => {
    const activeTenant: TenantContextType = {
      ...mockBaseTenant,
      stripe_charges_enabled: true,
    };

    const writeTextMock = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, {
      clipboard: {
        writeText: writeTextMock,
      },
    });

    render(<SettingsForm initialTenant={activeTenant} />);

    const copyBtn = screen.getByRole("button", { name: /Copiar Link/i });
    expect(copyBtn).toBeInTheDocument();

    fireEvent.click(copyBtn);

    expect(writeTextMock).toHaveBeenCalledWith(
      "https://tacos-el-guero.trykittn.com",
    );
    await waitFor(() => {
      expect(screen.getByText("¡Copiado!")).toBeInTheDocument();
    });
  });
});
