import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OrdersMobileFunction from "../OrdersMobilePOS";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { useOptionalUser } from "@/components/UserProvider";
import { OrderStatus, PaymentMethod, type OrderWithDetails } from "@/types";

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
    status: OrderStatus.PAID,
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
        method: PaymentMethod.CARD,
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

    // Status Tabs
    expect(screen.getByRole("button", { name: /Pendientes/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Pagadas/i })).toBeDefined();

    // Source Filters
    expect(screen.getByText(/POS \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Pickup \(1\)/i)).toBeDefined();

    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.getByText("#102")).toBeDefined();
  });

  it("filters only pending orders when clicking on Pendientes tab", () => {
    render(<OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByRole("button", { name: /Pendientes/i }));

    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.queryByText("#102")).toBeNull();
  });

  it("filters only paid orders when clicking on Pagadas tab", () => {
    render(<OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByRole("button", { name: /Pagadas/i }));

    expect(screen.queryByText("#101")).toBeNull();
    expect(screen.getByText("#102")).toBeDefined();
  });

  it("restores all orders when clicking on Todas tab after filtering", () => {
    render(<OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByRole("button", { name: /Pagadas/i }));
    expect(screen.queryByText("#101")).toBeNull();

    const allStatusBtn = screen.getAllByRole("button", { name: /Todas/i })[0];
    fireEvent.click(allStatusBtn);

    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.getByText("#102")).toBeDefined();
  });

  it("filters only POS orders when clicking on POS filter", () => {
    render(<OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByText(/POS \(1\)/i));

    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.queryByText("#102")).toBeNull();
  });

  it("filters only Pickup orders when clicking on Pickup filter and restores with Todos", () => {
    render(<OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByText(/Pickup \(1\)/i));

    expect(screen.queryByText("#101")).toBeNull();
    expect(screen.getByText("#102")).toBeDefined();

    fireEvent.click(screen.getByText(/Todos \(/i));
    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.getByText("#102")).toBeDefined();
  });

  it("displays contextual empty message when no orders match combined filters on mobile", () => {
    render(<OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />);

    // Filter: Pagadas + POS -> 0 orders
    fireEvent.click(screen.getByRole("button", { name: /Pagadas/i }));
    fireEvent.click(screen.getByText(/POS \(1\)/i));

    expect(screen.getByText(/No hay órdenes pagadas de POS/i)).toBeDefined();

    // Filter: Pendientes + Pickup -> 0 orders
    fireEvent.click(screen.getByRole("button", { name: /Pendientes/i }));
    fireEvent.click(screen.getByText(/Pickup \(1\)/i));

    expect(screen.getByText(/No hay órdenes pendientes de Kittn Pickup/i)).toBeDefined();
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
