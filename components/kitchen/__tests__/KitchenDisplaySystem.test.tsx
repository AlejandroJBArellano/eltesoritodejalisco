import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { KitchenDisplaySystem } from "../KitchenDisplaySystem";
import { OrderStatus, type OrderWithDetails } from "@/types";

// Mock useRealtimeOrders hook
const mockSetOrders = vi.fn();
vi.mock("@/hooks/useOrders", () => ({
  useRealtimeOrders: (initialOrders: OrderWithDetails[]) => ({
    orders: initialOrders,
    setOrders: mockSetOrders,
  }),
  useOrderTimer: () => 120,
}));

// Mock PushNotificationPrompt
vi.mock("@/components/notifications/PushNotificationPrompt", () => ({
  PushNotificationPrompt: () => <div data-testid="push-prompt" />,
}));

const mockOrder: OrderWithDetails = {
  id: "order-1",
  orderNumber: "101",
  source: "POS",
  status: OrderStatus.PREPARING,
  table: "Mesa 1",
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
      quantity: 1,
      unitPrice: 100,
      status: OrderStatus.PENDING,
      menuItem: {
        id: "menu-1",
        name: "Pizza Margherita",
        price: 100,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      createdAt: new Date(),
    },
  ],
};

describe("KitchenDisplaySystem Component", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders kanban columns with orders", () => {
    render(<KitchenDisplaySystem initialOrders={[mockOrder]} />);

    expect(screen.getByText("KDS — Sistema de Cocina")).toBeInTheDocument();
    expect(screen.getByText("Pendientes")).toBeInTheDocument();
    expect(screen.getByText("En Preparación")).toBeInTheDocument();
    expect(screen.getByText("Listos para Entregar")).toBeInTheDocument();
    expect(screen.getByText("#101")).toBeInTheDocument();
  });

  it("handles sound enablement button", () => {
    render(<KitchenDisplaySystem initialOrders={[mockOrder]} />);

    const soundBtn = screen.getByRole("button", { name: /activar sonidos/i });
    fireEvent.click(soundBtn);

    expect(screen.getByText(/sonidos activos/i)).toBeInTheDocument();
  });

  it("switches views between kanban and batching", () => {
    render(<KitchenDisplaySystem initialOrders={[mockOrder]} />);

    const batchingBtn = screen.getByRole("button", { name: /vista lotes/i });
    fireEvent.click(batchingBtn);

    expect(
      screen.getByText(/Resumen de Preparación en Lote/i),
    ).toBeInTheDocument();

    const kanbanBtn = screen.getByRole("button", { name: /vista kanban/i });
    fireEvent.click(kanbanBtn);

    expect(screen.getByText("Pendientes")).toBeInTheDocument();
  });

  it("filters orders by channel (POS / Pickup)", () => {
    const pickupOrder: OrderWithDetails = {
      ...mockOrder,
      id: "order-2",
      orderNumber: "102",
      source: "PICKUP_APP",
      table: "Para Llevar",
    };

    render(
      <KitchenDisplaySystem initialOrders={[mockOrder, pickupOrder]} />,
    );

    // Switch to POS filter
    const posFilter = screen.getByRole("button", { name: /en sala \/ pos/i });
    fireEvent.click(posFilter);

    expect(screen.getByText("#101")).toBeInTheDocument();
    expect(screen.queryByText("#102")).not.toBeInTheDocument();

    // Switch to Pickup filter
    const pickupFilter = screen.getByRole("button", {
      name: /kittn pickup/i,
    });
    fireEvent.click(pickupFilter);

    expect(screen.queryByText("#101")).not.toBeInTheDocument();
    expect(screen.getByText("#102")).toBeInTheDocument();
  });

  it("handles marking an item ready via API and updating state", async () => {
    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        item: {
          id: "item-1",
          status: OrderStatus.READY,
          preparationTimeSeconds: 45,
        },
        orderStatus: OrderStatus.PREPARING,
      }),
    } as Response);

    render(<KitchenDisplaySystem initialOrders={[mockOrder]} />);

    const readyBtn = screen.getByRole("button", { name: /listo/i });
    fireEvent.click(readyBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/orders/order-1/items/item-1/status",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: OrderStatus.READY }),
        }),
      );
    });

    expect(mockSetOrders).toHaveBeenCalled();
  });

  it("handles updating order status via API", async () => {
    const pendingOrder: OrderWithDetails = {
      ...mockOrder,
      status: OrderStatus.PENDING,
    };

    const fetchSpy = vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true }),
    } as Response);

    render(<KitchenDisplaySystem initialOrders={[pendingOrder]} />);

    const startBtn = screen.getByRole("button", {
      name: /comenzar preparación/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(fetchSpy).toHaveBeenCalledWith(
        "/api/orders/order-1/status",
        expect.objectContaining({
          method: "PATCH",
          body: JSON.stringify({ status: OrderStatus.PREPARING }),
        }),
      );
    });

    expect(mockSetOrders).toHaveBeenCalled();
  });

  it("filters orders by ALL channel tab", () => {
    const pickupOrder: OrderWithDetails = {
      ...mockOrder,
      id: "order-2",
      orderNumber: "102",
      source: "PICKUP_APP",
      table: "Para Llevar",
    };

    render(
      <KitchenDisplaySystem initialOrders={[mockOrder, pickupOrder]} />,
    );

    const allFilter = screen.getByRole("button", { name: /todas/i });
    fireEvent.click(allFilter);

    expect(screen.getByText("#101")).toBeInTheDocument();
    expect(screen.getByText("#102")).toBeInTheDocument();
  });

  it("handles scheduled orders release threshold", () => {
    const futureOrder: OrderWithDetails = {
      ...mockOrder,
      id: "order-future",
      orderNumber: "999",
      pickupTime: new Date(Date.now() + 60 * 60 * 1000), // 60 mins from now -> hidden
    };

    render(<KitchenDisplaySystem initialOrders={[futureOrder]} />);
    expect(screen.queryByText("#999")).not.toBeInTheDocument();
  });

  it("handles error when updating item status fails", async () => {
    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
    } as Response);

    render(<KitchenDisplaySystem initialOrders={[mockOrder]} />);

    const readyBtn = screen.getByRole("button", { name: /listo/i });
    fireEvent.click(readyBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Error al marcar platillo como listo/i),
      ).toBeInTheDocument();
    });
  });

  it("handles error when updating order status fails", async () => {
    const pendingOrder: OrderWithDetails = {
      ...mockOrder,
      status: OrderStatus.PENDING,
    };

    vi.spyOn(globalThis, "fetch").mockResolvedValueOnce({
      ok: false,
    } as Response);

    render(<KitchenDisplaySystem initialOrders={[pendingOrder]} />);

    const startBtn = screen.getByRole("button", {
      name: /comenzar preparación/i,
    });
    fireEvent.click(startBtn);

    await waitFor(() => {
      expect(
        screen.getByText(/Error al actualizar el estado de la orden/i),
      ).toBeInTheDocument();
    });
  });
});
