import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AdminHorariosContent } from "../AdminHorariosContent";
import type { DbBusinessHours } from "@/app/admin/horarios/page";
import type { ShiftUserOption } from "../shifts/ShiftModal";

const mockHours: DbBusinessHours[] = [
  {
    id: "h-0",
    day_of_week: 0,
    open_time: "09:00:00",
    close_time: "18:00:00",
    is_closed: false,
  },
  {
    id: "h-1",
    day_of_week: 1,
    open_time: "10:00:00",
    close_time: "19:00:00",
    is_closed: true,
  },
];

const mockUsers: ShiftUserOption[] = [
  { id: "u-1", name: "Carlos Mesero", role: "WAITER" },
];

describe("AdminHorariosContent Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ shifts: [], users: mockUsers, toleranceMinutes: 10 }),
    });
  });

  it("renders with Turnos de Personal tab active by default", async () => {
    render(
      <AdminHorariosContent
        initialHours={mockHours}
        initialUsers={mockUsers}
        initialToleranceMinutes={10}
      />
    );

    expect(
      screen.getByRole("button", { name: /turnos de personal/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /horarios de atención/i })
    ).toBeInTheDocument();

    expect(
      screen.getByText("Programación Semanal de Colaboradores")
    ).toBeInTheDocument();
  });

  it("switches to Horarios de Atención tab and renders business hours form", async () => {
    render(
      <AdminHorariosContent
        initialHours={mockHours}
        initialUsers={mockUsers}
        initialToleranceMinutes={10}
      />
    );

    const businessHoursTab = screen.getByRole("button", {
      name: /horarios de atención/i,
    });
    fireEvent.click(businessHoursTab);

    expect(screen.getByText("Domingo")).toBeInTheDocument();
    expect(screen.getByText("Lunes")).toBeInTheDocument();
    expect(screen.getByText("Cerrado")).toBeInTheDocument();

    const saveBtn = screen.getByRole("button", {
      name: /guardar horarios de atención/i,
    });
    expect(saveBtn).toBeInTheDocument();
  });

  it("handles toggling closed state and editing times in Horarios de Atención", async () => {
    render(
      <AdminHorariosContent
        initialHours={mockHours}
        initialUsers={mockUsers}
        initialToleranceMinutes={10}
      />
    );

    const businessHoursTab = screen.getByRole("button", {
      name: /horarios de atención/i,
    });
    fireEvent.click(businessHoursTab);

    // Toggle closed for Sunday
    const sundayCheckbox = screen.getByRole("checkbox", { name: /domingo/i });
    fireEvent.click(sundayCheckbox);

    // Toggle open for Monday
    const mondayCheckbox = screen.getByRole("checkbox", { name: /lunes/i });
    fireEvent.click(mondayCheckbox);

    // Change time for Monday
    const timeInputs = screen.getAllByDisplayValue("10:00");
    fireEvent.change(timeInputs[0], { target: { value: "08:30" } });
  });

  it("shows error when open_time is after close_time", async () => {
    render(
      <AdminHorariosContent
        initialHours={mockHours}
        initialUsers={mockUsers}
        initialToleranceMinutes={10}
      />
    );

    const businessHoursTab = screen.getByRole("button", {
      name: /horarios de atención/i,
    });
    fireEvent.click(businessHoursTab);

    // Change open time for Sunday to be 20:00 (after 18:00 close)
    const openTimeInput = screen.getByDisplayValue("09:00");
    fireEvent.change(openTimeInput, { target: { value: "20:00" } });

    const saveBtn = screen.getByRole("button", {
      name: /guardar horarios de atención/i,
    });
    fireEvent.click(saveBtn);

    expect(
      screen.getByText(/el horario de apertura debe ser anterior al de cierre/i)
    ).toBeInTheDocument();
  });

  it("handles saving business hours successfully", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });

    render(
      <AdminHorariosContent
        initialHours={mockHours}
        initialUsers={mockUsers}
        initialToleranceMinutes={10}
      />
    );

    const businessHoursTab = screen.getByRole("button", {
      name: /horarios de atención/i,
    });
    fireEvent.click(businessHoursTab);

    const saveBtn = screen.getByRole("button", {
      name: /guardar horarios de atención/i,
    });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/business-hours", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: expect.stringContaining('"hours":'),
      });
      expect(
        screen.getByText(/horarios comerciales actualizados exitosamente/i)
      ).toBeInTheDocument();
    });
  });

  it("displays error message if save fails", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({ error: "Error en el servidor al guardar" }),
    });

    render(
      <AdminHorariosContent
        initialHours={mockHours}
        initialUsers={mockUsers}
        initialToleranceMinutes={10}
      />
    );

    const businessHoursTab = screen.getByRole("button", {
      name: /horarios de atención/i,
    });
    fireEvent.click(businessHoursTab);

    const saveBtn = screen.getByRole("button", {
      name: /guardar horarios de atención/i,
    });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText("Error en el servidor al guardar")).toBeInTheDocument();
    });
  });
});
