import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewCampaignModal } from "../NewCampaignModal";

const mockTenant = {
  id: "tenant-123",
  name: "Tacos El Pastor",
  slug: "tacos-pastor",
  system_name: "Tacos El Pastor",
  primary_color: "#10B981",
  logo_url: "https://example.com/logo.png",
};

vi.mock("@/components/TenantProvider", () => ({
  useTenant: () => mockTenant,
}));

describe("NewCampaignModal Component", () => {
  const mockOnClose = vi.fn();
  const mockOnSuccess = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("preview=true")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ totalAudienceCount: 15, sample: [] }),
          });
        }
        if (init?.method === "POST") {
          return Promise.resolve({
            ok: true,
            json: async () => ({
              success: true,
              sentCount: 15,
              failedCount: 0,
              campaign: { id: "camp-123", name: "Campaña Test" },
            }),
          });
        }
        return Promise.resolve({
          ok: true,
          json: async () => ({}),
        });
      });
  });

  it("should render Step 1 with segmentation filters and calculate audience preview", async () => {
    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    expect(
      screen.getByText(/Nueva Campaña: Segmentación/i),
    ).toBeInTheDocument();
    expect(screen.getByText(/Días de Inactividad/i)).toBeInTheDocument();
    expect(screen.getByText(/Saldo Mínimo de Puntos/i)).toBeInTheDocument();
    expect(screen.getByText(/Frecuencia de Compra/i)).toBeInTheDocument();

    // Wait for debounced audience preview fetch
    await waitFor(() => {
      expect(
        screen.getByText(/15 cliente\(s\) recibirán este correo/i),
      ).toBeInTheDocument();
    });

    // Test clicking on filter options
    const sixtyDaysBtn = screen.getByRole("button", { name: "60+ días" });
    fireEvent.click(sixtyDaysBtn);

    const hundredPointsBtn = screen.getByRole("button", { name: "100+ pts" });
    fireEvent.click(hundredPointsBtn);

    const recurrentBtn = screen.getByRole("button", {
      name: "Recurrentes (3+)",
    });
    fireEvent.click(recurrentBtn);

    const antiSaturationToggle = screen.getByTestId("anti-saturation-toggle");
    fireEvent.click(antiSaturationToggle);
  });

  it("should navigate to Step 2, change templates, insert variables and show live preview", async () => {
    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("next-step-button")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId("next-step-button"));

    expect(screen.getByText(/Nueva Campaña: Redacción/i)).toBeInTheDocument();
    expect(screen.getByTestId("campaign-name-input")).toBeInTheDocument();
    expect(screen.getByTestId("campaign-subject-input")).toBeInTheDocument();
    expect(screen.getByTestId("campaign-message-input")).toBeInTheDocument();

    // Change template to "Canjea tus Puntos"
    const canjePointsBtn = screen.getByTestId("template-btn-canje_puntos");
    fireEvent.click(canjePointsBtn);

    expect(
      screen.getByDisplayValue(
        /¡{nombre}, tienes {puntos} puntos listos para canjear! 🎉/i,
      ),
    ).toBeInTheDocument();

    // Insert variable in message
    const insertNameBtn = screen.getAllByRole("button", {
      name: "{nombre}",
    })[1];
    fireEvent.click(insertNameBtn);

    // Live preview check
    expect(screen.getByText(/Vista Previa del Cliente/i)).toBeInTheDocument();
    expect(screen.getByText(/remember@trykittn.com/i)).toBeInTheDocument();
  });

  it("should navigate to Step 3, confirm details and submit campaign successfully", async () => {
    const user = userEvent.setup();
    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("next-step-button")).not.toBeDisabled();
    });

    fireEvent.click(screen.getByTestId("next-step-button"));

    const nameInput = screen.getByTestId("campaign-name-input");
    await user.type(nameInput, "Campaña Fieles Octubre");

    fireEvent.click(screen.getByTestId("go-to-confirm-button"));

    expect(
      screen.getByText(/Nueva Campaña: Confirmación/i),
    ).toBeInTheDocument();
    expect(screen.getByText("Campaña Fieles Octubre")).toBeInTheDocument();
    expect(screen.getByText(/15 cliente\(s\)/i)).toBeInTheDocument();

    const sendBtn = screen.getByTestId("send-campaign-button");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalledTimes(1);
      expect(mockOnClose).toHaveBeenCalledTimes(1);
    });
  });

  it("should display error message if API fails on submission", async () => {
    global.fetch = vi
      .fn()
      .mockImplementation((url: string, init?: RequestInit) => {
        if (url.includes("preview=true")) {
          return Promise.resolve({
            ok: true,
            json: async () => ({ totalAudienceCount: 5 }),
          });
        }
        if (init?.method === "POST") {
          return Promise.resolve({
            ok: false,
            json: async () => ({ error: "Error de conexión con Resend" }),
          });
        }
        return Promise.resolve({ ok: true, json: async () => ({}) });
      });

    render(
      <NewCampaignModal
        isOpen={true}
        onClose={mockOnClose}
        onSuccess={mockOnSuccess}
      />,
    );

    await waitFor(() => {
      expect(screen.getByTestId("next-step-button")).not.toBeDisabled();
    });
    fireEvent.click(screen.getByTestId("next-step-button"));

    fireEvent.click(screen.getByTestId("go-to-confirm-button"));

    const sendBtn = screen.getByTestId("send-campaign-button");
    fireEvent.click(sendBtn);

    await waitFor(() => {
      expect(
        screen.getByText("Error de conexión con Resend"),
      ).toBeInTheDocument();
    });
    expect(mockOnSuccess).not.toHaveBeenCalled();
  });
});
