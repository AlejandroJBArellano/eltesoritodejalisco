import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TareasClient } from "../TareasClient";
import type { TaskExecution, PrimordialTask } from "@/types";
import * as exportLib from "@/lib/export";
import {
  startTask,
  pauseTask,
  resumeTask,
  completeTask,
  uploadTaskPhoto,
} from "@/lib/actions/tasks";

vi.mock("@/lib/actions/tasks", () => ({
  startTask: vi.fn(),
  pauseTask: vi.fn(),
  resumeTask: vi.fn(),
  completeTask: vi.fn(),
  uploadTaskPhoto: vi.fn(),
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
    {
      id: "task-2",
      name: "Revisión de Baños",
      category_id: "cat-2",
      frequency_type: "ROUTINE",
      timeout_minutes: 15,
      requires_photo: true,
      is_active: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
      category: {
        id: "cat-2",
        name: "Limpieza",
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
    expect(screen.getByText("Revisión de Baños")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Exportar/i }),
    ).toBeInTheDocument();
  });

  it("should trigger export when export button is clicked", async () => {
    const user = userEvent.setup();
    const exportCSVSpy = vi
      .spyOn(exportLib, "exportToCSV")
      .mockImplementation(() => {});

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

  it("should start a task when clicking Iniciar", async () => {
    const newExec: TaskExecution = {
      id: "exec-1",
      task_id: "task-1",
      user_id: "user-1",
      status: "IN_PROGRESS",
      start_time: new Date().toISOString(),
      last_resumed_at: new Date().toISOString(),
      paused_seconds: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    vi.mocked(startTask).mockResolvedValue(newExec);

    render(
      <TareasClient
        initialTasks={mockTasks}
        initialExecutions={[]}
        userId="user-1"
      />,
    );

    const startButtons = screen.getAllByRole("button", { name: /Iniciar/i });
    fireEvent.click(startButtons[0]);

    await waitFor(() => {
      expect(startTask).toHaveBeenCalledWith("task-1");
    });
  });

  it("should pause and resume an active task", async () => {
    const activeExec: TaskExecution = {
      id: "exec-1",
      task_id: "task-1",
      user_id: "user-1",
      status: "IN_PROGRESS",
      start_time: new Date().toISOString(),
      last_resumed_at: new Date().toISOString(),
      paused_seconds: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const pausedExec = { ...activeExec, status: "PAUSED" as const };
    const resumedExec = { ...activeExec, status: "IN_PROGRESS" as const };

    vi.mocked(pauseTask).mockResolvedValue(pausedExec);
    vi.mocked(resumeTask).mockResolvedValue(resumedExec);

    render(
      <TareasClient
        initialTasks={mockTasks}
        initialExecutions={[activeExec]}
        userId="user-1"
      />,
    );

    const pauseButton = screen.getByRole("button", { name: /Pausar/i });
    fireEvent.click(pauseButton);

    await waitFor(() => {
      expect(pauseTask).toHaveBeenCalledWith("exec-1");
    });
  });

  it("should complete task without photo when photo is not required", async () => {
    const activeExec: TaskExecution = {
      id: "exec-1",
      task_id: "task-1",
      user_id: "user-1",
      status: "IN_PROGRESS",
      start_time: new Date().toISOString(),
      last_resumed_at: new Date().toISOString(),
      paused_seconds: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const completedExec = { ...activeExec, status: "COMPLETED" as const };
    vi.mocked(completeTask).mockResolvedValue(completedExec);

    render(
      <TareasClient
        initialTasks={mockTasks}
        initialExecutions={[activeExec]}
        userId="user-1"
      />,
    );

    const completeButton = screen.getByRole("button", { name: /Completar/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(uploadTaskPhoto).not.toHaveBeenCalled();
      expect(completeTask).toHaveBeenCalledWith("exec-1", "");
    });
  });

  it("should show error if task requires photo and none is selected", async () => {
    const activeExec: TaskExecution = {
      id: "exec-2",
      task_id: "task-2",
      user_id: "user-1",
      status: "IN_PROGRESS",
      start_time: new Date().toISOString(),
      last_resumed_at: new Date().toISOString(),
      paused_seconds: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    render(
      <TareasClient
        initialTasks={mockTasks}
        initialExecutions={[activeExec]}
        userId="user-1"
      />,
    );

    const completeButton = screen.getByRole("button", { name: /Completar/i });
    fireEvent.click(completeButton);

    expect(
      screen.getByText(
        /Esta tarea requiere una foto de evidencia para completarse/i,
      ),
    ).toBeInTheDocument();
    expect(completeTask).not.toHaveBeenCalled();
  });

  it("should upload photo to S3 via uploadTaskPhoto and complete task", async () => {
    const activeExec: TaskExecution = {
      id: "exec-2",
      task_id: "task-2",
      user_id: "user-1",
      status: "IN_PROGRESS",
      start_time: new Date().toISOString(),
      last_resumed_at: new Date().toISOString(),
      paused_seconds: 0,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const s3Url = "https://test-bucket.s3.us-east-1.amazonaws.com/tenant-1/task-photos/evidence.jpg";
    vi.mocked(uploadTaskPhoto).mockResolvedValue(s3Url);
    vi.mocked(completeTask).mockResolvedValue({
      ...activeExec,
      status: "COMPLETED",
      photo_url: s3Url,
    });

    render(
      <TareasClient
        initialTasks={mockTasks}
        initialExecutions={[activeExec]}
        userId="user-1"
      />,
    );

    const file = new File(["dummy evidence"], "evidence.jpg", {
      type: "image/jpeg",
    });
    const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement;
    expect(fileInput).toBeInTheDocument();

    fireEvent.change(fileInput, { target: { files: [file] } });

    const completeButton = screen.getByRole("button", { name: /Completar/i });
    fireEvent.click(completeButton);

    await waitFor(() => {
      expect(uploadTaskPhoto).toHaveBeenCalled();
      expect(completeTask).toHaveBeenCalledWith("exec-2", s3Url);
    });
  });
});
