import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GastosCategoriesGrid } from "../GastosCategoriesGrid";
import type { Category } from "../types";

describe("GastosCategoriesGrid Component", () => {
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

  it("renders list of categories with proper names, types, and colors", () => {
    const onOpenCreate = vi.fn();
    const onEdit = vi.fn();

    render(
      <GastosCategoriesGrid
        categories={mockCategories}
        onOpenCreateCategory={onOpenCreate}
        onEditCategory={onEdit}
      />,
    );

    expect(screen.getByText("Categorías Registradas")).toBeInTheDocument();
    expect(screen.getByText("Renta")).toBeInTheDocument();
    expect(screen.getByText("Insumos")).toBeInTheDocument();
    expect(screen.getByText("Fijo")).toBeInTheDocument();
    expect(screen.getByText("Var")).toBeInTheDocument();
  });

  it("triggers onOpenCreateCategory when header action is clicked", () => {
    const onOpenCreate = vi.fn();
    const onEdit = vi.fn();

    render(
      <GastosCategoriesGrid
        categories={mockCategories}
        onOpenCreateCategory={onOpenCreate}
        onEditCategory={onEdit}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Nueva Categoría/i }));
    expect(onOpenCreate).toHaveBeenCalledTimes(1);
  });

  it("triggers onEditCategory when clicking edit icon on a category card", () => {
    const onOpenCreate = vi.fn();
    const onEdit = vi.fn();

    render(
      <GastosCategoriesGrid
        categories={mockCategories}
        onOpenCreateCategory={onOpenCreate}
        onEditCategory={onEdit}
      />,
    );

    const editBtn = screen.getByLabelText("Editar categoría Renta");
    fireEvent.click(editBtn);

    expect(onEdit).toHaveBeenCalledWith(mockCategories[0]);
  });

  it("shows empty state message when there are no categories", () => {
    render(
      <GastosCategoriesGrid
        categories={[]}
        onOpenCreateCategory={vi.fn()}
        onEditCategory={vi.fn()}
      />,
    );

    expect(
      screen.getByText("No hay categorías registradas."),
    ).toBeInTheDocument();
  });
});
