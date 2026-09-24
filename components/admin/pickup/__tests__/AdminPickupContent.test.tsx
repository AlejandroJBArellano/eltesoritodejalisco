import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import {
  AdminPickupContent,
  type DbBusinessHours,
} from "../AdminPickupContent";

const mockTenant = {
  id: "t-1",
  name: "Tacos El Pastor",
  slug: "tacos-el-pastor",
  stripe_charges_enabled: true,
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
    global.fetch = vi.fn();
    Object.assign(navigator, {
      clipboard: {
        writeText: vi.fn().mockResolvedValue(undefined),
      },
    });
  });

  it("renders pickup portal link, Stripe status, and weekly hours list", () => {
    render(
      <AdminPickupContent
        initialTenant={mockTenant}
        initialHours={mockHours}
      />,
    );

    expect(
      screen.getByText("Kittn Pickup & Portal Online"),
    ).toBeInTheDocument();
    expect(screen.getByText("Portal Web para Clientes")).toBeInTheDocument();
    expect(
      screen.getByText("https://tacos-el-pastor.trykittn.com"),
    ).toBeInTheDocument();
    expect(screen.getByText("Stripe Activo")).toBeInTheDocument();
    expect(screen.getByText("Domingo")).toBeInTheDocument();
    expect(screen.getByText("Lunes")).toBeInTheDocument();
    expect(screen.getByText("Martes")).toBeInTheDocument();
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

  it("renders Inactive Stripe banner and disables share buttons when stripe_charges_enabled is false", () => {
    const inactiveTenant = {
      ...mockTenant,
      stripe_charges_enabled: false,
    };

    render(
      <AdminPickupContent
        initialTenant={inactiveTenant}
        initialHours={mockHours}
      />,
    );

    expect(screen.getByText("Inactivo (Requiere Stripe)")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Tu enlace de Kittn Pickup se activará en cuanto vincules tu cuenta de Stripe para procesar cobros en línea.",
      ),
    ).toBeInTheDocument();

    const copyBtn = screen.getByRole("button", { name: /copiar enlace/i });
    const qrBtn = screen.getByRole("button", { name: /código qr/i });
    const openBtn = screen.getByRole("button", { name: /abrir portal/i });

    expect(copyBtn).toBeDisabled();
    expect(qrBtn).toBeDisabled();
    expect(openBtn).toBeDisabled();
  });
});
