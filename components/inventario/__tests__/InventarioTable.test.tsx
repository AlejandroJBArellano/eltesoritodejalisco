import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InventarioTable } from "../InventarioTable";
import type { Ingredient } from "@/types";
import * as exportLib from "@/lib/export";

describe("InventarioTable Component", () => {
  const mockIngredients: Ingredient[] = [
    {
      id: "ing-1",
      name: "Tortillas de Maíz",
      unit: "KG",
      currentStock: 25,
      minimumStock: 10,
      costPerUnit: 22,
      trackingType: "MEASURABLE",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    {
      id: "ing-2",
      name: "Cebolla Blanca",
      unit: "KG",
      currentStock: 3,
      minimumStock: 5,
      costPerUnit: undefined,
      trackingType: "MEASURABLE",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
    {
      id: "ing-3",
      name: "Cilantro",
      unit: "PZA",
      currentStock: 0,
      minimumStock: 5,
      costPerUnit: 8,
      trackingType: "PIECE",
      createdAt: new Date("2026-01-01"),
      updatedAt: new Date("2026-01-01"),
    },
  ];

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should render summary metrics and ingredients table", () => {
    render(<InventarioTable initialIngredients={mockIngredients} />);

    // Check summary strip
    expect(screen.getByText("Total Ingredientes")).toBeInTheDocument();
    expect(screen.getAllByText("Stock Bajo").length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText("Agotados").length).toBeGreaterThanOrEqual(1);

    // Check items rendered
    expect(screen.getByText("Tortillas de Maíz")).toBeInTheDocument();
    expect(screen.getByText("Cebolla Blanca")).toBeInTheDocument();
    expect(screen.getByText("Cilantro")).toBeInTheDocument();

    // Check export button is present
    expect(
      screen.getByRole("button", { name: /Exportar/i }),
    ).toBeInTheDocument();
  });

  it("should auto-detect mobile width and start in cards view", () => {
    const originalInnerWidth = window.innerWidth;
    window.innerWidth = 500;

    render(<InventarioTable initialIngredients={mockIngredients} />);
    expect(screen.getByTestId("inventory-cards-grid")).toBeInTheDocument();

    window.innerWidth = originalInnerWidth;
  });

  it("should switch between table and cards view mode", async () => {
    const user = userEvent.setup();
    render(<InventarioTable initialIngredients={mockIngredients} />);

    // Default on desktop is table view
    expect(screen.getByRole("table")).toBeInTheDocument();

    // Click "Tarjetas" view mode button
    await user.click(screen.getByRole("button", { name: /Vista Tarjetas/i }));
    expect(screen.getByTestId("inventory-cards-grid")).toBeInTheDocument();
    expect(screen.queryByRole("table")).not.toBeInTheDocument();

    // Click "Tabla" view mode button
    await user.click(screen.getByRole("button", { name: /Vista Tabla/i }));
    expect(screen.getByRole("table")).toBeInTheDocument();
    expect(
      screen.queryByTestId("inventory-cards-grid"),
    ).not.toBeInTheDocument();
  });

  it("should filter ingredients by low stock and out of stock", async () => {
    const user = userEvent.setup();
    render(<InventarioTable initialIngredients={mockIngredients} />);

    // Click "Bajo Stock"
    await user.click(screen.getByRole("button", { name: /Bajo Stock/i }));
    expect(screen.getByText("Cebolla Blanca")).toBeInTheDocument();
    expect(screen.queryByText("Tortillas de Maíz")).not.toBeInTheDocument();

    // Click "Agotados"
    await user.click(screen.getByRole("button", { name: /Agotados/i }));
    expect(screen.getByText("Cilantro")).toBeInTheDocument();
    expect(screen.queryByText("Cebolla Blanca")).not.toBeInTheDocument();
  });

  it("should filter ingredients with search input and show empty message if no matches", async () => {
    const user = userEvent.setup();
    render(<InventarioTable initialIngredients={mockIngredients} />);

    const searchInput = screen.getByPlaceholderText(/Buscar ingrediente.../i);
    await user.type(searchInput, "Tortillas");

    expect(screen.getByText("Tortillas de Maíz")).toBeInTheDocument();
    expect(screen.queryByText("Cilantro")).not.toBeInTheDocument();

    // Search something nonexistent
    await user.clear(searchInput);
    await user.type(searchInput, "Inexistente 12345");
    expect(
      screen.getByText("No hay ingredientes que coincidan con el filtro."),
    ).toBeInTheDocument();

    // Clear search using clear button
    const clearBtn = screen.getByLabelText("Limpiar búsqueda");
    await user.click(clearBtn);
    expect(screen.getByText("Cilantro")).toBeInTheDocument();
  });

  it("should open action drawer from table and update stock on success", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, newStock: 30 }),
    } as Response);

    render(<InventarioTable initialIngredients={mockIngredients} />);

    // Click "Ajustar" on Tortillas de Maíz
    const adjustBtns = screen.getAllByRole("button", { name: /Ajustar/i });
    await user.click(adjustBtns[0]);

    // Drawer opens
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText("Control de Stock")).toBeInTheDocument();

    // Change value
    await user.click(screen.getByRole("button", { name: /Limpiar/i }));
    await user.click(screen.getByRole("button", { name: "3" }));
    await user.click(screen.getByRole("button", { name: "0" }));

    // Confirm
    await user.click(screen.getByRole("button", { name: /Confirmar Ajuste/i }));

    await waitFor(() => {
      expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
      expect(screen.getByText("30.00")).toBeInTheDocument();
    });
  });

  it("should open action drawer from cards view and trigger actions", async () => {
    const user = userEvent.setup();
    render(<InventarioTable initialIngredients={mockIngredients} />);

    // Switch to cards
    await user.click(screen.getByRole("button", { name: /Vista Tarjetas/i }));

    // Click Entrada on first card
    const entradaBtns = screen.getAllByRole("button", { name: /Entrada/i });
    await user.click(entradaBtns[0]);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Registrar Entrada/i }),
    ).toBeInTheDocument();

    // Close drawer
    await user.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Click Merma on first card
    const mermaBtns = screen.getAllByRole("button", { name: /Merma/i });
    await user.click(mermaBtns[0]);
    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(
      screen.getByRole("button", { name: /Registrar Merma/i }),
    ).toBeInTheDocument();
  });

  it("should trigger export with correct column accessors for all status types", async () => {
    const user = userEvent.setup();
    const exportCSVSpy = vi
      .spyOn(exportLib, "exportToCSV")
      .mockImplementation(() => {});

    render(<InventarioTable initialIngredients={mockIngredients} />);

    // Click Export -> CSV
    await user.click(screen.getByRole("button", { name: /Exportar/i }));
    await user.click(screen.getByText("CSV (.csv)"));

    expect(exportCSVSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        columns: expect.arrayContaining([
          expect.objectContaining({ header: "Ingrediente" }),
          expect.objectContaining({ header: "Costo Unitario" }),
          expect.objectContaining({ header: "Estado" }),
        ]),
      }),
    );

    // Call accessors directly to test formatting
    const callArg = exportCSVSpy.mock.calls[0][0];
    const costCol = callArg.columns.find((c) => c.header === "Costo Unitario");
    const estadoCol = callArg.columns.find((c) => c.header === "Estado");

    expect(costCol?.accessor?.(mockIngredients[0])).toBe("$22.00");
    expect(costCol?.accessor?.(mockIngredients[1])).toBe("N/A");

    expect(estadoCol?.accessor?.(mockIngredients[0])).toBe("Normal");
    expect(estadoCol?.accessor?.(mockIngredients[1])).toBe("Stock Bajo");
    expect(estadoCol?.accessor?.(mockIngredients[2])).toBe("Agotado");
  });
});
