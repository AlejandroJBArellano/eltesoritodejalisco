import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SplitBillModal } from "../SplitBillModal";
import { useOptionalUser } from "@/components/UserProvider";
import { OrderStatus, type OrderWithDetails } from "@/types";

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
}));

const mockOrder: OrderWithDetails = {
  id: "order-123",
  orderNumber: "1050",
  source: "POS",
  status: OrderStatus.PENDING,
  table: "Mesa 4",
  notes: "",
  subtotal: 200,
  tax: 0,
  total: 200,
  createdAt: new Date(),
  updatedAt: new Date(),
  orderItems: [
    {
      id: "item-1",
      orderId: "order-123",
      menuItemId: "menu-1",
      quantity: 2,
      unitPrice: 100,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      menuItem: {
        id: "menu-1",
        name: "Taco Especial",
        price: 100,
        isAvailable: true,
        category: "TACOS",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
  payments: [],
};

describe("SplitBillModal Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "ADMIN",
      isAdmin: true,
      isWaiter: false,
      isChef: false,
      isAuthenticated: true,
    });
  });

  it("renders modal header, modes, and default parts", () => {
    render(
      <SplitBillModal
        order={mockOrder}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    expect(screen.getByText("Dividir Cuenta")).toBeInTheDocument();
    expect(screen.getByText("Total a dividir")).toBeInTheDocument();
    expect(screen.getByText("Partes Iguales")).toBeInTheDocument();
    expect(screen.getByText("Por Artículos")).toBeInTheDocument();
    expect(screen.getByText("Persona 1")).toBeInTheDocument();
    expect(screen.getByText("Persona 2")).toBeInTheDocument();
  });

  it("shows explicit tip amount and 'Total con propina' for Admin", () => {
    render(
      <SplitBillModal
        order={mockOrder}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // Click % tip for persona 1
    const percentButtons = screen.getAllByRole("button", { name: "%" });
    fireEvent.click(percentButtons[0]);

    // Click 10% preset
    const tenPercentButtons = screen.getAllByRole("button", { name: "10%" });
    fireEvent.click(tenPercentButtons[0]);

    // 10% of $100 is $10
    expect(screen.getByText("+$10.00")).toBeInTheDocument();
    expect(screen.getByText("Total con propina")).toBeInTheDocument();
    expect(screen.getByText("$110.00")).toBeInTheDocument();
  });

  it("hides explicit tip amount and shows 'Total a pagar' for Waiter", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    render(
      <SplitBillModal
        order={mockOrder}
        onConfirm={vi.fn()}
        onClose={vi.fn()}
      />,
    );

    // Click % tip for persona 1
    const percentButtons = screen.getAllByRole("button", { name: "%" });
    fireEvent.click(percentButtons[0]);

    // Click 10% preset
    const tenPercentButtons = screen.getAllByRole("button", { name: "10%" });
    fireEvent.click(tenPercentButtons[0]);

    // Waiter should NOT see +$10.00
    expect(screen.queryByText("+$10.00")).toBeNull();
    // Waiter should see "Total a pagar" instead of "Total con propina"
    expect(screen.queryByText("Total con propina")).toBeNull();
    expect(screen.getByText("Total a pagar")).toBeInTheDocument();
    // Still shows the combined total $110.00 to charge
    expect(screen.getByText("$110.00")).toBeInTheDocument();
  });

  it("calls onClose when close button is clicked", () => {
    const onClose = vi.fn();
    render(
      <SplitBillModal
        order={mockOrder}
        onConfirm={vi.fn()}
        onClose={onClose}
      />,
    );

    const closeBtn = screen.getByLabelText("Cerrar");
    fireEvent.click(closeBtn);
    expect(onClose).toHaveBeenCalled();
  });

  it("calls onConfirm with split payments when confirm button is clicked", () => {
    const onConfirm = vi.fn();
    render(
      <SplitBillModal
        order={mockOrder}
        onConfirm={onConfirm}
        onClose={vi.fn()}
      />,
    );

    // Switch both persons to Card payment to satisfy canConfirm
    const cardButtons = screen.getAllByRole("button", { name: "Tarjeta" });
    cardButtons.forEach((btn) => fireEvent.click(btn));

    const confirmBtn = screen.getByRole("button", {
      name: /REGISTRAR PAGOS/i,
    });
    expect(confirmBtn).not.toBeDisabled();
    fireEvent.click(confirmBtn);
    expect(onConfirm).toHaveBeenCalled();
  });
});
