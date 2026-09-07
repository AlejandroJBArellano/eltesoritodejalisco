import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { StaffAttendanceGrid } from "../StaffAttendanceGrid";
import * as AsistenciaContextModule from "../AsistenciaContext";

describe("StaffAttendanceGrid Component", () => {
  it("renders section title, link to history and all staff cards", () => {
    vi.spyOn(AsistenciaContextModule, "useAsistenciaContext").mockReturnValue({
      isAdmin: true,
      users: [
        { id: "u-1", name: "Ana Cocinera", role: "CHEF" },
        { id: "u-2", name: "Beto Mesero", role: "WAITER" },
      ],
      attendances: [],
      isLoading: false,
      isSubmitting: false,
      error: null,
      customTime: "12:00",
      setCustomTime: vi.fn(),
      setError: vi.fn(),
      fetchAttendance: vi.fn(),
      handleAction: vi.fn(),
      getActiveAttendance: vi.fn().mockReturnValue(undefined),
      getFinishedAttendances: vi.fn().mockReturnValue([]),
      getEmployeeHours: vi.fn().mockReturnValue(0),
      activeEmployeeAttendance: undefined,
      shifts: [],
      toleranceMinutes: 10,
      getUserTodayShift: vi.fn().mockReturnValue(undefined),
      todayShift: undefined,
    });

    render(<StaffAttendanceGrid />);

    expect(
      screen.getByText("Personal & Estado de Turnos Hoy"),
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /historial completo/i });
    expect(link).toHaveAttribute("href", "/asistencia/history");

    expect(screen.getByText("Ana Cocinera")).toBeInTheDocument();
    expect(screen.getByText("Beto Mesero")).toBeInTheDocument();
  });
});
