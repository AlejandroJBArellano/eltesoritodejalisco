import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { InventoryAlertBanner } from "../InventoryAlertBanner";
import type { LowStockIngredient } from "../types";

const mockAlerts: LowStockIngredient[] = [
  {
    id: "ing-1",
    name: "Carne de Res",
    current_stock: 0,
    minimum_stock: 5,
    unit: "kg",
  },
  {
    id: "ing-2",
    name: "Cebolla Morada",
    current_stock: 2,
    minimum_stock: 4,
    unit: "kg",
  },
];

describe("InventoryAlertBanner Component", () => {
  it("renders null when alerts list is empty", () => {
    const { container } = render(<InventoryAlertBanner alerts={[]} />);
    expect(container.firstChild).toBeNull();
  });

  it("renders alert banner with out-of-stock and low-stock indicators and items", () => {
    render(<InventoryAlertBanner alerts={mockAlerts} />);

    expect(screen.getByText("Alerta de Inventario")).toBeInTheDocument();
    expect(
      screen.getByText("1 agotado(s) · 1 bajo mínimo"),
    ).toBeInTheDocument();

    const link = screen.getByRole("link", { name: /ver inventario/i });
    expect(link).toHaveAttribute("href", "/inventario");

    expect(screen.getByText("Carne de Res")).toBeInTheDocument();
    expect(screen.getByText("Cebolla Morada")).toBeInTheDocument();
    expect(screen.getByText("/ 5 mín")).toBeInTheDocument();
    expect(screen.getByText("/ 4 mín")).toBeInTheDocument();
  });
});
