import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { POSDiscountModal } from "../modals/POSDiscountModal";

const mockUseOptionalUser = vi.fn();
vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: () => mockUseOptionalUser(),
}));

describe("POSDiscountModal", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseOptionalUser.mockReturnValue({ isWaiter: false });
    // Default fetch mock
    global.fetch = vi.fn();
  });

  it("does not render when isOpen is false", () => {
    render(
      <POSDiscountModal
        isOpen={false}
        onClose={vi.fn()}
        title="Descuento"
        onApply={vi.fn()}
      />,
    );
    expect(screen.queryByText("Descuento")).not.toBeInTheDocument();
  });

  it("renders when isOpen is true and applies percentage discount with preset", async () => {
    const handleApply = vi.fn();
    const handleClose = vi.fn();

    render(
      <POSDiscountModal
        isOpen={true}
        onClose={handleClose}
        title="Descuento en Orden"
        onApply={handleApply}
      />,
    );

    expect(screen.getByText("Descuento en Orden")).toBeInTheDocument();

    // Click 20% preset
    const preset20 = screen.getByRole("button", { name: "20%" });
    fireEvent.click(preset20);

    // Select 'Empleado' reason
    const empleadoBtn = screen.getByRole("button", { name: "Empleado" });
    fireEvent.click(empleadoBtn);

    // Click Aplicar Descuento
    const applyBtn = screen.getByRole("button", { name: /aplicar descuento/i });
    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith({
      discountType: "PERCENT",
      discountValue: 20,
      discountScope: "ROW",
      discountReason: "Empleado",
    });
    expect(handleClose).toHaveBeenCalled();
  });

  it("handles fixed discount on item with quantity > 1 and UNIT scope", async () => {
    const handleApply = vi.fn();

    render(
      <POSDiscountModal
        isOpen={true}
        onClose={vi.fn()}
        title="Descuento Cerveza"
        isItem={true}
        itemQuantity={3}
        onApply={handleApply}
      />,
    );

    // Switch to FIXED
    const fixedBtn = screen.getByRole("radio", { name: /monto fijo/i });
    fireEvent.click(fixedBtn);

    // Enter value
    const input = screen.getByPlaceholderText("Ej. 50.00");
    fireEvent.change(input, { target: { value: "10" } });

    // Select Por Unidad
    const unitBtn = screen.getByRole("button", { name: /por unidad/i });
    fireEvent.click(unitBtn);

    // Apply
    const applyBtn = screen.getByRole("button", { name: /aplicar descuento/i });
    fireEvent.click(applyBtn);

    expect(handleApply).toHaveBeenCalledWith({
      discountType: "FIXED",
      discountValue: 10,
      discountScope: "UNIT",
      discountReason: null,
    });
  });

  it("requires manager PIN when user is a waiter", async () => {
    mockUseOptionalUser.mockReturnValue({ isWaiter: true });
    const handleApply = vi.fn();

    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    render(
      <POSDiscountModal
        isOpen={true}
        onClose={vi.fn()}
        title="Descuento Mesero"
        onApply={handleApply}
      />,
    );

    expect(
      screen.getByText("Autorización de Gerencia Requerida"),
    ).toBeInTheDocument();

    // Select 15%
    fireEvent.click(screen.getByRole("button", { name: "15%" }));

    // Try applying without PIN
    const applyBtn = screen.getByRole("button", { name: /aplicar descuento/i });
    fireEvent.click(applyBtn);

    expect(
      screen.getByText("Ingresa el PIN de gerencia"),
    ).toBeInTheDocument();
    expect(handleApply).not.toHaveBeenCalled();

    // Enter PIN
    const pinInput = screen.getByPlaceholderText("PIN de 4 dígitos");
    fireEvent.change(pinInput, { target: { value: "1234" } });

    fireEvent.click(applyBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith("/api/auth/verify-pin", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ pin: "1234" }),
      });
      expect(handleApply).toHaveBeenCalledWith({
        discountType: "PERCENT",
        discountValue: 15,
        discountScope: "ROW",
        discountReason: null,
      });
    });
  });

  it("allows removing discount when initialDiscount exists", () => {
    const handleRemove = vi.fn();
    render(
      <POSDiscountModal
        isOpen={true}
        onClose={vi.fn()}
        title="Editar Descuento"
        initialDiscount={{
          discountType: "PERCENT",
          discountValue: 10,
          discountReason: "Promoción",
        }}
        onApply={vi.fn()}
        onRemove={handleRemove}
      />,
    );

    const removeBtn = screen.getByRole("button", { name: /quitar descuento/i });
    fireEvent.click(removeBtn);

    expect(handleRemove).toHaveBeenCalled();
  });
});
