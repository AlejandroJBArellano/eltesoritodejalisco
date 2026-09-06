import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CustomerAbonoModal } from "../CustomerAbonoModal";
import { PaymentMethod } from "@/types";

describe("CustomerAbonoModal Component", () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    customerId: "cust-1",
    customerName: "Juan Pérez",
    totalDebt: 500.0,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn();
  });

  it("returns null if not open", () => {
    const { container } = render(
      <CustomerAbonoModal {...defaultProps} isOpen={false} />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("renders modal with customer details and debt", () => {
    render(<CustomerAbonoModal {...defaultProps} />);

    expect(screen.getByText("Registrar Abono a Cuenta")).toBeInTheDocument();
    expect(screen.getByText(/Juan Pérez/i)).toBeInTheDocument();
    expect(screen.getByText(/Saldo actual: \$500\.00/i)).toBeInTheDocument();
  });

  it("pre-fills full debt when 'Liquidar Total' is clicked", () => {
    render(<CustomerAbonoModal {...defaultProps} />);

    const liquidarBtn = screen.getByText(/Liquidar Total/i);
    fireEvent.click(liquidarBtn);

    const input = screen.getByLabelText(/Monto del Abono/i) as HTMLInputElement;
    expect(input.value).toBe("500.00");
  });

  it("validates that amount cannot be 0 or negative", async () => {
    render(<CustomerAbonoModal {...defaultProps} />);

    const input = screen.getByLabelText(/Monto del Abono/i);
    fireEvent.change(input, { target: { value: "0" } });

    const form = input.closest("form")!;
    fireEvent.submit(form);

    expect(
      await screen.findByText(/El monto a abonar debe ser mayor a 0/i)
    ).toBeInTheDocument();
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it("validates that amount cannot exceed total debt", async () => {
    render(<CustomerAbonoModal {...defaultProps} />);

    const input = screen.getByLabelText(/Monto del Abono/i);
    fireEvent.change(input, { target: { value: "600" } });

    const form = input.closest("form")!;
    fireEvent.submit(form);

    expect(
      await screen.findByText(/El monto no puede ser mayor al saldo deudor/i)
    ).toBeInTheDocument();
  });

  it("switches payment methods and handles cash change calculation", () => {
    render(<CustomerAbonoModal {...defaultProps} />);

    const cardBtn = screen.getByRole("button", { name: /Tarjeta/i });
    fireEvent.click(cardBtn);

    // When card is selected, cash received input should be hidden
    expect(screen.queryByLabelText(/Efectivo Recibido/i)).not.toBeInTheDocument();

    const cashBtn = screen.getByRole("button", { name: /Efectivo/i });
    fireEvent.click(cashBtn);

    // Cash received is back
    const amountInput = screen.getByLabelText(/Monto del Abono/i);
    fireEvent.change(amountInput, { target: { value: "200" } });

    const receivedInput = screen.getByLabelText(/Efectivo Recibido/i);
    fireEvent.change(receivedInput, { target: { value: "500" } });

    expect(screen.getByText("$300.00")).toBeInTheDocument();
  });

  it("validates that cash received cannot be less than payment amount", async () => {
    render(<CustomerAbonoModal {...defaultProps} />);

    const amountInput = screen.getByLabelText(/Monto del Abono/i);
    fireEvent.change(amountInput, { target: { value: "200" } });

    const receivedInput = screen.getByLabelText(/Efectivo Recibido/i);
    fireEvent.change(receivedInput, { target: { value: "100" } });

    const form = amountInput.closest("form")!;
    fireEvent.submit(form);

    expect(
      await screen.findByText(/El monto recibido en efectivo no puede ser menor/i)
    ).toBeInTheDocument();
  });

  it("successfully submits abono and invokes onSuccess and onClose", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, appliedAmount: 200 }),
    });

    render(<CustomerAbonoModal {...defaultProps} />);

    const amountInput = screen.getByLabelText(/Monto del Abono/i);
    fireEvent.change(amountInput, { target: { value: "200" } });

    const receivedInput = screen.getByLabelText(/Efectivo Recibido/i);
    fireEvent.change(receivedInput, { target: { value: "200" } });

    const submitBtn = screen.getByRole("button", { name: /Abonar \$200\.00/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        "/api/customers/cust-1/account-statement",
        expect.objectContaining({
          method: "POST",
          body: JSON.stringify({
            amount: 200,
            method: PaymentMethod.CASH,
            receivedAmount: 200,
            change: 0,
          }),
        })
      );
      expect(defaultProps.onSuccess).toHaveBeenCalledWith(200);
      expect(defaultProps.onClose).toHaveBeenCalled();
    });
  });

  it("handles fetch error gracefully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Error en base de datos" }),
    });

    render(<CustomerAbonoModal {...defaultProps} />);

    const amountInput = screen.getByLabelText(/Monto del Abono/i);
    fireEvent.change(amountInput, { target: { value: "150" } });

    const receivedInput = screen.getByLabelText(/Efectivo Recibido/i);
    fireEvent.change(receivedInput, { target: { value: "200" } });

    const form = amountInput.closest("form")!;
    fireEvent.submit(form);

    expect(
      await screen.findByText("Error en base de datos")
    ).toBeInTheDocument();
    expect(defaultProps.onSuccess).not.toHaveBeenCalled();
  });

  it("calls onClose when cancel button is clicked", () => {
    render(<CustomerAbonoModal {...defaultProps} />);

    const cancelBtn = screen.getByRole("button", { name: /Cancelar/i });
    fireEvent.click(cancelBtn);

    expect(defaultProps.onClose).toHaveBeenCalled();
  });
});
