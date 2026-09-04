import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmployeeCheckInCard } from "../EmployeeCheckInCard";
import type { AttendanceRecord } from "../types";

describe("EmployeeCheckInCard Component", () => {
  it("renders inactive state correctly with Check In button", () => {
    const onActionMock = vi.fn();
    render(
      <EmployeeCheckInCard
        activeAttendance={null}
        isLoading={false}
        onAction={onActionMock}
      />,
    );

    expect(screen.getByText("Control de Asistencia")).toBeInTheDocument();
    expect(screen.getByText("Fuera de Turno")).toBeInTheDocument();
    expect(
      screen.getByText("No tienes un turno activo en este momento."),
    ).toBeInTheDocument();

    const checkInBtn = screen.getByRole("button", {
      name: /registrar entrada/i,
    });
    expect(checkInBtn).toBeInTheDocument();
    expect(checkInBtn).not.toBeDisabled();

    fireEvent.click(checkInBtn);
    expect(onActionMock).toHaveBeenCalledWith("CHECK_IN");
  });

  it("renders active shift state with check-in time and Check Out button", () => {
    const onActionMock = vi.fn();
    const activeAtt: AttendanceRecord = {
      id: "att-1",
      user_id: "u-1",
      date: "2026-09-03",
      check_in: "2026-09-03T15:00:00Z",
      check_out: null,
      status: "ACTIVE",
    };

    render(
      <EmployeeCheckInCard
        activeAttendance={activeAtt}
        isLoading={false}
        onAction={onActionMock}
      />,
    );

    expect(screen.getByText("Turno Activo")).toBeInTheDocument();
    expect(screen.getByText("Hora de entrada")).toBeInTheDocument();
    expect(screen.getByText("09:00")).toBeInTheDocument(); // Mexico City is UTC-6

    const checkOutBtn = screen.getByRole("button", {
      name: /registrar salida/i,
    });
    expect(checkOutBtn).toBeInTheDocument();
    expect(checkOutBtn).not.toBeDisabled();

    fireEvent.click(checkOutBtn);
    expect(onActionMock).toHaveBeenCalledWith("CHECK_OUT");
  });

  it("disables buttons and displays loading text when isLoading is true", () => {
    render(
      <EmployeeCheckInCard
        activeAttendance={null}
        isLoading={true}
        onAction={vi.fn()}
      />,
    );

    const btn = screen.getByRole("button", { name: /registrando.../i });
    expect(btn).toBeDisabled();
  });
});
