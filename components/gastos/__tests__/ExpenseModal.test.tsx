import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { ExpenseModal } from "../ExpenseModal";
import type { Category } from "../types";

describe("ExpenseModal Component", () => {
  const mockCategories: Category[] = [
    {
      id: "cat-1",
      name: "Renta",
      color: "#F59E0B",
      tipo_gasto: "fijo",
      created_at: "2026-01-01",
    },
    {
      id: "cat-2",
      name: "Insumos",
      color: "#10B981",
      tipo_gasto: "variable",
      created_at: "2026-01-01",
    },
  ];

  it("renders nothing when isOpen is false", () => {
    const { container } = render(
      <ExpenseModal
        isOpen={false}
        onClose={vi.fn()}
        categories={mockCategories}
        onSubmit={vi.fn()}
      />,
    );
    expect(container.firstChild).toBeNull();
  });

  it("renders empty category warning and disables submit when categories array is empty", () => {
    render(
      <ExpenseModal
        isOpen={true}
        onClose={vi.fn()}
        categories={[]}
        onSubmit={vi.fn()}
      />,
    );

    expect(screen.getByText("Crea una categoría primero ☝️")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Guardar Gasto/i })).toBeDisabled();
  });

  it("handles form submission with valid values", async () => {
    const onSubmit = vi.fn().mockResolvedValue(undefined);
    const onClose = vi.fn();

    render(
      <ExpenseModal
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Categoría"), {
      target: { value: "cat-2" },
    });
    fireEvent.change(screen.getByLabelText("Monto"), {
      target: { value: "850.50" },
    });
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Compra de café en grano" },
    });
    fireEvent.change(screen.getByLabelText("Fecha"), {
      target: { value: "2026-09-15" },
    });
    fireEvent.click(screen.getByLabelText("¿Facturado?"));

    fireEvent.click(screen.getByRole("button", { name: /Guardar Gasto/i }));

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith({
        category_id: "cat-2",
        amount: 850.5,
        description: "Compra de café en grano",
        has_invoice: true,
        date: "2026-09-15",
      });
      expect(onClose).toHaveBeenCalled();
    });
  });

  it("displays validation error when required fields are missing", async () => {
    const onSubmit = vi.fn();

    render(
      <ExpenseModal
        isOpen={true}
        onClose={vi.fn()}
        categories={mockCategories}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Categoría"), {
      target: { value: "cat-1" },
    });
    fireEvent.change(screen.getByLabelText("Monto"), {
      target: { value: "-5" },
    });
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Prueba" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Guardar Gasto/i }));

    expect(
      screen.getByText("Completa todos los campos requeridos"),
    ).toBeInTheDocument();
    expect(onSubmit).not.toHaveBeenCalled();
  });

  it("displays error message when onSubmit fails", async () => {
    const onSubmit = vi.fn().mockRejectedValue(new Error("Error en el servidor"));

    render(
      <ExpenseModal
        isOpen={true}
        onClose={vi.fn()}
        categories={mockCategories}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Categoría"), {
      target: { value: "cat-1" },
    });
    fireEvent.change(screen.getByLabelText("Monto"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Servicio de luz" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Guardar Gasto/i }));

    await waitFor(() => {
      expect(screen.getByText("Error en el servidor")).toBeInTheDocument();
    });
  });

  it("handles non-Error rejection in onSubmit gracefully", async () => {
    const onSubmit = vi.fn().mockRejectedValue("Falla desconocida");

    render(
      <ExpenseModal
        isOpen={true}
        onClose={vi.fn()}
        categories={mockCategories}
        onSubmit={onSubmit}
      />,
    );

    fireEvent.change(screen.getByLabelText("Categoría"), {
      target: { value: "cat-1" },
    });
    fireEvent.change(screen.getByLabelText("Monto"), {
      target: { value: "500" },
    });
    fireEvent.change(screen.getByLabelText("Descripción"), {
      target: { value: "Servicio de luz" },
    });

    fireEvent.click(screen.getByRole("button", { name: /Guardar Gasto/i }));

    await waitFor(() => {
      expect(screen.getByText("Error al registrar gasto")).toBeInTheDocument();
    });
  });

  it("calls onClose when clicking Cancel or Close button", () => {
    const onClose = vi.fn();

    render(
      <ExpenseModal
        isOpen={true}
        onClose={onClose}
        categories={mockCategories}
        onSubmit={vi.fn()}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(onClose).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByLabelText("Cerrar modal de gasto"));
    expect(onClose).toHaveBeenCalledTimes(2);
  });
});
