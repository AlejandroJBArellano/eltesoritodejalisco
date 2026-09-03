import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CategoryModal } from "../CategoryModal";
import type { Category } from "../types";

describe("CategoryModal Component", () => {
  const mockCategory: Category = {
    id: "cat-1",
    name: "Renta",
    color: "#F59E0B",
    tipo_gasto: "fijo",
    created_at: "2026-01-01",
  };

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <CategoryModal
        isOpen={false}
        onClose={vi.fn()}
        editingCategory={null}
        onCreateCategory={vi.fn()}
        onUpdateCategory={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders create category modal and handles submission", async () => {
    const onCreate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <CategoryModal
        isOpen={true}
        onClose={onClose}
        editingCategory={null}
        onCreateCategory={onCreate}
        onUpdateCategory={vi.fn()}
      />,
    );

    expect(screen.getByText("Crear Categoría de Gasto")).toBeInTheDocument();

    fireEvent.change(screen.getByLabelText("Nombre de la Categoría"), {
      target: { value: "Publicidad" },
    });
    fireEvent.change(screen.getByLabelText("Color Distintivo"), {
      target: { value: "#8B5CF6" },
    });
    // Toggle to Fijo
    fireEvent.click(screen.getByRole("button", { name: "Fijo" }));

    const form = screen.getByRole("button", { name: /Guardar Categoría/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(onCreate).toHaveBeenCalledWith({
        name: "Publicidad",
        color: "#8b5cf6",
        tipo_gasto: "fijo",
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("renders edit category modal and populates existing data", async () => {
    const onUpdate = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <CategoryModal
        isOpen={true}
        onClose={onClose}
        editingCategory={mockCategory}
        onCreateCategory={vi.fn()}
        onUpdateCategory={onUpdate}
      />,
    );

    expect(screen.getByText("Editar Categoría")).toBeInTheDocument();
    const nameInput = screen.getByLabelText(
      "Nombre de la Categoría",
    ) as HTMLInputElement;
    expect(nameInput.value).toBe("Renta");

    // Change to Variable
    fireEvent.click(screen.getByRole("button", { name: "Variable" }));
    fireEvent.click(
      screen.getByRole("button", { name: /Actualizar Categoría/i }),
    );

    await waitFor(() => {
      expect(onUpdate).toHaveBeenCalledWith({
        id: "cat-1",
        name: "Renta",
        color: "#F59E0B",
        tipo_gasto: "variable",
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("shows error when name is empty", async () => {
    const onCreate = vi.fn();

    render(
      <CategoryModal
        isOpen={true}
        onClose={vi.fn()}
        editingCategory={null}
        onCreateCategory={onCreate}
        onUpdateCategory={vi.fn()}
      />,
    );

    const form = screen.getByRole("button", { name: /Guardar Categoría/i }).closest("form")!;
    fireEvent.submit(form);

    expect(
      screen.getByText("El nombre de la categoría es requerido"),
    ).toBeInTheDocument();
    expect(onCreate).not.toHaveBeenCalled();
  });

  it("displays error when category submission fails", async () => {
    const onCreate = vi.fn().mockRejectedValue(new Error("Nombre duplicado"));

    render(
      <CategoryModal
        isOpen={true}
        onClose={vi.fn()}
        editingCategory={null}
        onCreateCategory={onCreate}
        onUpdateCategory={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre de la Categoría"), {
      target: { value: "Insumos" },
    });
    fireEvent.click(screen.getByRole("button", { name: /Guardar Categoría/i }));

    await waitFor(() => {
      expect(screen.getByText("Nombre duplicado")).toBeInTheDocument();
    });
  });

  it("handles non-Error rejection gracefully", async () => {
    const onCreate = vi.fn().mockRejectedValue("Error inesperado");

    render(
      <CategoryModal
        isOpen={true}
        onClose={vi.fn()}
        editingCategory={null}
        onCreateCategory={onCreate}
        onUpdateCategory={vi.fn()}
      />,
    );

    fireEvent.change(screen.getByLabelText("Nombre de la Categoría"), {
      target: { value: "Insumos" },
    });
    const form = screen.getByRole("button", { name: /Guardar Categoría/i }).closest("form")!;
    fireEvent.submit(form);

    await waitFor(() => {
      expect(screen.getByText("Error al procesar categoría")).toBeInTheDocument();
    });
  });

  it("calls onClose when clicking Cancel or Close button", () => {
    const onClose = vi.fn();

    render(
      <CategoryModal
        isOpen={true}
        onClose={onClose}
        editingCategory={null}
        onCreateCategory={vi.fn()}
        onUpdateCategory={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Cerrar modal de categoría"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
