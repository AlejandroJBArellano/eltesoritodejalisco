import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { InventoryActionDrawer } from "../InventoryActionDrawer";
import type { Ingredient } from "@/types";

describe("InventoryActionDrawer Component", () => {
  const mockIngredient: Ingredient = {
    id: "ing-123",
    name: "Cebolla Morada",
    unit: "KG",
    currentStock: 10,
    minimumStock: 3,
    trackingType: "MEASURABLE",
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("should not render when isOpen is false or ingredient is null", () => {
    const { rerender } = render(
      <InventoryActionDrawer
        isOpen={false}
        ingredient={mockIngredient}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    rerender(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={null}
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  });

  it("should switch between action tabs (Entrada, Merma, Ajustar)", () => {
    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient}
        initialAction="ENTRADA"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Click Merma mode
    fireEvent.click(screen.getByRole("button", { name: "Merma" }));
    expect(screen.getByText("Motivo de la merma")).toBeInTheDocument();

    // Click suggestion chips
    fireEvent.click(screen.getByRole("button", { name: "Caducado" }));
    const reasonInput = screen.getByPlaceholderText(/Ej. Se cayó al servir/i) as HTMLInputElement;
    expect(reasonInput.value).toBe("Caducado");

    // Click Ajustar mode
    fireEvent.click(screen.getByRole("button", { name: "Ajustar" }));
    expect(screen.getByTestId("keypad-display")).toHaveTextContent("10");

    // Click Entrada mode
    fireEvent.click(screen.getByRole("button", { name: "Entrada" }));
    expect(screen.getByTestId("keypad-display")).toHaveTextContent("0");
  });

  it("should enter numbers using touch keypad and handle backspace and clear", async () => {
    const user = userEvent.setup();
    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient}
        initialAction="ENTRADA"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const display = screen.getByTestId("keypad-display");
    expect(display).toHaveTextContent("0");

    // Click 5
    await user.click(screen.getByRole("button", { name: "5" }));
    expect(display).toHaveTextContent("5");

    // Click . and 2 and 5
    await user.click(screen.getByRole("button", { name: "." }));
    await user.click(screen.getByRole("button", { name: "2" }));
    await user.click(screen.getByRole("button", { name: "5" }));
    expect(display).toHaveTextContent("5.25");

    // Click . again (should ignore duplicate)
    await user.click(screen.getByRole("button", { name: "." }));
    expect(display).toHaveTextContent("5.25");

    // Click 9 (should ignore more than 2 decimals)
    await user.click(screen.getByRole("button", { name: "9" }));
    expect(display).toHaveTextContent("5.25");

    // Backspace
    await user.click(screen.getByRole("button", { name: /Borrar último dígito/i }));
    expect(display).toHaveTextContent("5.2");

    // Clear
    await user.click(screen.getByRole("button", { name: /Limpiar/i }));
    expect(display).toHaveTextContent("0");
  });

  it("should handle quick increment presets (+1, +5, +10) with decimals", async () => {
    const user = userEvent.setup();
    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient}
        initialAction="ENTRADA"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    const display = screen.getByTestId("keypad-display");
    expect(display).toHaveTextContent("0");

    // Add .5 first
    await user.click(screen.getByRole("button", { name: "." }));
    await user.click(screen.getByRole("button", { name: "5" }));
    expect(display).toHaveTextContent("0.5");

    // Click +5 -> 5.50
    await user.click(screen.getByRole("button", { name: "+5 KG" }));
    expect(display).toHaveTextContent("5.50");

    // Click +10 -> 15.50
    await user.click(screen.getByRole("button", { name: "+10 KG" }));
    expect(display).toHaveTextContent("15.50");

    // Click +1 -> 16.50
    await user.click(screen.getByRole("button", { name: "+1 KG" }));
    expect(display).toHaveTextContent("16.50");
  });

  it("should show validation error when submitting 0 on ENTRADA or MERMA", async () => {
    const user = userEvent.setup();
    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient}
        initialAction="ENTRADA"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Click submit with 0
    await user.click(screen.getByRole("button", { name: /Registrar Entrada/i }));
    expect(
      screen.getByText(/Ingresa una cantidad válida mayor a 0 para la entrada/i)
    ).toBeInTheDocument();

    // Switch to MERMA
    await user.click(screen.getByRole("button", { name: "Merma" }));
    await user.click(screen.getByRole("button", { name: /Registrar Merma/i }));
    expect(
      screen.getByText(/Ingresa una cantidad válida mayor a 0 para la merma/i)
    ).toBeInTheDocument();
  });

  it("should calculate projected stock for ENTRADA and submit successfully", async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, newStock: 14.5 }),
    } as Response);

    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient}
        initialAction="ENTRADA"
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    // Type 4.5
    await user.click(screen.getByRole("button", { name: "4" }));
    await user.click(screen.getByRole("button", { name: "." }));
    await user.click(screen.getByRole("button", { name: "5" }));

    // Projected new stock: 10 + 4.5 = 14.50
    expect(screen.getByText("14.50")).toBeInTheDocument();
    expect(screen.getByText("+4.50")).toBeInTheDocument();

    // Submit
    await user.click(screen.getByRole("button", { name: /Registrar Entrada/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/inventory/adjust", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: "ing-123",
          adjustment: 4.5,
          reason: "Compra",
        }),
      });
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ing-123",
          currentStock: 14.5,
        })
      );
      expect(handleClose).toHaveBeenCalled();
    });
  });

  it("should require reason and calculate negative adjustment for MERMA with manual typing", async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();
    const handleClose = vi.fn();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient}
        initialAction="MERMA"
        onClose={handleClose}
        onSuccess={handleSuccess}
      />
    );

    // Type 3
    await user.click(screen.getByRole("button", { name: "3" }));

    // Projected stock: 10 - 3 = 7.00
    expect(screen.getByText("7.00")).toBeInTheDocument();
    expect(screen.getByText("-3.00")).toBeInTheDocument();

    // Try submit without reason -> should show error
    await user.click(screen.getByRole("button", { name: /Registrar Merma/i }));
    expect(screen.getByText(/Especifica el motivo de la merma/i)).toBeInTheDocument();

    // Type reason manually in input
    const reasonInput = screen.getByPlaceholderText(/Ej. Se cayó al servir/i);
    await user.type(reasonInput, "Tomate con hongos");

    // Submit
    await user.click(screen.getByRole("button", { name: /Registrar Merma/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/inventory/adjust", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: "ing-123",
          adjustment: -3,
          reason: "Tomate con hongos",
        }),
      });
      expect(handleSuccess).toHaveBeenCalledWith(
        expect.objectContaining({
          id: "ing-123",
          currentStock: 7,
        })
      );
    });
  });

  it("should show warning when projected stock is negative", async () => {
    const user = userEvent.setup();
    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient} // currentStock: 10
        initialAction="MERMA"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    // Type 15
    await user.click(screen.getByRole("button", { name: "1" }));
    await user.click(screen.getByRole("button", { name: "5" }));

    expect(
      screen.getByText(/Alerta: El ajuste resultará en stock negativo/i)
    ).toBeInTheDocument();
  });

  it("should handle AJUSTE mode and calculate difference from counted stock", async () => {
    const user = userEvent.setup();
    const handleSuccess = vi.fn();

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true, newStock: 12 }),
    } as Response);

    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient} // currentStock: 10
        initialAction="AJUSTE"
        onClose={vi.fn()}
        onSuccess={handleSuccess}
      />
    );

    // Initial counted stock is currentStock (10)
    expect(screen.getByTestId("keypad-display")).toHaveTextContent("10");

    // Try submit without changing -> error same stock
    await user.click(screen.getByRole("button", { name: /Confirmar Ajuste/i }));
    expect(screen.getByText(/El nuevo stock es idéntico al actual/i)).toBeInTheDocument();

    // Change to 12
    await user.click(screen.getByRole("button", { name: /Limpiar/i }));
    await user.click(screen.getByRole("button", { name: "1" }));
    await user.click(screen.getByRole("button", { name: "2" }));

    // Submit adjustment
    await user.click(screen.getByRole("button", { name: /Confirmar Ajuste/i }));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/inventory/adjust", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId: "ing-123",
          adjustment: 2,
          reason: "Corrección de inventario",
        }),
      });
    });
  });

  it("should handle default error message when API returns failure without explicit error string", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockResolvedValue({
      ok: false,
      json: async () => ({}),
    } as Response);

    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient}
        initialAction="ENTRADA"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: /Registrar Entrada/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Error al actualizar stock")
      ).toBeInTheDocument();
    });
  });

  it("should handle network catch error during adjustment submission", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockRejectedValue(new Error("Fallo de red"));

    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient}
        initialAction="ENTRADA"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: /Registrar Entrada/i }));

    await waitFor(() => {
      expect(screen.getByText("Fallo de red")).toBeInTheDocument();
    });
  });

  it("should handle unexpected non-Error rejection during adjustment submission", async () => {
    const user = userEvent.setup();

    global.fetch = vi.fn().mockRejectedValue("Error en string");

    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient}
        initialAction="ENTRADA"
        onClose={vi.fn()}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: "5" }));
    await user.click(screen.getByRole("button", { name: /Registrar Entrada/i }));

    await waitFor(() => {
      expect(
        screen.getByText("Error desconocido al procesar ajuste")
      ).toBeInTheDocument();
    });
  });

  it("should trigger onClose when clicking close icon or Cancel button", async () => {
    const user = userEvent.setup();
    const handleClose = vi.fn();

    render(
      <InventoryActionDrawer
        isOpen={true}
        ingredient={mockIngredient}
        onClose={handleClose}
        onSuccess={vi.fn()}
      />
    );

    await user.click(screen.getByRole("button", { name: /Cancelar/i }));
    expect(handleClose).toHaveBeenCalledTimes(1);

    await user.click(screen.getByLabelText("Cerrar modal"));
    expect(handleClose).toHaveBeenCalledTimes(2);
  });
});
