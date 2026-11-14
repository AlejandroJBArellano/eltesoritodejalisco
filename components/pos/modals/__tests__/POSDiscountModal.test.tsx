import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { POSDiscountModal } from "../POSDiscountModal";

/**
 * El modal se renderiza dentro del <form> del carrito del POS. Antes tenía su
 * propio <form> (anidado) y al aplicar se enviaba el formulario de forma nativa:
 * la página se recargaba y el carrito se perdía.
 */
describe("POSDiscountModal inside the POS cart form", () => {
  const renderInsideForm = () => {
    const outerSubmit = vi.fn((e: React.FormEvent) => e.preventDefault());
    const onApply = vi.fn();
    const onClose = vi.fn();
    const { container } = render(
      <form onSubmit={outerSubmit}>
        <POSDiscountModal
          isOpen
          onClose={onClose}
          title="Descuento: Tacos"
          isItem
          itemQuantity={1}
          onApply={onApply}
        />
      </form>,
    );
    return { outerSubmit, onApply, onClose, container };
  };

  it("does not nest a form inside the cart form", () => {
    const { container } = renderInsideForm();
    expect(container.querySelectorAll("form form")).toHaveLength(0);
  });

  it("applies the discount on click without submitting the cart form", () => {
    const { outerSubmit, onApply, onClose } = renderInsideForm();
    fireEvent.click(screen.getByRole("button", { name: "50%" }));
    fireEvent.click(screen.getByRole("button", { name: /Aplicar Descuento/i }));
    expect(onApply).toHaveBeenCalledWith(
      expect.objectContaining({ discountType: "PERCENT", discountValue: 50 }),
    );
    expect(onClose).toHaveBeenCalled();
    expect(outerSubmit).not.toHaveBeenCalled();
  });

  it("Enter inside an input applies the discount and does not submit the cart", () => {
    const { outerSubmit, onApply } = renderInsideForm();
    fireEvent.click(screen.getByRole("button", { name: "50%" }));
    const input = screen.getAllByRole("spinbutton")[0] ?? screen.getAllByRole("textbox")[0];
    fireEvent.keyDown(input, { key: "Enter" });
    expect(onApply).toHaveBeenCalled();
    expect(outerSubmit).not.toHaveBeenCalled();
  });
});
