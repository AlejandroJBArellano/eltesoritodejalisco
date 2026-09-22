import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminHorariosTurnosTab } from "../AdminHorariosTurnosTab";

vi.mock("../WeeklyShiftPlanner", () => ({
  WeeklyShiftPlanner: () => (
    <div data-testid="mock-weekly-shift-planner">WeeklyShiftPlanner</div>
  ),
}));

vi.mock("@/components/asistencia/AsistenciaFilterBar", () => ({
  AsistenciaFilterBar: () => (
    <div data-testid="mock-asistencia-filter">Filter</div>
  ),
}));

vi.mock("@/components/asistencia/AsistenciaSummaryKPIs", () => ({
  AsistenciaSummaryKPIs: () => (
    <div data-testid="mock-asistencia-kpis">KPIs</div>
  ),
}));

vi.mock("@/components/asistencia/AsistenciaHistoryTable", () => ({
  AsistenciaHistoryTable: () => (
    <div data-testid="mock-asistencia-table">Table</div>
  ),
}));

describe("AdminHorariosTurnosTab Component", () => {
  it("renders WeeklyShiftPlanner by default on planner tab", () => {
    render(<AdminHorariosTurnosTab initialUsers={[]} />);

    expect(
      screen.getByText("Planeador de Turnos Semanales"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("Historial de Marcajes y Asistencias"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("mock-weekly-shift-planner")).toBeInTheDocument();
  });

  it("switches to Attendance History tab when clicked", () => {
    render(<AdminHorariosTurnosTab initialUsers={[]} />);

    const historyTabBtn = screen.getByRole("button", {
      name: /historial de marcajes y asistencias/i,
    });
    fireEvent.click(historyTabBtn);

    expect(screen.getByTestId("mock-asistencia-filter")).toBeInTheDocument();
    expect(screen.getByTestId("mock-asistencia-kpis")).toBeInTheDocument();
    expect(screen.getByTestId("mock-asistencia-table")).toBeInTheDocument();
    expect(
      screen.queryByTestId("mock-weekly-shift-planner"),
    ).not.toBeInTheDocument();
  });
});
