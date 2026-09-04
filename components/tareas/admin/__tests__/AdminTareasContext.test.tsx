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
});
