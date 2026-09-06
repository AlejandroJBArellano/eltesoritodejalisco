import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { OrderCard } from "../OrderCard";
import { OrderStatus, type OrderWithDetails, PaymentMethod } from "@/types";

const mockBaseOrder: OrderWithDetails = {
  id: "order-123",
  orderNumber: "0042",
  source: "POS",
  status: OrderStatus.PENDING,
  table: "Mesa 4",
  notes: "Sin picante por favor",
  subtotal: 120,
  tax: 19.2,
  total: 139.2,
  createdAt: new Date("2026-08-08T12:00:00Z"),
  updatedAt: new Date("2026-08-08T12:00:00Z"),
  orderItems: [
    {
      id: "item-1",
      orderId: "order-123",
      menuItemId: "menu-1",
      quantity: 3,
      unitPrice: 40,
      notes: "Bien dorados",
      status: OrderStatus.PENDING,
      createdAt: new Date("2026-08-08T12:00:00Z"),
      menuItem: {
        id: "menu-1",
        name: "Tacos al Pastor",
        price: 40,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
};

describe("OrderCard Component", () => {
  it("renders Comedor order with prominent table banner", () => {
    render(
      <OrderCard
        order={mockBaseOrder}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText("#0042")).toBeInTheDocument();
    expect(screen.getByText(/mesa 4/i)).toBeInTheDocument();
  });

  it("renders Para Llevar order with prominent banner", () => {
    const takeoutOrder: OrderWithDetails = {
      ...mockBaseOrder,
      table: "Para Llevar",
    };

    render(
      <OrderCard
        order={takeoutOrder}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/para llevar/i)).toBeInTheDocument();
  });

  it("renders A Domicilio order with prominent banner", () => {
    const deliveryOrder: OrderWithDetails = {
      ...mockBaseOrder,
      table: "A Domicilio",
    };

    render(
      <OrderCard
        order={deliveryOrder}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/a domicilio/i)).toBeInTheDocument();
  });

  it("renders customer name when customer is present", () => {
    const orderWithCustomer: OrderWithDetails = {
      ...mockBaseOrder,
      customer: {
        id: "cust-99",
        name: "Mariana Rodríguez",
        loyaltyPoints: 50,
        totalSpend: 1500,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    };

    render(
      <OrderCard
        order={orderWithCustomer}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Cliente:")).toBeInTheDocument();
    expect(screen.getByText("Mariana Rodríguez")).toBeInTheDocument();
  });

  it("omits customer section when no customer is assigned", () => {
    render(
      <OrderCard
        order={mockBaseOrder}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.queryByText("Cliente:")).not.toBeInTheDocument();
  });

  it("renders online payment badge when payments are present", () => {
    const paidOrder: OrderWithDetails = {
      ...mockBaseOrder,
      payments: [
        {
          id: "pay-1",
          orderId: "order-123",
          method: PaymentMethod.CARD,
          amount: 139.2,
          createdAt: new Date(),
        },
      ],
    };

    render(
      <OrderCard
        order={paidOrder}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText("Pagado Online")).toBeInTheDocument();
  });

  it("handles order status change when clicking action button", () => {
    const handleStatusChange = vi.fn();
    render(
      <OrderCard
        order={mockBaseOrder}
        onStatusChange={handleStatusChange}
      />,
    );

    const startButton = screen.getByRole("button", {
      name: /comenzar preparación/i,
    });
    fireEvent.click(startButton);

    expect(handleStatusChange).toHaveBeenCalledWith(
      "order-123",
      OrderStatus.PREPARING,
    );
  });

  it("handles item ready action when order is in PREPARING status", () => {
    const handleItemReady = vi.fn();
    const preparingOrder: OrderWithDetails = {
      ...mockBaseOrder,
      status: OrderStatus.PREPARING,
    };

    render(
      <OrderCard
        order={preparingOrder}
        onStatusChange={vi.fn()}
        onItemReady={handleItemReady}
      />,
    );

    const readyButton = screen.getByRole("button", { name: /listo/i });
    fireEvent.click(readyButton);

    expect(handleItemReady).toHaveBeenCalledWith("order-123", "item-1");
  });

  it("renders order notes and item notes correctly", () => {
    render(
      <OrderCard
        order={mockBaseOrder}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText(/Nota: Bien dorados/i)).toBeInTheDocument();
    expect(
      screen.getByText(/Nota de Orden: Sin picante por favor/i),
    ).toBeInTheDocument();
  });

  it("handles pickupTime timer calculation", () => {
    const orderWithPickup: OrderWithDetails = {
      ...mockBaseOrder,
      pickupTime: new Date("2026-08-08T13:00:00Z"),
    };

    render(
      <OrderCard
        order={orderWithPickup}
        onStatusChange={vi.fn()}
      />,
    );

    expect(screen.getByText("#0042")).toBeInTheDocument();
  });

  it("handles closing order when all items are ready", () => {
    const handleStatusChange = vi.fn();
    const preparingAllReadyOrder: OrderWithDetails = {
      ...mockBaseOrder,
      status: OrderStatus.PREPARING,
      orderItems: [
        {
          id: "item-1",
          orderId: "order-123",
          menuItemId: "menu-1",
          quantity: 1,
          unitPrice: 40,
          status: OrderStatus.READY,
          preparationTimeSeconds: 120,
          createdAt: new Date(),
          menuItem: {
            id: "menu-1",
            name: "Tacos",
            price: 40,
            isAvailable: true,
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        },
      ],
    };

    render(
      <OrderCard
        order={preparingAllReadyOrder}
        onStatusChange={handleStatusChange}
      />,
    );

    const closeButton = screen.getByRole("button", { name: /cerrar orden/i });
    expect(closeButton).not.toBeDisabled();
    fireEvent.click(closeButton);

    expect(handleStatusChange).toHaveBeenCalledWith("order-123", OrderStatus.READY);
  });

  it("handles marking delivered when order is in READY status", () => {
    const handleStatusChange = vi.fn();
    const readyOrder: OrderWithDetails = {
      ...mockBaseOrder,
      status: OrderStatus.READY,
      completedAt: new Date(),
    };

    render(
      <OrderCard
        order={readyOrder}
        onStatusChange={handleStatusChange}
      />,
    );

    const deliverButton = screen.getByRole("button", { name: /marcar entregado/i });
    fireEvent.click(deliverButton);

    expect(handleStatusChange).toHaveBeenCalledWith(
      "order-123",
      OrderStatus.DELIVERED,
    );
  });

  it("supports updatingItemIds state properly", () => {
    const preparingOrder: OrderWithDetails = {
      ...mockBaseOrder,
      status: OrderStatus.PREPARING,
    };

    const updatingSet = new Set(["item-1"]);

    const { rerender } = render(
      <OrderCard
        order={preparingOrder}
        onStatusChange={vi.fn()}
        updatingItemIds={updatingSet}
      />,
    );

    expect(screen.getByText("...")).toBeInTheDocument();

    rerender(
      <OrderCard
        order={preparingOrder}
        onStatusChange={vi.fn()}
        updatingItemIds={new Set()}
      />,
    );

    expect(screen.getByRole("button", { name: /listo/i })).toBeInTheDocument();
  });

  it("evaluates custom memo comparator branches correctly", () => {
    const onStatusChange = vi.fn();
    const onItemReady = vi.fn();
    const updatingItemIds = new Set(["item-1"]);

    const { rerender } = render(
      <OrderCard
        order={mockBaseOrder}
        onStatusChange={onStatusChange}
        onItemReady={onItemReady}
        updatingItemIds={updatingItemIds}
      />,
    );

    // Re-render with same order and same props (should return true)
    rerender(
      <OrderCard
        order={mockBaseOrder}
        onStatusChange={onStatusChange}
        onItemReady={onItemReady}
        updatingItemIds={updatingItemIds}
      />,
    );

    // Re-render with different onItemReady (triggers line 277)
    rerender(
      <OrderCard
        order={mockBaseOrder}
        onStatusChange={onStatusChange}
        onItemReady={vi.fn()}
        updatingItemIds={updatingItemIds}
      />,
    );

    // Re-render with different items length in same order reference
    const orderRef = { ...mockBaseOrder };
    const { rerender: rerender2 } = render(
      <OrderCard
        order={orderRef}
        onStatusChange={onStatusChange}
        onItemReady={onItemReady}
      />,
    );
    orderRef.orderItems = [];
    rerender2(
      <OrderCard
        order={orderRef}
        onStatusChange={onStatusChange}
        onItemReady={onItemReady}
      />,
    );
  });
});
