import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
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
      costPerUnit: 18,
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
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument();
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

  it("should filter ingredients with search input", async () => {
    const user = userEvent.setup();
    render(<InventarioTable initialIngredients={mockIngredients} />);

    const searchInput = screen.getByPlaceholderText(/Buscar ingrediente.../i);
    await user.type(searchInput, "Tortillas");

    expect(screen.getByText("Tortillas de Maíz")).toBeInTheDocument();
    expect(screen.queryByText("Cilantro")).not.toBeInTheDocument();

    // Clear search
    const clearBtn = screen.getByRole("button", { name: "" });
    await user.click(clearBtn);
    expect(screen.getByText("Cilantro")).toBeInTheDocument();
  });

  it("should trigger export with filtered items", async () => {
    const user = userEvent.setup();
    const exportCSVSpy = vi.spyOn(exportLib, "exportToCSV").mockImplementation(() => {});

    render(<InventarioTable initialIngredients={mockIngredients} />);

    // Filter by low stock
    await user.click(screen.getByRole("button", { name: /Bajo Stock/i }));

    // Click Export -> CSV
    await user.click(screen.getByRole("button", { name: /Exportar/i }));
    await user.click(screen.getByText("CSV (.csv)"));

    expect(exportCSVSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.arrayContaining([expect.objectContaining({ name: "Cebolla Blanca" })]),
      }),
    );
  });
});
