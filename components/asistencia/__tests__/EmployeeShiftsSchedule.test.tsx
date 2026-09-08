import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { EmployeeShiftsSchedule } from "../EmployeeShiftsSchedule";
import type { EmployeeShift } from "../types";

const mockShifts: EmployeeShift[] = [
  {
    id: "shift-1",
    tenant_id: "tenant-1",
    user_id: "u-1",
    date: "2026-09-07",
    start_time: "08:00:00",
    end_time: "16:00:00",
    area: "Cocina",
    notes: "Apertura",
    created_at: null,
    updated_at: null,
  },
  {
    id: "shift-2",
    tenant_id: "tenant-1",
    user_id: "u-1",
    date: "2026-09-08",
    start_time: "14:00:00",
    end_time: "22:00:00",
    area: "Barra",
    notes: null,
    created_at: null,
    updated_at: null,
  },
];

describe("EmployeeShiftsSchedule Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders loading state initially and then displays weekly shifts", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ shifts: mockShifts }),
    });

    render(<EmployeeShiftsSchedule initialDate={new Date("2026-09-07T12:00:00Z")} />);

    expect(screen.getByText(/cargando rol de turnos/i)).toBeInTheDocument();

    await waitFor(() => {
      expect(screen.queryByText(/cargando rol de turnos/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText("Rol Semanal de Turnos")).toBeInTheDocument();
    expect(screen.getByText("08:00 - 16:00")).toBeInTheDocument();
    expect(screen.getByText("Cocina")).toBeInTheDocument();
    expect(screen.getByText("Apertura")).toBeInTheDocument();
    expect(screen.getByText("14:00 - 22:00")).toBeInTheDocument();
    expect(screen.getByText("Barra")).toBeInTheDocument();

    // Days without shifts show Descanso
    const descansos = screen.getAllByText("Descanso");
    expect(descansos.length).toBeGreaterThan(0);
  });

  it("handles week navigation correctly", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ shifts: [] }),
    });

    render(<EmployeeShiftsSchedule initialDate={new Date("2026-08-10T12:00:00Z")} />);

    await waitFor(() => {
      expect(screen.queryByText(/cargando rol de turnos/i)).not.toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: /semana siguiente/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    const prevBtn = screen.getByRole("button", { name: /semana anterior/i });
    fireEvent.click(prevBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    const currentBtn = screen.getByRole("button", { name: /semana actual/i });
    fireEvent.click(currentBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  it("handles error when fetch fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Error de conexión" }),
    });

    render(<EmployeeShiftsSchedule initialDate={new Date("2026-09-07T12:00:00Z")} />);

    await waitFor(() => {
      expect(screen.getByText("Error de conexión")).toBeInTheDocument();
    });
  });
});
