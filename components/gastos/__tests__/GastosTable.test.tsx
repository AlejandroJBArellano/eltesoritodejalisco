import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GastosTable, getGastosExportFilename } from "../GastosTable";
import type { Expense } from "../types";

describe("GastosTable Component", () => {
  const mockExpenses: Expense[] = [
    {
      id: "exp-1",
      date: "2026-09-01",
      amount: 1500,
      description: "Pago de Renta Local",
      category_id: "cat-1",
      has_invoice: true,
      created_at: "2026-09-01T10:00:00Z",
      expense_categories: {
        name: "Renta",
        color: "#F59E0B",
        tipo_gasto: "fijo",
      },
    },
    {
      id: "exp-2",
      date: "2026-09-02",
      amount: 450.5,
      description: "Compra de vasos",
      category_id: "cat-2",
      has_invoice: false,
      created_at: "2026-09-02T11:00:00Z",
      expense_categories: {
        name: "Insumos",
        color: "#10B981",
        tipo_gasto: "variable",
      },
    },
  ];

  it("renders table headers, rows, badges, and export button", () => {
    const onSort = vi.fn();
    render(
      <GastosTable
        expenses={mockExpenses}
        filteredCount={2}
        totalCount={5}
        sortField="date"
        sortDirection="desc"
        onSort={onSort}
      >
        <div data-testid="filter-bar-child">Barra de Filtros</div>
      </GastosTable>,
    );

    expect(screen.getByText("Historial de Gastos")).toBeInTheDocument();
    expect(
      screen.getByText("Mostrando 2 de 2 egresos (5 totales)"),
    ).toBeInTheDocument();
    expect(screen.getByTestId("filter-bar-child")).toBeInTheDocument();

    // Headers
    expect(screen.getByText("Fecha")).toBeInTheDocument();
    expect(screen.getByText("Rubro / Categoría")).toBeInTheDocument();
    expect(screen.getByText("Descripción / Motivo")).toBeInTheDocument();
    expect(screen.getByText("Factura")).toBeInTheDocument();
    expect(screen.getByText("Monto")).toBeInTheDocument();

    // Row 1
    expect(screen.getByText("2026-09-01")).toBeInTheDocument();
    expect(screen.getByText("Pago de Renta Local")).toBeInTheDocument();
    expect(screen.getByText("Renta")).toBeInTheDocument();
    expect(screen.getByText("Fijo")).toBeInTheDocument();
    expect(screen.getByText("FAC")).toBeInTheDocument();
    expect(screen.getByText("- $1500.00")).toBeInTheDocument();

    // Row 2
    expect(screen.getByText("2026-09-02")).toBeInTheDocument();
    expect(screen.getByText("Compra de vasos")).toBeInTheDocument();
    expect(screen.getByText("Insumos")).toBeInTheDocument();
    expect(screen.getByText("Var")).toBeInTheDocument();
    expect(screen.getByText("—")).toBeInTheDocument();
    expect(screen.getByText("- $450.50")).toBeInTheDocument();
  });

  it("triggers onSort for sortable columns", () => {
    const onSort = vi.fn();
    render(
      <GastosTable
        expenses={mockExpenses}
        filteredCount={2}
        totalCount={2}
        sortField="date"
        sortDirection="asc"
        onSort={onSort}
      />,
    );

    fireEvent.click(screen.getByText("Fecha"));
    expect(onSort).toHaveBeenCalledWith("date");

    fireEvent.click(screen.getByText("Rubro / Categoría"));
    expect(onSort).toHaveBeenCalledWith("category");

    fireEvent.click(screen.getByText("Descripción / Motivo"));
    expect(onSort).toHaveBeenCalledWith("description");

    fireEvent.click(screen.getByText("Monto"));
    expect(onSort).toHaveBeenCalledWith("amount");
  });

  it("renders empty state message when expenses array is empty", () => {
    render(
      <GastosTable
        expenses={[]}
        filteredCount={0}
        totalCount={0}
        sortField="date"
        sortDirection="desc"
        onSort={vi.fn()}
      />,
    );

    expect(
      screen.getByText(
        "No hay registros de gastos encontrados para los filtros seleccionados.",
      ),
    ).toBeInTheDocument();
  });

  it("generates default export filename with current date", () => {
    const filename = getGastosExportFilename();
    expect(filename).toMatch(/^gastos_\d{4}-\d{2}-\d{2}$/);
  });
});
