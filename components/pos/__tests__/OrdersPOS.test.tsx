import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import OrdersPOS from "../OrdersPOS";
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
        tipAmount: 35,
        method: PaymentMethod.CARD,
        createdAt: new Date(),
      },
    ],
  },
];

describe("OrdersPOS component", () => {
  const setOrdersPage = vi.fn();
  const setOrdersPageSize = vi.fn();
  const setOrdersStatusFilter = vi.fn();
  const setOrdersSourceFilter = vi.fn();

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
      orderCounts: {
        total: 2,
        pending: 1,
        paid: 1,
        pos: 1,
        pickup: 1,
      },
      orderPagination: {
        page: 1,
        pageSize: 10,
        total: 2,
        totalPages: 1,
      },
      ordersPage: 1,
      setOrdersPage,
      ordersPageSize: 10,
      setOrdersPageSize,
      ordersStatusFilter: "ALL",
      setOrdersStatusFilter,
      ordersSourceFilter: "ALL",
      setOrdersSourceFilter,
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
      handleUndoPayment: vi.fn(),
    } as unknown as ReturnType<typeof usePOSCheckout>);
  });

  it("renders filter buttons with order counts and shows all orders by default", () => {
    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    // Status Tabs
    expect(screen.getByRole("button", { name: /Pendientes/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Pagadas/i })).toBeDefined();

    // Source Filters
    expect(screen.getByText(/POS Directo/i)).toBeDefined();
    expect(screen.getByText(/Kittn Pickup/i)).toBeDefined();

    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.getByText("#102")).toBeDefined();
    expect(screen.getAllByText(/Pickup/i).length).toBeGreaterThanOrEqual(1);
  });

  it("calls setOrdersStatusFilter and resets page when clicking on Pendientes tab", () => {
    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByRole("button", { name: /Pendientes/i }));

    expect(setOrdersStatusFilter).toHaveBeenCalledWith("PENDING");
    expect(setOrdersPage).toHaveBeenCalledWith(1);
  });

  it("calls setOrdersStatusFilter and resets page when clicking on Pagadas tab", () => {
    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByRole("button", { name: /Pagadas/i }));

    expect(setOrdersStatusFilter).toHaveBeenCalledWith("PAID");
    expect(setOrdersPage).toHaveBeenCalledWith(1);
  });

  it("calls setOrdersStatusFilter and resets page when clicking on Todas tab", () => {
    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    const allStatusBtn = screen.getAllByRole("button", { name: /Todas/i })[0];
    fireEvent.click(allStatusBtn);

    expect(setOrdersStatusFilter).toHaveBeenCalledWith("ALL");
    expect(setOrdersPage).toHaveBeenCalledWith(1);
  });

  it("calls setOrdersSourceFilter and resets page when clicking on POS Directo filter", () => {
    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByText(/POS Directo/i));

    expect(setOrdersSourceFilter).toHaveBeenCalledWith("POS");
    expect(setOrdersPage).toHaveBeenCalledWith(1);
  });

  it("calls setOrdersSourceFilter and resets page when clicking on Kittn Pickup filter and Todos", () => {
    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    fireEvent.click(screen.getByText(/Kittn Pickup/i));
    expect(setOrdersSourceFilter).toHaveBeenCalledWith("PICKUP_APP");

    fireEvent.click(screen.getByText(/Todos \(2\)/i));
    expect(setOrdersSourceFilter).toHaveBeenCalledWith("ALL");
  });

  it("displays contextual empty message when orders list is empty", () => {
    vi.mocked(usePOSData).mockReturnValue({
      refreshOrders: vi.fn(),
      availableMenuItems: [],
      orders: [],
      orderCounts: { total: 0, pending: 0, paid: 0, pos: 0, pickup: 0 },
      orderPagination: { page: 1, pageSize: 10, total: 0, totalPages: 1 },
      ordersPage: 1,
      setOrdersPage,
      ordersPageSize: 10,
      setOrdersPageSize,
      ordersStatusFilter: "PENDING",
      setOrdersStatusFilter,
      ordersSourceFilter: "PICKUP_APP",
      setOrdersSourceFilter,
    } as unknown as ReturnType<typeof usePOSData>);

    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    expect(
      screen.getByText(/No hay órdenes pendientes de Kittn Pickup todavía/i),
    ).toBeDefined();
  });

  it("shows tip amount and Propina button for paid order when user is Admin", () => {
    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    expect(screen.getByText("+$35.00 propina")).toBeDefined();
    expect(screen.getByRole("button", { name: /Propina/i })).toBeDefined();
  });

  it("shows Propina button for paid order when user is Waiter and prompts authorization on undo", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    expect(screen.queryByText("+$35.00 propina")).toBeNull();
    expect(screen.getByRole("button", { name: /Propina/i })).toBeDefined();

    const undoButton = screen.getByRole("button", { name: /Deshacer/i });
    fireEvent.click(undoButton);
    expect(screen.getByText(/Autorizar Reapertura de Cuenta/i)).toBeDefined();
  });

  it("handles pagination controls using server pagination hook props", () => {
    vi.mocked(usePOSData).mockReturnValue({
      refreshOrders: vi.fn(),
      availableMenuItems: [],
      orders: mockOrders,
      orderCounts: { total: 25, pending: 10, paid: 15, pos: 20, pickup: 5 },
      orderPagination: { page: 1, pageSize: 10, total: 25, totalPages: 3 },
      ordersPage: 1,
      setOrdersPage,
      ordersPageSize: 10,
      setOrdersPageSize,
      ordersStatusFilter: "ALL",
      setOrdersStatusFilter,
      ordersSourceFilter: "ALL",
      setOrdersSourceFilter,
    } as unknown as ReturnType<typeof usePOSData>);

    render(<OrdersPOS onClickCancel={vi.fn()} cancelArmedId={null} />);

    // Next page button
    const nextBtn = screen.getByRole("button", { name: /Siguiente/i });
    fireEvent.click(nextBtn);
    expect(setOrdersPage).toHaveBeenCalledWith(2);

    // Change page size to 20
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "20" } });
    expect(setOrdersPageSize).toHaveBeenCalledWith(20);
    expect(setOrdersPage).toHaveBeenCalledWith(1);
  });
});
