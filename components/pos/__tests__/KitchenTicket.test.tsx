import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { KitchenTicket } from "../KitchenTicket";
import { OrderWithDetails, OrderStatus } from "@/types";

// Mock global Date to have a consistent printing time
const mockDate = new Date("2026-08-08T20:30:00Z");
vi.useFakeTimers();
vi.setSystemTime(mockDate);

const mockOrder: OrderWithDetails = {
  id: "order-1",
  orderNumber: "0025",
  source: "POS",
  status: OrderStatus.PENDING,
  table: "5",
  notes: "Entregar caliente",
  subtotal: 100,
  tax: 16,
  total: 116,
  createdAt: new Date("2026-08-08T20:00:00Z"),
  updatedAt: new Date("2026-08-08T20:00:00Z"),
  pickupTime: null,
  orderItems: [
    {
      id: "item-1",
      orderId: "order-1",
      menuItemId: "menu-1",
      quantity: 2,
      unitPrice: 50,
      notes: "Sin cebolla",
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      menuItem: {
        id: "menu-1",
        name: "Taco de Pastor",
        price: 50,
        isAvailable: true,
        category: "TACOS",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
};

const mockMixedOrder: OrderWithDetails = {
  ...mockOrder,
  id: "order-2",
  orderNumber: "0026",
  pickupTime: new Date("2026-08-08T21:00:00Z"),
  orderItems: [
    {
      id: "item-2",
      orderId: "order-2",
      menuItemId: "menu-2",
      quantity: 1,
      unitPrice: 80,
      notes: "Pastor, Asada, Pollo",
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      menuItem: {
        id: "menu-2",
        name: "Orden Mixta de Tacos",
        price: 80,
        isAvailable: true,
        category: "TACOS",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
};

describe("KitchenTicket Component", () => {
  it("should render order header information correctly", () => {
    render(<KitchenTicket order={mockOrder} />);

    expect(screen.getByText("*** COMANDA ***")).toBeInTheDocument();
    expect(screen.getByText("#0025")).toBeInTheDocument();
    expect(screen.getByText("MESA 5")).toBeInTheDocument();
    expect(screen.getByText("POS")).toBeInTheDocument();
  });

  it("should render order items with quantities and special notes", () => {
    render(<KitchenTicket order={mockOrder} />);

    expect(screen.getByText("2")).toBeInTheDocument();
    expect(screen.getByText(/Taco de Pastor/i)).toBeInTheDocument();
    expect(screen.getByText(/OJO: Sin cebolla/i)).toBeInTheDocument();
  });

  it("should format dates and print times properly", () => {
    render(<KitchenTicket order={mockOrder} />);

    // Since we mocked time to 20:30 UTC, we check that it is displayed correctly
    const printTimeStr = mockDate.toLocaleTimeString("es-MX", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    expect(screen.getByText(printTimeStr)).toBeInTheDocument();
  });

  it("should render flavor lines and pickup time for programed mixed orders", () => {
    render(<KitchenTicket order={mockMixedOrder} />);

    expect(screen.getByText("#0026")).toBeInTheDocument();
    expect(screen.getByText("ENTREGA:")).toBeInTheDocument();
    
    // Check that flavor lines are split and displayed
    expect(screen.getByText(/▪\s*Pastor/i)).toBeInTheDocument();
    expect(screen.getByText(/▪\s*Asada/i)).toBeInTheDocument();
    expect(screen.getByText(/▪\s*Pollo/i)).toBeInTheDocument();
  });

  it("should render general order notes", () => {
    render(<KitchenTicket order={mockOrder} />);

    expect(screen.getByText("NOTAS GENERALES:")).toBeInTheDocument();
    expect(screen.getByText(/Entregar caliente/i)).toBeInTheDocument();
  });
});
