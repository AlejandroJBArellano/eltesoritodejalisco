import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { AdminTaskConfigTab } from "../AdminTaskConfigTab";
import type { PrimordialTask, TaskCategory } from "@/types";

const mockCategories: TaskCategory[] = [
  { id: "cat-1", name: "Cocina", created_at: "2026-01-01", updated_at: "2026-01-01" },
  { id: "cat-2", name: "Barra", created_at: "2026-01-01", updated_at: "2026-01-01" },
];

const mockTasks: PrimordialTask[] = [
  {
    id: "task-1",
    name: "Limpieza de Plancha",
    frequency_type: "DAILY",
    requires_photo: true,
    timeout_minutes: 30,
    category_id: "cat-1",
    category: mockCategories[0],
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
  {
    id: "task-2",
    name: "Conteo de Vinos",
    frequency_type: "WEEKLY",
    requires_photo: false,
    timeout_minutes: 45,
    category_id: "cat-2",
    category: mockCategories[1],
    is_active: true,
    created_at: "2026-01-01",
    updated_at: "2026-01-01",
  },
];

describe("AdminTaskConfigTab Component", () => {
  it("renders empty state when no tasks match", () => {
    render(
      <AdminTaskConfigTab
        filteredTasks={[]}
        paginatedTasks={[]}
        sortedTasks={[]}
        categories={mockCategories}
      />,
    );

    expect(screen.getByText("No hay tareas configuradas.")).toBeInTheDocument();
  });

  it("renders tasks list with categories, frequency, evidence badges, and triggers edit and delete", () => {
    const onEditMock = vi.fn();
    const onDeleteMock = vi.fn();
    const onSearchMock = vi.fn();
    const onCatFilterMock = vi.fn();
    const onFreqFilterMock = vi.fn();
    const onSortMock = vi.fn();

    render(
      <AdminTaskConfigTab
        filteredTasks={mockTasks}
        sortedTasks={mockTasks}
        paginatedTasks={mockTasks}
        categories={mockCategories}
        onEditTask={onEditMock}
        onDeleteTask={onDeleteMock}
        onSearchChange={onSearchMock}
        onCategoryFilterChange={onCatFilterMock}
        onFrequencyFilterChange={onFreqFilterMock}
        onSort={onSortMock}
        armedTaskId="task-1"
      />,
    );

    expect(
      screen.getByText("Catálogo de Tareas Primordiales (2)"),
    ).toBeInTheDocument();
    expect(screen.getByText("Limpieza de Plancha")).toBeInTheDocument();
    expect(screen.getByText("Conteo de Vinos")).toBeInTheDocument();
    expect(screen.getByText("📷 Requiere Foto | 30 min")).toBeInTheDocument();
    expect(screen.getByText("Sin Foto | 45 min")).toBeInTheDocument();

    // Filters
    const searchInput = screen.getByPlaceholderText(
      /buscar por nombre de tarea/i,
    );
    fireEvent.change(searchInput, { target: { value: "Plancha" } });
    expect(onSearchMock).toHaveBeenCalledWith("Plancha");

    // Edit action
    const editButtons = screen.getAllByTitle("Editar Tarea");
    fireEvent.click(editButtons[0]);
    expect(onEditMock).toHaveBeenCalledWith(mockTasks[0]);

    // Armed delete button
    const armedDeleteBtn = screen.getByTitle("¿Confirmar eliminación?");
    expect(armedDeleteBtn).toBeInTheDocument();
    fireEvent.click(armedDeleteBtn);
    expect(onDeleteMock).toHaveBeenCalledWith("task-1");

    // Unarmed delete button
    const normalDeleteBtn = screen.getByTitle("Desactivar Tarea");
    fireEvent.click(normalDeleteBtn);
    expect(onDeleteMock).toHaveBeenCalledWith("task-2");
  });
});
