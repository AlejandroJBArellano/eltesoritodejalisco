import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AdminStaffPerformanceTab } from "../AdminStaffPerformanceTab";
import type { StaffPerformanceMetric } from "../types";

const mockMetrics: StaffPerformanceMetric[] = [
  {
    userId: "u-1",
    name: "Ana García",
    completedCount: 12,
    avgDurationMinutes: 18,
  },
  {
    userId: "u-2",
    name: "Carlos Ruiz",
    completedCount: 8,
    avgDurationMinutes: 25,
  },
];

describe("AdminStaffPerformanceTab Component", () => {
  it("renders empty state when no metrics are provided", () => {
    render(<AdminStaffPerformanceTab selectedDate="2026-09-03" metrics={[]} />);

    expect(
      screen.getByText("Resumen de Rendimiento de Personal - 2026-09-03"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No hay métricas registradas para esta fecha."),
    ).toBeInTheDocument();
  });

  it("renders metrics table with employee rows and details", () => {
    render(
      <AdminStaffPerformanceTab
        selectedDate="2026-09-03"
        metrics={mockMetrics}
      />,
    );

    expect(screen.getByText("Ana García")).toBeInTheDocument();
    expect(screen.getByText("12 tareas")).toBeInTheDocument();
    expect(screen.getByText("18 min / tarea")).toBeInTheDocument();

    expect(screen.getByText("Carlos Ruiz")).toBeInTheDocument();
    expect(screen.getByText("8 tareas")).toBeInTheDocument();
    expect(screen.getByText("25 min / tarea")).toBeInTheDocument();

    expect(
      screen.getByRole("button", { name: /exportar/i }),
    ).toBeInTheDocument();
  });
});
