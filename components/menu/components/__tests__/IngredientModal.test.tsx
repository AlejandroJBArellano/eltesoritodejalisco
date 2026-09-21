import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { IngredientModal } from "../IngredientModal";
import { IngredientFormState } from "../../types";

const mockForm: IngredientFormState = {
  name: "Tomate",
  unit: "kg",
  trackingType: "MEASURABLE",
  currentStock: "10",
  minimumStock: "2",
  costPerUnit: "25",
};

describe("IngredientModal Component", () => {
  it("renders correctly when open and handles form changes", () => {
    const handleClose = vi.fn();
    const handleSubmit = vi.fn();
    const handleFormChange = vi.fn();

    render(
      <IngredientModal
        isOpen={true}
        onClose={handleClose}
        onSubmit={handleSubmit}
        ingredientForm={mockForm}
        ingredientErrors={{}}
        isSubmitting={false}
        onFormChange={handleFormChange}
      />
    );

    expect(screen.getByText("Nuevo Ingrediente / Insumo")).toBeInTheDocument();
    expect(screen.getByDisplayValue("Tomate")).toBeInTheDocument();

    const nameInput = screen.getByDisplayValue("Tomate");
    fireEvent.change(nameInput, { target: { value: "Cebolla" } });
    expect(handleFormChange).toHaveBeenCalledWith("name", "Cebolla");

    const submitBtn = screen.getByRole("button", { name: "Crear Ingrediente" });
    fireEvent.click(submitBtn);
    expect(handleSubmit).toHaveBeenCalled();
  });
});
