import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OrdersPOS from "../OrdersPOS";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { OrderStatus, type OrderWithDetails } from "@/types";

vi.mock("@/hooks/pos/usePOSData", () => ({
  usePOSData: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCart", () => ({
  usePOSCart: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCheckout", () => ({
  usePOSCheckout: vi.fn(),
}));

const mockOrders: OrderWithDetails[] = [
  {
    id: "ord-1",
    orderNumber: "101",
    source: "POS",
    status: OrderStatus.PENDING,
    table: "Mesa 1",
    notes: "",
    subtotal: 100,
    tax: 0,
    total: 100,
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItems: [],
    payments: [],
  },
  {
    id: "ord-2",
    orderNumber: "102",
    source: "PICKUP_APP",
    status: OrderStatus.PAID,
    table: "Para Llevar",
    notes: "Cliente: Juan",
    subtotal: 250,
    tax: 0,
    total: 250,
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItems: [],
    payments: [],
  },
];

describe("OrdersPOS component", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    (usePOSData as any).mockReturnValue({
      refreshOrders: vi.fn(),
      availableMenuItems: [],
      orders: mockOrders,
    });

    (usePOSCart as any).mockReturnValue({
      isSubmittingCart: false,
      setEditingOrder: vi.fn(),
      openModifyModal: vi.fn(),
    });

    (usePOSCheckout as any).mockReturnValue({
      isSubmittingCheckout: false,
      setCheckoutOrder: vi.fn(),
      setPaymentMethod: vi.fn(),
      setReceivedAmount: vi.fn(),
      setShowTicket: vi.fn(),
      setShowKitchenTicket: vi.fn(),
      setTipType: vi.fn(),
      setTipInput: vi.fn(),
      setEditingTipOrder: vi.fn(),
      setEditTipType: vi.fn(),
      setEditTipInput: vi.fn(),
      setBillingOrder: vi.fn(),
      handleUndoPayment: vi.fn(),
    });
  });

  it("renders filter buttons with order counts and shows all orders by default", () => {
    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    expect(screen.getByText(/Todas \(2\)/i)).toBeDefined();
    expect(screen.getByText(/POS Directo/i)).toBeDefined();
    expect(screen.getByText(/Kittn Pickup/i)).toBeDefined();

    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.getByText("#102")).toBeDefined();
    expect(screen.getAllByText(/Pickup/i).length).toBeGreaterThanOrEqual(1);
  });

  it("filters only POS orders when clicking on POS Directo filter", () => {
    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByText(/POS Directo/i));

    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.queryByText("#102")).toBeNull();
  });

  it("filters only Kittn Pickup orders when clicking on Kittn Pickup filter", () => {
    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByText(/Kittn Pickup/i));

    expect(screen.queryByText("#101")).toBeNull();
    expect(screen.getByText("#102")).toBeDefined();
  });
});
