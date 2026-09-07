import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmployeeCheckInCard } from "../EmployeeCheckInCard";
import type { AttendanceRecord, EmployeeShift } from "../types";

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

  it("renders scheduled shift info and 'A tiempo' punctuality badge", () => {
    const scheduledShift: EmployeeShift = {
      id: "shift-1",
      tenant_id: "tenant-1",
      user_id: "u-1",
      date: "2026-09-03",
      start_time: "09:00:00",
      end_time: "17:00:00",
      area: "Cocina",
      notes: "Preparación de guisados",
      created_at: null,
      updated_at: null,
    };

    const activeAtt: AttendanceRecord = {
      id: "att-1",
      user_id: "u-1",
      date: "2026-09-03",
      check_in: "2026-09-03T15:05:00Z", // 09:05 in UTC-6 (within 10 min tolerance)
      check_out: null,
      status: "ACTIVE",
    };

    render(
      <EmployeeCheckInCard
        activeAttendance={activeAtt}
        scheduledShift={scheduledShift}
        toleranceMinutes={10}
        isLoading={false}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText("Turno Programado Hoy")).toBeInTheDocument();
    expect(screen.getByText("09:00 - 17:00")).toBeInTheDocument();
    expect(screen.getByText("Cocina")).toBeInTheDocument();
    expect(screen.getByText("Preparación de guisados")).toBeInTheDocument();
    expect(screen.getByText(/A tiempo/i)).toBeInTheDocument();
  });

  it("renders 'Retardo' badge when check-in exceeds tolerance", () => {
    const scheduledShift: EmployeeShift = {
      id: "shift-1",
      tenant_id: "tenant-1",
      user_id: "u-1",
      date: "2026-09-03",
      start_time: "09:00:00",
      end_time: "17:00:00",
      area: "Caja",
      notes: null,
      created_at: null,
      updated_at: null,
    };

    const activeAtt: AttendanceRecord = {
      id: "att-1",
      user_id: "u-1",
      date: "2026-09-03",
      check_in: "2026-09-03T15:25:00Z", // 09:25 in UTC-6 (25 min diff > 10 min tolerance)
      check_out: null,
      status: "ACTIVE",
    };

    render(
      <EmployeeCheckInCard
        activeAttendance={activeAtt}
        scheduledShift={scheduledShift}
        toleranceMinutes={10}
        isLoading={false}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText(/Retardo \(\+25 min\)/i)).toBeInTheDocument();
  });

  it("renders 'Sin turno programado (Descanso)' when no shift is scheduled", () => {
    render(
      <EmployeeCheckInCard
        activeAttendance={null}
        scheduledShift={null}
        isLoading={false}
        onAction={vi.fn()}
      />,
    );

    expect(
      screen.getByText("Sin turno programado (Descanso)"),
    ).toBeInTheDocument();
  });
});
