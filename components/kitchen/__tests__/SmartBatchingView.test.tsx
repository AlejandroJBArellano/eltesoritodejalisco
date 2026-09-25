import React from "react";
import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { SmartBatchingView } from "../SmartBatchingView";
import { OrderStatus, type OrderWithDetails } from "@/types";

describe("SmartBatchingView Component", () => {
  it("renders empty state when no active orders exist", () => {
    render(<SmartBatchingView orders={[]} />);

    expect(
      screen.getByText("No hay órdenes activas en este momento"),
    ).toBeInTheDocument();
  });

  it("groups active items across pending and preparing orders while excluding ready items", () => {
    const orders: OrderWithDetails[] = [
      {
        id: "order-1",
        orderNumber: "001",
        source: "POS",
        status: OrderStatus.PREPARING,
        subtotal: 100,
        tax: 16,
        total: 116,
        createdAt: new Date(),
        updatedAt: new Date(),
        orderItems: [
          {
            id: "item-1",
            orderId: "order-1",
            menuItemId: "menu-1",
            quantity: 2,
            unitPrice: 50,
            status: OrderStatus.PENDING,
            menuItem: {
              id: "menu-1",
              name: "Hamburguesa Doble",
              price: 50,
              isAvailable: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            createdAt: new Date(),
          },
          {
            id: "item-2",
            orderId: "order-1",
            menuItemId: "menu-2",
            quantity: 1,
            unitPrice: 30,
            status: OrderStatus.READY, // already ready -> excluded
            menuItem: {
              id: "menu-2",
              name: "Papas Fritas",
              price: 30,
              isAvailable: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "order-2",
        orderNumber: "002",
        source: "PICKUP_APP",
        status: OrderStatus.PENDING,
        subtotal: 150,
        tax: 24,
        total: 174,
        createdAt: new Date(),
        updatedAt: new Date(),
        orderItems: [
          {
            id: "item-3",
            orderId: "order-2",
            menuItemId: "menu-1",
            quantity: 3,
            unitPrice: 50,
            status: OrderStatus.PENDING,
            menuItem: {
              id: "menu-1",
              name: "Hamburguesa Doble",
              price: 50,
              isAvailable: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            createdAt: new Date(),
          },
        ],
      },
      {
        id: "order-3",
        orderNumber: "003",
        source: "POS",
        status: OrderStatus.READY, // completed order -> excluded from prep batch
        subtotal: 50,
        tax: 8,
        total: 58,
        createdAt: new Date(),
        updatedAt: new Date(),
        orderItems: [
          {
            id: "item-4",
            orderId: "order-3",
            menuItemId: "menu-1",
            quantity: 4,
            unitPrice: 50,
            status: OrderStatus.READY,
            menuItem: {
              id: "menu-1",
              name: "Hamburguesa Doble",
              price: 50,
              isAvailable: true,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
            createdAt: new Date(),
          },
        ],
      },
    ];

    render(<SmartBatchingView orders={orders} />);

    // Total should be 2 + 3 = 5 (excluding order-3 and item-2)
    expect(screen.getByText("Hamburguesa Doble")).toBeInTheDocument();
    expect(screen.getByText("5")).toBeInTheDocument();
    // Papas Fritas was READY so it shouldn't show up in batching
    expect(screen.queryByText("Papas Fritas")).not.toBeInTheDocument();

    expect(screen.getByText("Orden #001")).toBeInTheDocument();
    expect(screen.getByText("Orden #002")).toBeInTheDocument();
    expect(screen.getByText("Presente en 2 órdenes")).toBeInTheDocument();
  });
});
