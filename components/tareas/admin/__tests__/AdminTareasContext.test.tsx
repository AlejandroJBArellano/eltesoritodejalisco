import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, renderHook, act } from "@testing-library/react";
import React from "react";
import {
  AdminTareasProvider,
  useAdminTareasContext,
} from "../AdminTareasContext";
import { AdminTareasContent } from "../AdminTareasContent";
import type { TaskCategory, TaskExecution, PrimordialTask } from "@/types";

vi.mock("@/lib/actions/tasks", () => ({
  approveTask: vi.fn(),
  getExecutionsForDate: vi.fn().mockResolvedValue([]),
  getStaffPerformanceMetrics: vi.fn().mockResolvedValue([]),
  createTaskCategory: vi.fn().mockImplementation((name) =>
    Promise.resolve({ id: "cat-new", name, created_at: "2026-01-01" }),
  ),
  createPrimordialTask: vi.fn().mockImplementation((name, freq, photo, timeout, catId) =>
    Promise.resolve({
      id: "task-new",
      name,
      frequency_type: freq,
      requires_photo: photo,
      timeout_minutes: timeout,
      category_id: catId,
      is_active: true,
      created_at: "2026-01-01",
    }),
  ),
  updatePrimordialTask: vi.fn().mockImplementation((id, name, freq, photo, timeout, catId) =>
    Promise.resolve({
      id,
      name,
      frequency_type: freq,
      requires_photo: photo,
      timeout_minutes: timeout,
      category_id: catId,
      is_active: true,
      created_at: "2026-01-01",
    }),
  ),
  deletePrimordialTask: vi.fn().mockResolvedValue(true),
}));

const mockCategories: TaskCategory[] = [
  { id: "cat-1", name: "Cocina", created_at: "2026-01-01", updated_at: "2026-01-01" },
];

const mockTasks: PrimordialTask[] = [
  {
    id: "task-1",
    name: "Limpieza",
    category_id: "cat-1",
    frequency_type: "DAILY",
    requires_photo: false,
    timeout_minutes: 30,
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

const mockExecutions: TaskExecution[] = [
  {
    id: "exec-1",
    task_id: "task-1",
    user_id: "u-1",
    status: "COMPLETED",
    start_time: "2026-09-03T10:00:00Z",
    paused_seconds: 0,
    created_at: "2026-09-03T10:00:00Z",
    updated_at: "2026-09-03T10:00:00Z",
  },
];

describe("AdminTareasContext and Provider", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("throws error when useAdminTareasContext is called outside provider", () => {
    // Suppress console.error in this test as React logs the uncaught error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => renderHook(() => useAdminTareasContext())).toThrow(
      "useAdminTareasContext must be used within an AdminTareasProvider",
    );
    spy.mockRestore();
  });

  it("provides initial state and manages navigation and modal states", () => {
    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminTareasProvider
        initialCategories={mockCategories}
        initialTasks={mockTasks}
        initialExecutions={mockExecutions}
      >
        {children}
      </AdminTareasProvider>
    );

    const { result } = renderHook(() => useAdminTareasContext(), { wrapper });

    expect(result.current.activeTab).toBe("history");
    expect(result.current.categories).toEqual(mockCategories);
    expect(result.current.tasks).toEqual(mockTasks);

    // Switch tab
    act(() => {
      result.current.setActiveTab("config");
    });
    expect(result.current.activeTab).toBe("config");

    // Open/close category modal
    act(() => {
      result.current.openCategoryModal();
    });
    expect(result.current.isCategoryModalOpen).toBe(true);

    act(() => {
      result.current.closeCategoryModal();
    });
    expect(result.current.isCategoryModalOpen).toBe(false);

    // Open new task modal
    act(() => {
      result.current.openNewTaskModal();
    });
    expect(result.current.isTaskModalOpen).toBe(true);
    expect(result.current.editingTaskId).toBeNull();

    act(() => {
      result.current.closeTaskModal();
    });
    expect(result.current.isTaskModalOpen).toBe(false);

    // Open edit task modal
    act(() => {
      result.current.openEditTaskModal(mockTasks[0]);
    });
    expect(result.current.isTaskModalOpen).toBe(true);
    expect(result.current.editingTaskId).toBe("task-1");
    expect(result.current.taskFormData.name).toBe("Limpieza");
  });

  it("renders AdminTareasContent correctly inside AdminTareasProvider", () => {
    render(
      <AdminTareasProvider
        initialCategories={mockCategories}
        initialTasks={mockTasks}
        initialExecutions={mockExecutions}
      >
        <AdminTareasContent />
      </AdminTareasProvider>,
    );

    // Check header tabs render
    expect(screen.getByText(/📋 Historial/i)).toBeInTheDocument();
    expect(screen.getByText(/📊 Rendimiento/i)).toBeInTheDocument();
    expect(screen.getByText(/⚙️ Configuración/i)).toBeInTheDocument();

    // Click config tab
    fireEvent.click(screen.getByText(/⚙️ Configuración/i));
    expect(screen.getByText(/Catálogo de Tareas Primordiales/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /nueva categoría/i })).toBeInTheDocument();
  });

  it("calculates unifiedExecutions with NOT_DONE virtual rows and filters by compliance and collaborator", () => {
    const activeTaskWithNoExec: PrimordialTask = {
      id: "task-2",
      name: "Cierre de Gas",
      category_id: "cat-1",
      frequency_type: "CLOSING",
      requires_photo: false,
      timeout_minutes: 15,
      is_active: true,
      created_at: "2026-01-01",
      updated_at: "2026-01-01",
    };

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminTareasProvider
        initialCategories={mockCategories}
        initialTasks={[...mockTasks, activeTaskWithNoExec]}
        initialExecutions={mockExecutions}
      >
        {children}
      </AdminTareasProvider>
    );

    const { result } = renderHook(() => useAdminTareasContext(), { wrapper });

    // Should contain 2 unified executions: exec-1 (COMPLETED) and not-done-task-2 (NOT_DONE)
    expect(result.current.unifiedExecutions).toHaveLength(2);
    const virtualRow = result.current.unifiedExecutions.find(
      (e) => e.task_id === "task-2",
    );
    expect(virtualRow).toBeDefined();
    expect(virtualRow?.status).toBe("NOT_DONE");

    // Collaborators list derived
    expect(result.current.collaborators).toHaveLength(1);

    // Compliance filter: COMPLETADAS
    act(() => {
      result.current.setExecComplianceFilter("COMPLETED");
    });
    expect(result.current.sortedExecutions).toHaveLength(1);
    expect(result.current.sortedExecutions[0].id).toBe("exec-1");

    // Compliance filter: NO REALIZADAS
    act(() => {
      result.current.setExecComplianceFilter("NOT_DONE");
    });
    expect(result.current.sortedExecutions).toHaveLength(1);
    expect(result.current.sortedExecutions[0].status).toBe("NOT_DONE");

    // Reset compliance filter
    act(() => {
      result.current.setExecComplianceFilter("ALL");
    });
    expect(result.current.sortedExecutions).toHaveLength(2);

    // Collaborator filter: u-1
    act(() => {
      result.current.setExecUserFilter("u-1");
    });
    expect(result.current.sortedExecutions).toHaveLength(1);
    expect(result.current.sortedExecutions[0].user_id).toBe("u-1");

    // Collaborator filter: UNASSIGNED
    act(() => {
      result.current.setExecUserFilter("UNASSIGNED");
    });
    expect(result.current.sortedExecutions).toHaveLength(1);
    expect(result.current.sortedExecutions[0].status).toBe("NOT_DONE");
  });

  it("loads executions for a past date without month restriction error", async () => {
    const { getExecutionsForDate, getStaffPerformanceMetrics } = await import(
      "@/lib/actions/tasks"
    );

    const wrapper = ({ children }: { children: React.ReactNode }) => (
      <AdminTareasProvider
        initialCategories={mockCategories}
        initialTasks={mockTasks}
        initialExecutions={mockExecutions}
      >
        {children}
      </AdminTareasProvider>
    );

    const { result } = renderHook(() => useAdminTareasContext(), { wrapper });

    await act(async () => {
      result.current.setSelectedDate("2025-01-15");
    });

    expect(result.current.errorMsg).toBeNull();
    expect(getExecutionsForDate).toHaveBeenCalledWith("2025-01-15");
    expect(getStaffPerformanceMetrics).toHaveBeenCalledWith("2025-01-15");
  });
});
