import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { StaffAttendanceCard } from "../StaffAttendanceCard";
import type { AttendanceRecord, AttendanceUserOption } from "../types";

const mockUser: AttendanceUserOption = {
  id: "u-1",
  name: "Pedro Morales",
  role: "WAITER",
};

describe("StaffAttendanceCard Component", () => {
  it("renders outside shift state with check in button", () => {
    const onActionMock = vi.fn();
    render(
      <StaffAttendanceCard
        user={mockUser}
        activeAttendance={undefined}
        finishedAttendances={[]}
        totalHoursFinished={0}
        isLoading={false}
        onAction={onActionMock}
      />,
    );

    expect(screen.getByText("Pedro Morales")).toBeInTheDocument();
    expect(screen.getByText("WAITER")).toBeInTheDocument();
    expect(screen.getByText("Fuera de Turno")).toBeInTheDocument();

    const btn = screen.getByRole("button", { name: /registrar entrada/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);

    expect(onActionMock).toHaveBeenCalledWith("CHECK_IN", "u-1");
  });

  it("renders on shift state with check out button and entry time", () => {
    const onActionMock = vi.fn();
    const activeAtt: AttendanceRecord = {
      id: "att-1",
      user_id: "u-1",
      date: "2026-09-03",
      check_in: "2026-09-03T16:00:00Z",
      check_out: null,
      status: "ACTIVE",
    };

    render(
      <StaffAttendanceCard
        user={mockUser}
        activeAttendance={activeAtt}
        finishedAttendances={[]}
        totalHoursFinished={0}
        isLoading={false}
        onAction={onActionMock}
      />,
    );

    expect(screen.getByText("En Turno")).toBeInTheDocument();
    expect(screen.getByText("10:00")).toBeInTheDocument(); // 16:00Z in Mexico City is 10:00

    const btn = screen.getByRole("button", { name: /registrar salida/i });
    expect(btn).toBeInTheDocument();
    fireEvent.click(btn);

    expect(onActionMock).toHaveBeenCalledWith("CHECK_OUT", "u-1");
  });

  it("displays accumulated shifts and hours when finished attendances exist", () => {
    const finished: AttendanceRecord[] = [
      {
        id: "att-f1",
        user_id: "u-1",
        date: "2026-09-03",
        check_in: "2026-09-03T14:00:00Z",
        check_out: "2026-09-03T18:00:00Z",
        status: "FINISHED",
      },
    ];

    render(
      <StaffAttendanceCard
        user={mockUser}
        activeAttendance={undefined}
        finishedAttendances={finished}
        totalHoursFinished={4}
        isLoading={false}
        onAction={vi.fn()}
      />,
    );

    expect(screen.getByText(/turnos completados hoy:/i)).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("4.00 hrs")).toBeInTheDocument();
  });

  it("disables button when isLoading is true", () => {
    render(
      <StaffAttendanceCard
        user={mockUser}
        activeAttendance={undefined}
        finishedAttendances={[]}
        totalHoursFinished={0}
        isLoading={true}
        onAction={vi.fn()}
      />,
    );

    const btn = screen.getByRole("button", { name: /registrar entrada/i });
    expect(btn).toBeDisabled();
  });
});
