import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TareasClient } from "../TareasClient";
import type { TaskExecution, PrimordialTask } from "@/types";
import * as exportLib from "@/lib/export";

vi.mock("@/lib/actions/tasks", () => ({
  startTask: vi.fn(),
  pauseTask: vi.fn(),
  resumeTask: vi.fn(),
  completeTask: vi.fn(),
}));

vi.mock("@/lib/supabase/client", () => ({
  createClient: vi.fn().mockReturnValue({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: null, error: null }),
        }),
      }),
    }),
  }),
}));

describe("TareasClient Component", () => {
  const mockTasks: PrimordialTask[] = [
    {
      id: "task-1",
      name: "Limpieza de Freidora",
      category_id: "cat-1",
      frequency_type: "DAILY",
      timeout_minutes: 20,
      requires_photo: false,
      is_active: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      category: {
        id: "cat-1",
        name: "Cocina",
        created_at: "2026-01-01",
        updated_at: "2026-01-01",
      },
    },
  ];

  const mockExecutions: TaskExecution[] = [];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render checklist header, tasks and export button", () => {
    render(
      <TareasClient
        initialTasks={mockTasks}
        initialExecutions={mockExecutions}
        userId="user-1"
      />,
    );

    expect(screen.getByText(/Checklist de Turno/i)).toBeInTheDocument();
    expect(screen.getByText("Limpieza de Freidora")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument();
  });

  it("should trigger export when export button is clicked", async () => {
    const user = userEvent.setup();
    const exportCSVSpy = vi.spyOn(exportLib, "exportToCSV").mockImplementation(() => {});

    render(
      <TareasClient
        initialTasks={mockTasks}
        initialExecutions={mockExecutions}
        userId="user-1"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Exportar/i }));
    await user.click(screen.getByText("CSV (.csv)"));

    expect(exportCSVSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringContaining("checklist_tareas_"),
        data: mockTasks,
      }),
    );
  });
});
