import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  AdminPickupContent,
  type DbBusinessHours,
} from "../AdminPickupContent";

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock Stripe Connect JS
vi.mock("@stripe/connect-js", () => ({
  loadConnectAndInitialize: vi.fn().mockReturnValue({}),
}));

vi.mock("@stripe/react-connect-js", () => ({
  ConnectComponentsProvider: ({ children }: { children: React.ReactNode }) => (
    <div>{children}</div>
  ),
  ConnectAccountOnboarding: () => <div>Stripe Onboarding Embedded</div>,
}));

const mockTenant = {
  id: "t-1",
  name: "Tacos El Pastor",
  slug: "tacos-el-pastor",
  stripe_account_id: "acct_123",
  stripe_charges_enabled: true,
  stripe_details_submitted: true,
};

const mockHours: DbBusinessHours[] = [
  {
    id: "h-0",
    day_of_week: 0,
    open_time: "10:00:00",
    close_time: "20:00:00",
    is_closed: false,
  },
  {
    id: "h-1",
    day_of_week: 1,
    open_time: "09:00:00",
    close_time: "22:00:00",
    is_closed: false,
  },
  {
    id: "h-2",
    day_of_week: 2,
    open_time: "09:00:00",
    close_time: "22:00:00",
    is_closed: true,
  },
];

describe("AdminPickupContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY = "pk_test_123";
    global.fetch = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders active Stripe status, pickup link, and weekly hours list", () => {
    render(
      <AdminPickupContent
        initialTenant={mockTenant}
        initialHours={mockHours}
      />,
    );

    expect(screen.getByText("Kittn Portal")).toBeInTheDocument();
    expect(
      screen.getByText("Cobros y Pagos con Stripe Connect"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Cuenta de Stripe Activa & Cobros Habilitados"),
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /ver saldo y depósitos/i }),
    ).toBeInTheDocument();
    expect(
      screen.getByText("https://tacos-el-pastor.trykittn.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("Stripe Activo")).toBeInTheDocument();
    expect(screen.getByText("Listo para compartir")).toBeInTheDocument();
    expect(screen.getByText("Domingo")).toBeInTheDocument();
    expect(screen.getByText("Lunes")).toBeInTheDocument();
    expect(screen.getByText("Martes")).toBeInTheDocument();
  });

  it("calls login-link API when clicking Ver Saldo y Depósitos", async () => {
    const windowOpenSpy = vi
      .spyOn(window, "open")
      .mockImplementation(() => null);
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ url: "https://connect.stripe.com/express" }),
    } as any);

    render(
      <AdminPickupContent
        initialTenant={mockTenant}
        initialHours={mockHours}
      />,
    );

    const loginBtn = screen.getByRole("button", {
      name: /ver saldo y depósitos/i,
    });
    fireEvent.click(loginBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/stripe/connect/login-link",
        {
          method: "POST",
        },
      );
      expect(windowOpenSpy).toHaveBeenCalledWith(
        "https://connect.stripe.com/express",
        "_blank",
      );
    });

    windowOpenSpy.mockRestore();
  });

  it("renders Inactive Stripe state without account and opens embedded modal on click", async () => {
    const inactiveTenant = {
      ...mockTenant,
      stripe_account_id: null,
      stripe_charges_enabled: false,
    };

    render(
      <AdminPickupContent
        initialTenant={inactiveTenant}
        initialHours={mockHours}
      />,
    );

    expect(screen.getByText("Inactivo")).toBeInTheDocument();
    expect(screen.getByText("Requiere activar Stripe")).toBeInTheDocument();
    expect(
      screen.getByText("Conecta tu cuenta bancaria con Stripe"),
    ).toBeInTheDocument();

    const connectBtn = screen.getByRole("button", {
      name: /conectar stripe y activar pickup/i,
    });
    expect(connectBtn).toBeInTheDocument();

    fireEvent.click(connectBtn);

    await waitFor(() => {
      expect(screen.getByText("Conectar Pagos con Stripe")).toBeInTheDocument();
    });

    // Sharing buttons should be disabled
    const copyBtn = screen.getByRole("button", { name: /copiar enlace/i });
    const qrBtn = screen.getByRole("button", { name: /código qr/i });
    const openBtn = screen.getByRole("button", { name: /abrir portal/i });

    expect(copyBtn).toBeDisabled();
    expect(qrBtn).toBeDisabled();
    expect(openBtn).toBeDisabled();
  });

  it("renders Pending Verification state when stripe_account_id exists but charges are disabled", async () => {
    const pendingTenant = {
      ...mockTenant,
      stripe_account_id: "acct_pending_123",
      stripe_charges_enabled: false,
      stripe_details_submitted: false,
    };

    render(
      <AdminPickupContent
        initialTenant={pendingTenant}
        initialHours={mockHours}
      />,
    );

    expect(screen.getByText("Verificación Pendiente")).toBeInTheDocument();
    expect(
      screen.getByText("Verificación Pendiente en Stripe"),
    ).toBeInTheDocument();

    const completeBtn = screen.getByRole("button", {
      name: /completar registro en stripe/i,
    });
    expect(completeBtn).toBeInTheDocument();

    fireEvent.click(completeBtn);

    await waitFor(() => {
      expect(screen.getByText("Conectar Pagos con Stripe")).toBeInTheDocument();
    });
  });

  it("copies pickup link to clipboard when clicking copy button", async () => {
    render(
      <AdminPickupContent
        initialTenant={mockTenant}
        initialHours={mockHours}
      />,
    );

    const copyBtn = screen.getByRole("button", { name: /copiar enlace/i });
    fireEvent.click(copyBtn);

    expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
      "https://tacos-el-pastor.trykittn.com",
    );
    expect(await screen.findByText("¡Copiado!")).toBeInTheDocument();
  });

  it("opens QR modal when clicking Código QR button", () => {
    render(
      <AdminPickupContent
        initialTenant={mockTenant}
        initialHours={mockHours}
      />,
    );

    const qrBtn = screen.getByRole("button", { name: /código qr/i });
    fireEvent.click(qrBtn);

    expect(screen.getByText("Código QR del Menú Digital")).toBeInTheDocument();
    expect(screen.getByAltText("Código QR Kittn Pickup")).toBeInTheDocument();
  });

  it("toggles day between Abierto and Cerrado", () => {
    render(
      <AdminPickupContent
        initialTenant={mockTenant}
        initialHours={mockHours}
      />,
    );

    const cerradoBtn = screen.getByRole("button", { name: "Cerrado" });
    fireEvent.click(cerradoBtn);

    // Should now toggle to Abierto
    expect(screen.getAllByRole("button", { name: "Abierto" }).length).toBe(3);
  });

  it("validates that open_time is before close_time on submit", async () => {
    const invalidHours: DbBusinessHours[] = [
      {
        id: "h-0",
        day_of_week: 0,
        open_time: "22:00:00",
        close_time: "08:00:00", // invalid: close is earlier than open
        is_closed: false,
      },
    ];

    render(
      <AdminPickupContent
        initialTenant={mockTenant}
        initialHours={invalidHours}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: /guardar horarios/i });
    fireEvent.click(saveBtn);

    expect(
      await screen.findByText(
        /el horario de apertura debe ser anterior al de cierre/i,
      ),
    ).toBeInTheDocument();
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it("saves valid business hours successfully via PUT /api/business-hours", async () => {
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as any);

    render(
      <AdminPickupContent
        initialTenant={mockTenant}
        initialHours={mockHours}
      />,
    );

    const saveBtn = screen.getByRole("button", { name: /guardar horarios/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ hours: mockHours }),
      });
    });

    expect(
      await screen.findByText("Horarios actualizados exitosamente."),
    ).toBeInTheDocument();
  });
});
