import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GastosHeader } from "../GastosHeader";

describe("GastosHeader Component", () => {
  it("renders title, subtitle, and action buttons", () => {
    const onOpenExpense = vi.fn();
    const onOpenCategory = vi.fn();

    render(
      <GastosHeader
        onOpenExpenseModal={onOpenExpense}
        onOpenCategoryModal={onOpenCategory}
      />,
    );

    expect(screen.getByText("Control de Gastos & Egresos")).toBeInTheDocument();
    expect(
      screen.getByText(
        "Registro contable, deducciones operativas y categorización financiera",
      ),
    ).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Registrar Gasto/i })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Nueva Categoría/i })).toBeInTheDocument();
  });

  it("triggers callback when Registrar Gasto button is clicked", () => {
    const onOpenExpense = vi.fn();
    const onOpenCategory = vi.fn();

    render(
      <GastosHeader
        onOpenExpenseModal={onOpenExpense}
        onOpenCategoryModal={onOpenCategory}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Registrar Gasto/i }));
    expect(onOpenExpense).toHaveBeenCalledTimes(1);
    expect(onOpenCategory).not.toHaveBeenCalled();
  });

  it("triggers callback when Nueva Categoría button is clicked", () => {
    const onOpenExpense = vi.fn();
    const onOpenCategory = vi.fn();

    render(
      <GastosHeader
        onOpenExpenseModal={onOpenExpense}
        onOpenCategoryModal={onOpenCategory}
      />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Nueva Categoría/i }));
    expect(onOpenCategory).toHaveBeenCalledTimes(1);
    expect(onOpenExpense).not.toHaveBeenCalled();
  });
});
