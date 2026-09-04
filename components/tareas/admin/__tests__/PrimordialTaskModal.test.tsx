import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { PrimordialTaskModal } from "../PrimordialTaskModal";
import type { TaskCategory } from "@/types";
import type { TaskFormData } from "../types";

const mockCategories: TaskCategory[] = [
  { id: "cat-1", name: "Cocina", created_at: "2026-01-01", updated_at: "2026-01-01" },
  { id: "cat-2", name: "Barra", created_at: "2026-01-01", updated_at: "2026-01-01" },
];

const mockFormData: TaskFormData = {
  name: "Limpieza de Hornos",
  categoryId: "cat-1",
  frequencyType: "DAILY",
  requiresPhoto: true,
  timeoutMinutes: 45,
};

describe("PrimordialTaskModal Component", () => {
  it("does not render modal when isOpen is false", () => {
    render(<PrimordialTaskModal isOpen={false} />);
    expect(screen.queryByText("Nueva Tarea")).not.toBeInTheDocument();
  });

  it("renders 'Nueva Tarea' when isEditing is false and propagates changes", () => {
    const onFormChangeMock = vi.fn();
    const onSubmitMock = vi.fn((e) => e.preventDefault());
    const onCloseMock = vi.fn();

    render(
      <PrimordialTaskModal
        isOpen={true}
        isEditing={false}
        categories={mockCategories}
        formData={mockFormData}
        onFormChange={onFormChangeMock}
        onSubmit={onSubmitMock}
        onClose={onCloseMock}
        isLoading={false}
      />,
    );

    expect(screen.getByText("Nueva Tarea")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /guardar tarea/i })).toBeInTheDocument();

    const nameInput = screen.getByPlaceholderText(/Ej. Limpieza de Freidoras/i);
    expect(nameInput).toHaveValue("Limpieza de Hornos");
    fireEvent.change(nameInput, { target: { value: "Desinfección de Mesas" } });
    expect(onFormChangeMock).toHaveBeenCalledWith({ name: "Desinfección de Mesas" });

    const photoCheckbox = screen.getByRole("checkbox", { name: /requiere foto de evidencia/i });
    expect(photoCheckbox).toBeChecked();
    fireEvent.click(photoCheckbox);
    expect(onFormChangeMock).toHaveBeenCalledWith({ requiresPhoto: false });

    const timeoutInput = screen.getByRole("spinbutton");
    expect(timeoutInput).toHaveValue(45);
    fireEvent.change(timeoutInput, { target: { value: "30" } });
    expect(onFormChangeMock).toHaveBeenCalledWith({ timeoutMinutes: 30 });

    const cancelBtn = screen.getByRole("button", { name: /cancelar/i });
    fireEvent.click(cancelBtn);
    expect(onCloseMock).toHaveBeenCalledTimes(1);

    const submitBtn = screen.getByRole("button", { name: /guardar tarea/i });
    fireEvent.click(submitBtn);
    expect(onSubmitMock).toHaveBeenCalled();
  });

  it("renders 'Editar Tarea' when isEditing is true with loading state", () => {
    render(
      <PrimordialTaskModal
        isOpen={true}
        isEditing={true}
        categories={mockCategories}
        formData={mockFormData}
        isLoading={true}
      />,
    );

    expect(screen.getByText("Editar Tarea")).toBeInTheDocument();
    const submitBtn = screen.getByRole("button", { name: /guardando\.\.\./i });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).toBeDisabled();
  });
});
