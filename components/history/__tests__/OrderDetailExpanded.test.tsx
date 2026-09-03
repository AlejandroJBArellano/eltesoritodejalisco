import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrderDetailExpanded } from "../OrderDetailExpanded";
import { OrderStatus, type OrderWithDetails } from "@/types";

const mockOrder: OrderWithDetails = {
  id: "ord-1",
  orderNumber: "1001",
  source: "POS",
  status: OrderStatus.PAID,
  table: "Mesa 1",
  notes: "Notas adicionales",
  subtotal: 100,
  tax: 16,
  total: 116,
  createdAt: new Date(),
  updatedAt: new Date(),
  customer: {
    id: "cust-1",
    name: "Alejandro",
    phone: "1234567890",
    loyaltyPoints: 10,
    totalSpend: 1500,
    createdAt: new Date(),
    updatedAt: new Date(),
  },
  orderItems: [
    {
      id: "item-1",
      orderId: "ord-1",
      menuItemId: "menu-1",
      quantity: 2,
      unitPrice: 50,
      notes: "Sin picante",
      createdAt: new Date(),
      menuItem: {
        id: "menu-1",
        name: "Tacos de Birria",
        price: 50,
        category: "Tacos",
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
  payments: [],
};

describe("OrderDetailExpanded Component", () => {
  it("renders order item details, customer name and notes", () => {
    render(<OrderDetailExpanded order={mockOrder} onBillOrder={vi.fn()} />);

    expect(screen.getByText("Detalle de la Orden #1001")).toBeDefined();
    expect(screen.getByText("Alejandro")).toBeDefined();
    expect(screen.getByText("Tacos de Birria")).toBeDefined();
    expect(screen.getByText("Notas: Sin picante")).toBeDefined();
    expect(screen.getByText("Notas adicionales")).toBeDefined();
    expect(screen.getByText("$100.00")).toBeDefined(); // subtotal
  });

  it("calls onBillOrder when Facturar button is clicked", () => {
    const onBillOrder = vi.fn();
    render(<OrderDetailExpanded order={mockOrder} onBillOrder={onBillOrder} />);

    const billBtn = screen.getByText("Facturar Orden");
    fireEvent.click(billBtn);
    expect(onBillOrder).toHaveBeenCalledWith(mockOrder);
  });
});
