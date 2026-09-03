import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { AdminTareasClient } from "../AdminTareasClient";
import type { TaskExecution, TaskCategory, PrimordialTask } from "@/types";
import * as exportLib from "@/lib/export";

vi.mock("@/lib/actions/tasks", () => ({
  approveTask: vi.fn(),
  getExecutionsForDate: vi.fn().mockImplementation(() => Promise.resolve([])),
  getStaffPerformanceMetrics: vi.fn().mockResolvedValue([]),
  createTaskCategory: vi.fn(),
  createPrimordialTask: vi.fn(),
  updatePrimordialTask: vi.fn(),
  deletePrimordialTask: vi.fn(),
}));

describe("AdminTareasClient Component", () => {
  const mockCategories: TaskCategory[] = [
    {
      id: "cat-1",
      name: "Apertura",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
    {
      id: "cat-2",
      name: "Cocina",
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    },
  ];

  const mockTasks: PrimordialTask[] = [
    {
      id: "task-1",
      name: "Encender Plancha",
      category_id: "cat-1",
      frequency_type: "DAILY",
      timeout_minutes: 15,
      requires_photo: false,
      is_active: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      category: mockCategories[0],
    },
    {
      id: "task-2",
      name: "Desinfectar Mesa",
      category_id: "cat-2",
      frequency_type: "DAILY",
      timeout_minutes: 30,
      requires_photo: true,
      is_active: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      category: mockCategories[1],
    },
  ];

  const mockExecutions: TaskExecution[] = [
    {
      id: "exec-1",
      task_id: "task-1",
      user_id: "user-1",
      status: "COMPLETED",
      start_time: "2026-09-03T08:00:00Z",
      end_time: "2026-09-03T08:14:00Z",
      paused_seconds: 0,
      created_at: "2026-09-03T08:00:00Z",
      updated_at: "2026-09-03T08:14:00Z",
      task: mockTasks[0],
      user: { id: "user-1", full_name: "Carlos" },
    },
  ];

  beforeEach(async () => {
    vi.clearAllMocks();
    const tasksActions = await import("@/lib/actions/tasks");
    vi.mocked(tasksActions.getExecutionsForDate).mockResolvedValue(mockExecutions);
  });

  it("should render active tab 'history' and display export button", () => {
    render(
      <AdminTareasClient
        initialExecutions={mockExecutions}
        initialCategories={mockCategories}
        initialTasks={mockTasks}
      />,
    );

    expect(screen.getByText(/Ejecución de Tareas/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument();
    expect(screen.getByText("Carlos")).toBeInTheDocument();
  });

  it("should trigger export for executions in history tab", async () => {
    const user = userEvent.setup();
    const exportCSVSpy = vi.spyOn(exportLib, "exportToCSV").mockImplementation(() => {});

    render(
      <AdminTareasClient
        initialExecutions={mockExecutions}
        initialCategories={mockCategories}
        initialTasks={mockTasks}
      />,
    );

    await user.click(screen.getByRole("button", { name: /Exportar/i }));
    await user.click(screen.getByText("CSV (.csv)"));

    expect(exportCSVSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringContaining("ejecucion_tareas_"),
        data: expect.arrayContaining([
          expect.objectContaining({ id: "exec-1" }),
        ]),
      }),
    );
  });

  it("should switch to config tab and render export button for tasks catalog", async () => {
    const user = userEvent.setup();
    render(
      <AdminTareasClient
        initialExecutions={mockExecutions}
        initialCategories={mockCategories}
        initialTasks={mockTasks}
      />,
    );

    // Click config tab
    await user.click(screen.getByRole("button", { name: /Configuración/i }));

    expect(screen.getByText(/Catálogo de Tareas Primordiales/i)).toBeInTheDocument();
    expect(screen.getByText("Encender Plancha")).toBeInTheDocument();
    expect(screen.getByText("Desinfectar Mesa")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument();
  });
});
