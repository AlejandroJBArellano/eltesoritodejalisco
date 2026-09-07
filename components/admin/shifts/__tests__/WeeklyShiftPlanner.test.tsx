import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { WeeklyShiftPlanner } from "../WeeklyShiftPlanner";
import type { ShiftUserOption } from "../ShiftModal";
import type { EmployeeShift } from "@/components/asistencia/types";
import { toPng } from "html-to-image";

vi.mock("html-to-image", () => ({
  toPng: vi.fn().mockResolvedValue("data:image/png;base64,mockPng"),
}));

const mockUsers: ShiftUserOption[] = [
  { id: "u-1", name: "Carlos Mesero", role: "WAITER" },
  { id: "u-2", name: "Laura Cocinera", role: "CHEF" },
];

const mockShifts: EmployeeShift[] = [
  {
    id: "s-1",
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
];

describe("WeeklyShiftPlanner Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders weekly schedule matrix and shifts", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        shifts: mockShifts,
        users: mockUsers,
        toleranceMinutes: 10,
      }),
    });

    render(
      <WeeklyShiftPlanner
        initialDate={new Date("2026-09-07T12:00:00Z")}
        initialUsers={mockUsers}
        initialToleranceMinutes={10}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Mesero")).toBeInTheDocument();
      expect(screen.getByText("Laura Cocinera")).toBeInTheDocument();
    });

    expect(
      screen.getByText("Programación Semanal de Colaboradores")
    ).toBeInTheDocument();
    expect(screen.getByText("08:00 - 16:00")).toBeInTheDocument();
    expect(screen.getByText("Cocina")).toBeInTheDocument();
    expect(screen.getByText("Apertura")).toBeInTheDocument();
  });

  it("handles empty users list", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        shifts: [],
        users: [],
        toleranceMinutes: 10,
      }),
    });

    render(
      <WeeklyShiftPlanner
        initialDate={new Date("2026-09-07T12:00:00Z")}
        initialUsers={[]}
      />
    );

    await waitFor(() => {
      expect(
        screen.getByText(/no hay colaboradores registrados/i)
      ).toBeInTheDocument();
    });
  });

  it("handles week navigation (anterior, siguiente, hoy)", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        shifts: [],
        users: mockUsers,
        toleranceMinutes: 10,
      }),
    });

    render(
      <WeeklyShiftPlanner
        initialDate={new Date("2026-09-07T12:00:00Z")}
        initialUsers={mockUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Mesero")).toBeInTheDocument();
    });

    const nextBtn = screen.getByRole("button", { name: /semana siguiente/i });
    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(2);
    });

    fireEvent.click(nextBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(3);
    });

    const todayBtn = screen.getByRole("button", { name: /hoy/i });
    fireEvent.click(todayBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledTimes(4);
    });
  });

  it("handles duplicate previous week action and cancellation", async () => {
    const confirmSpy = vi.spyOn(window, "confirm");
    confirmSpy.mockReturnValueOnce(false); // cancel first

    render(
      <WeeklyShiftPlanner
        initialDate={new Date("2026-09-07T12:00:00Z")}
        initialUsers={mockUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Mesero")).toBeInTheDocument();
    });

    const duplicateBtn = screen.getByRole("button", {
      name: /duplicar anterior/i,
    });
    fireEvent.click(duplicateBtn);

    // confirm cancelled, no fetch
    expect(global.fetch).toHaveBeenCalledTimes(1);

    // Now confirm = true
    confirmSpy.mockReturnValueOnce(true);
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === "POST" && url.includes("/duplicate")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ count: 5 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          shifts: mockShifts,
          users: mockUsers,
          toleranceMinutes: 10,
        }),
      });
    });

    fireEvent.click(duplicateBtn);

    await waitFor(() => {
      expect(screen.getByText(/se duplicaron 5 turnos con éxito/i)).toBeInTheDocument();
    });
  });

  it("handles error during duplicate previous week", async () => {
    vi.spyOn(window, "confirm").mockReturnValue(true);

    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === "POST" && url.includes("/duplicate")) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "No hay turnos previos para duplicar" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          shifts: [],
          users: mockUsers,
          toleranceMinutes: 10,
        }),
      });
    });

    render(
      <WeeklyShiftPlanner
        initialDate={new Date("2026-09-07T12:00:00Z")}
        initialUsers={mockUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Mesero")).toBeInTheDocument();
    });

    const duplicateBtn = screen.getByRole("button", {
      name: /duplicar anterior/i,
    });
    fireEvent.click(duplicateBtn);

    await waitFor(() => {
      expect(screen.getByText("No hay turnos previos para duplicar")).toBeInTheDocument();
    });
  });

  it("handles tolerance configuration change and save", async () => {
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === "PUT" && url.includes("/settings")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true, attendance_tolerance_minutes: 15 }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          shifts: [],
          users: mockUsers,
          toleranceMinutes: 10,
        }),
      });
    });

    render(
      <WeeklyShiftPlanner
        initialDate={new Date("2026-09-07T12:00:00Z")}
        initialUsers={mockUsers}
        initialToleranceMinutes={10}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Mesero")).toBeInTheDocument();
    });

    const toleranceInput = screen.getByDisplayValue("10");
    fireEvent.change(toleranceInput, { target: { value: "15" } });

    const saveToleranceBtn = screen.getByRole("button", { name: /guardar/i });
    fireEvent.click(saveToleranceBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/tolerancia actualizada exitosamente/i)
      ).toBeInTheDocument();
    });
  });

  it("handles tolerance save error", async () => {
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === "PUT" && url.includes("/settings")) {
        return Promise.resolve({
          ok: false,
          json: async () => ({ error: "Valor inválido" }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          shifts: [],
          users: mockUsers,
          toleranceMinutes: 10,
        }),
      });
    });

    render(
      <WeeklyShiftPlanner
        initialDate={new Date("2026-09-07T12:00:00Z")}
        initialUsers={mockUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Mesero")).toBeInTheDocument();
    });

    const saveToleranceBtn = screen.getByRole("button", { name: /guardar/i });
    fireEvent.click(saveToleranceBtn);

    await waitFor(() => {
      expect(screen.getByText("Valor inválido")).toBeInTheDocument();
    });
  });

  it("handles export image action and export failure", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        shifts: [],
        users: mockUsers,
        toleranceMinutes: 10,
      }),
    });

    render(
      <WeeklyShiftPlanner
        initialDate={new Date("2026-09-07T12:00:00Z")}
        initialUsers={mockUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Mesero")).toBeInTheDocument();
    });

    const exportBtn = screen.getByRole("button", { name: /exportar rol/i });
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText(/imagen descargada exitosamente/i)).toBeInTheDocument();
    });

    // Test failure scenario
    vi.mocked(toPng).mockRejectedValueOnce(new Error("Canvas failure"));
    fireEvent.click(exportBtn);

    await waitFor(() => {
      expect(screen.getByText(/no se pudo generar la imagen del rol/i)).toBeInTheDocument();
    });
  });

  it("opens ShiftModal for editing when clicking an existing shift card and handles save and delete", async () => {
    global.fetch = vi.fn().mockImplementation((url, options) => {
      if (options?.method === "POST" && url === "/api/shifts") {
        return Promise.resolve({
          ok: true,
          json: async () => ({ shift: { ...mockShifts[0], area: "Caja" } }),
        });
      }
      if (options?.method === "DELETE" && url.includes("/api/shifts")) {
        return Promise.resolve({
          ok: true,
          json: async () => ({ success: true }),
        });
      }
      return Promise.resolve({
        ok: true,
        json: async () => ({
          shifts: mockShifts,
          users: mockUsers,
          toleranceMinutes: 10,
        }),
      });
    });

    render(
      <WeeklyShiftPlanner
        initialDate={new Date("2026-09-07T12:00:00Z")}
        initialUsers={mockUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("08:00 - 16:00")).toBeInTheDocument();
    });

    // Click on shift card
    fireEvent.click(screen.getByText("08:00 - 16:00"));

    expect(screen.getByText("Editar Turno")).toBeInTheDocument();

    // Save shift
    const saveBtn = screen.getByRole("button", { name: /guardar turno/i });
    fireEvent.click(saveBtn);

    await waitFor(() => {
      expect(screen.getByText(/turno guardado correctamente/i)).toBeInTheDocument();
    });

    // Open and delete
    fireEvent.click(screen.getByText("08:00 - 16:00"));
    vi.spyOn(window, "confirm").mockReturnValue(true);

    const deleteBtn = screen.getByRole("button", { name: /eliminar/i });
    fireEvent.click(deleteBtn);

    await waitFor(() => {
      expect(screen.getByText(/turno eliminado correctamente/i)).toBeInTheDocument();
    });
  });

  it("opens ShiftModal when clicking the cell '+ Turno' button", async () => {
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        shifts: [],
        users: mockUsers,
        toleranceMinutes: 10,
      }),
    });

    render(
      <WeeklyShiftPlanner
        initialDate={new Date("2026-09-07T12:00:00Z")}
        initialUsers={mockUsers}
      />
    );

    await waitFor(() => {
      expect(screen.getByText("Carlos Mesero")).toBeInTheDocument();
    });

    const addButtons = screen.getAllByRole("button", { name: /turno/i });
    fireEvent.click(addButtons[0]);

    expect(screen.getByText("Asignar Nuevo Turno")).toBeInTheDocument();
  });
});
