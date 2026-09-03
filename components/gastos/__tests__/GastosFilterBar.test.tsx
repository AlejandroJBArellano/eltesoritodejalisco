import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { GastosFilterBar } from "../GastosFilterBar";
import type { Category } from "../types";

describe("GastosFilterBar Component", () => {
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

  it("renders all filter controls and handles change events", () => {
    const onSearchChange = vi.fn();
    const onCategoryFilterChange = vi.fn();
    const onInvoiceFilterChange = vi.fn();
    const onTypeFilterChange = vi.fn();

    render(
      <GastosFilterBar
        categories={mockCategories}
        search=""
        onSearchChange={onSearchChange}
        categoryFilter=""
        onCategoryFilterChange={onCategoryFilterChange}
        invoiceFilter="all"
        onInvoiceFilterChange={onInvoiceFilterChange}
        typeFilter="all"
        onTypeFilterChange={onTypeFilterChange}
      />,
    );

    // Search
    const searchInput = screen.getByPlaceholderText("Descripción o categoría...");
    fireEvent.change(searchInput, { target: { value: "Gasolina" } });
    expect(onSearchChange).toHaveBeenCalledWith("Gasolina");

    // Category
    const categorySelect = screen.getByLabelText("Filtrar por categoría");
    fireEvent.change(categorySelect, { target: { value: "cat-1" } });
    expect(onCategoryFilterChange).toHaveBeenCalledWith("cat-1");

    // Invoice
    const invoiceSelect = screen.getByLabelText("Filtrar por factura");
    fireEvent.change(invoiceSelect, { target: { value: "invoiced" } });
    expect(onInvoiceFilterChange).toHaveBeenCalledWith("invoiced");

    // Type
    const typeSelect = screen.getByLabelText("Filtrar por tipo de gasto");
    fireEvent.change(typeSelect, { target: { value: "fijo" } });
    expect(onTypeFilterChange).toHaveBeenCalledWith("fijo");
  });

  it("renders clear button when search is non-empty and clears search on click", () => {
    const onSearchChange = vi.fn();

    render(
      <GastosFilterBar
        categories={mockCategories}
        search="café"
        onSearchChange={onSearchChange}
        categoryFilter=""
        onCategoryFilterChange={vi.fn()}
        invoiceFilter="all"
        onInvoiceFilterChange={vi.fn()}
        typeFilter="all"
        onTypeFilterChange={vi.fn()}
      />,
    );

    const clearBtn = screen.getByLabelText("Limpiar búsqueda");
    expect(clearBtn).toBeInTheDocument();

    fireEvent.click(clearBtn);
    expect(onSearchChange).toHaveBeenCalledWith("");
  });
});
