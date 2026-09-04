import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OrdersMobileFunction from "../OrdersMobilePOS";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { useOptionalUser } from "@/components/UserProvider";
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

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
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
    status: OrderStatus.PENDING,
    table: "Para Llevar",
    notes: "Cliente: Juan",
    subtotal: 250,
    tax: 0,
    total: 250,
    createdAt: new Date(),
    updatedAt: new Date(),
    orderItems: [],
    payments: [
      {
        id: "pay-1",
        orderId: "ord-2",
        amount: 250,
        tipAmount: 25,
        paymentMethod: "CARD",
        createdAt: new Date(),
      },
    ],
  },
];

describe("OrdersMobileFunction component", () => {
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

    vi.mocked(usePOSData).mockReturnValue({
      refreshOrders: vi.fn(),
      availableMenuItems: [],
      orders: mockOrders,
    } as unknown as ReturnType<typeof usePOSData>);

    vi.mocked(usePOSCart).mockReturnValue({
      isSubmittingCart: false,
      setEditingOrder: vi.fn(),
      openModifyModal: vi.fn(),
    } as unknown as ReturnType<typeof usePOSCart>);

    vi.mocked(usePOSCheckout).mockReturnValue({
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
    } as unknown as ReturnType<typeof usePOSCheckout>);
  });

  it("renders filter buttons with order counts and shows all orders by default", () => {
    render(<OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />);

    expect(screen.getByText(/Todas \(2\)/i)).toBeDefined();
    expect(screen.getByText(/POS \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Pickup \(1\)/i)).toBeDefined();

    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.getByText("#102")).toBeDefined();
  });

  it("filters only POS orders when clicking on POS filter", () => {
    render(<OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByText(/POS \(1\)/i));

    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.queryByText("#102")).toBeNull();
  });

  it("shows tip amount and Propina button when user is Admin", () => {
    render(<OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />);

    expect(screen.getByText("+$25.00 propina")).toBeDefined();
    expect(screen.getAllByRole("button", { name: /Propina/i }).length).toBeGreaterThanOrEqual(1);
  });

  it("hides tip amount and Propina button when user is Waiter", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    render(<OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />);

    expect(screen.queryByText(/propina/i)).toBeNull();
    expect(screen.queryByRole("button", { name: /Propina/i })).toBeNull();
  });
});
