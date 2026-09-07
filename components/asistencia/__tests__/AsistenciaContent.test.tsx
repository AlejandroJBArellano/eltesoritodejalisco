import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { AsistenciaContent } from "../AsistenciaContent";

describe("AsistenciaContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders employee view when user is not admin", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isAdmin: false,
        users: [],
        attendances: [],
      }),
    });

    render(<AsistenciaContent />);

    expect(
      await screen.findByText("Control de Asistencia"),
    ).toBeInTheDocument();
    expect(screen.getByText("Fuera de Turno")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /registrar entrada/i }),
    ).toBeInTheDocument();

    // Switch to Mis Turnos tab
    const misTurnosBtn = screen.getByRole("button", { name: /mis turnos/i });
    expect(misTurnosBtn).toBeInTheDocument();
  });

  it("renders admin view when user is admin", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        isAdmin: true,
        users: [{ id: "u-1", name: "Gabriel Chef", role: "CHEF" }],
        attendances: [],
      }),
    });

    render(<AsistenciaContent />);

    expect(await screen.findByText("Modo Administrador")).toBeInTheDocument();
    expect(
      screen.getByText("Personal & Estado de Turnos Hoy"),
    ).toBeInTheDocument();
    expect(screen.getByText("Gabriel Chef")).toBeInTheDocument();
  });
});
