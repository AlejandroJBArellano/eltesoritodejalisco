import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { IngredientTouchCard } from "../IngredientTouchCard";
import type { Ingredient } from "@/types";

describe("IngredientTouchCard Component", () => {
  const baseIngredient: Ingredient = {
    id: "ing-1",
    name: "Carne para Birria",
    unit: "KG",
    currentStock: 15.5,
    minimumStock: 5.0,
    costPerUnit: 120.0,
    trackingType: "MEASURABLE",
    createdAt: new Date("2026-01-01"),
    updatedAt: new Date("2026-01-01"),
  };

  it("should render normal stock status and ingredient details", () => {
    const handleAction = vi.fn();
    render(
      <IngredientTouchCard
        ingredient={baseIngredient}
        onAction={handleAction}
      />
    );

    expect(screen.getByText("Carne para Birria")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
    expect(screen.getByText("15.50")).toBeInTheDocument();
    expect(screen.getAllByText("KG").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("$120.00 / kg")).toBeInTheDocument();
    expect(screen.getByText(/Mínimo:/i)).toBeInTheDocument();
  });

  it("should render correctly when minimumStock is 0", () => {
    const zeroMinIng: Ingredient = {
      ...baseIngredient,
      id: "ing-zero-min",
      currentStock: 8.0,
      minimumStock: 0,
      costPerUnit: undefined,
    };

    render(
      <IngredientTouchCard
        ingredient={zeroMinIng}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText("8.00")).toBeInTheDocument();
    expect(screen.getByText("Normal")).toBeInTheDocument();
  });

  it("should render low stock badge when currentStock <= minimumStock", () => {
    const lowStockIng: Ingredient = {
      ...baseIngredient,
      id: "ing-low",
      currentStock: 4.0,
      minimumStock: 5.0,
    };

    render(
      <IngredientTouchCard
        ingredient={lowStockIng}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText("Stock Bajo")).toBeInTheDocument();
    expect(screen.getByText("4.00")).toBeInTheDocument();
  });

  it("should render out of stock badge when currentStock <= 0", () => {
    const outStockIng: Ingredient = {
      ...baseIngredient,
      id: "ing-out",
      currentStock: 0,
      minimumStock: 5.0,
      costPerUnit: undefined,
    };

    render(
      <IngredientTouchCard
        ingredient={outStockIng}
        onAction={vi.fn()}
      />
    );

    expect(screen.getByText("Agotado")).toBeInTheDocument();
    expect(screen.getByText("0.00")).toBeInTheDocument();
  });

  it("should trigger callbacks for + Entrada, - Merma, and Ajustar", async () => {
    const user = userEvent.setup();
    const handleAction = vi.fn();

    render(
      <IngredientTouchCard
        ingredient={baseIngredient}
        onAction={handleAction}
      />
    );

    // Click Entrada
    await user.click(screen.getByRole("button", { name: /Entrada/i }));
    expect(handleAction).toHaveBeenCalledWith("ENTRADA", baseIngredient);

    // Click Merma
    await user.click(screen.getByRole("button", { name: /Merma/i }));
    expect(handleAction).toHaveBeenCalledWith("MERMA", baseIngredient);

    // Click Ajustar
    await user.click(screen.getByRole("button", { name: /Ajustar/i }));
    expect(handleAction).toHaveBeenCalledWith("AJUSTE", baseIngredient);
  });
});
