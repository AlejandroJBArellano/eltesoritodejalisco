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
    render(
      <OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />,
    );

    // Status Tabs
    expect(screen.getByRole("button", { name: /Pendientes/i })).toBeDefined();
    expect(screen.getByRole("button", { name: /Pagadas/i })).toBeDefined();

    // Source Filters
    expect(screen.getByText(/POS \(1\)/i)).toBeDefined();
    expect(screen.getByText(/Pickup \(1\)/i)).toBeDefined();

    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.getByText("#102")).toBeDefined();
  });

  it("calls setOrdersStatusFilter and resets page when clicking on Pendientes tab", () => {
    render(
      <OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Pendientes/i }));

    expect(setOrdersStatusFilter).toHaveBeenCalledWith("PENDING");
    expect(setOrdersPage).toHaveBeenCalledWith(1);
  });

  it("calls setOrdersStatusFilter and resets page when clicking on Pagadas tab", () => {
    render(
      <OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />,
    );

    fireEvent.click(screen.getByRole("button", { name: /Pagadas/i }));

    expect(setOrdersStatusFilter).toHaveBeenCalledWith("PAID");
    expect(setOrdersPage).toHaveBeenCalledWith(1);
  });

  it("calls setOrdersStatusFilter and resets page when clicking on Todas tab", () => {
    render(
      <OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />,
    );

    const allStatusBtn = screen.getAllByRole("button", { name: /Todas/i })[0];
    fireEvent.click(allStatusBtn);

    expect(setOrdersStatusFilter).toHaveBeenCalledWith("ALL");
    expect(setOrdersPage).toHaveBeenCalledWith(1);
  });

  it("calls setOrdersSourceFilter and resets page when clicking on POS filter", () => {
    render(
      <OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />,
    );

    fireEvent.click(screen.getByText(/POS \(1\)/i));

    expect(setOrdersSourceFilter).toHaveBeenCalledWith("POS");
    expect(setOrdersPage).toHaveBeenCalledWith(1);
  });

  it("calls setOrdersSourceFilter and resets page when clicking on Pickup filter and Todos", () => {
    render(
      <OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />,
    );

    fireEvent.click(screen.getByText(/Pickup \(1\)/i));
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
      ordersStatusFilter: "PAID",
      setOrdersStatusFilter,
      ordersSourceFilter: "POS",
      setOrdersSourceFilter,
    } as unknown as ReturnType<typeof usePOSData>);

    render(
      <OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />,
    );

    expect(screen.getByText(/No hay órdenes pagadas de POS/i)).toBeDefined();
  });

  it("shows tip amount for paid order when user is Admin", () => {
    render(
      <OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />,
    );

    expect(screen.getByText("+$25.00 propina")).toBeDefined();
  });

  it("hides tip amount for paid order when user is Waiter and prompts authorization on undo", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    render(
      <OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />,
    );

    expect(screen.queryByText("+$25.00 propina")).toBeNull();

    const undoButton = screen.getByRole("button", { name: /Deshacer Pago/i });
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

    render(
      <OrdersMobileFunction onClickCancel={vi.fn()} cancelArmedId={null} />,
    );

    const nextBtn = screen.getByRole("button", { name: /Siguiente/i });
    fireEvent.click(nextBtn);
    expect(setOrdersPage).toHaveBeenCalledWith(2);

    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "20" } });
    expect(setOrdersPageSize).toHaveBeenCalledWith(20);
    expect(setOrdersPage).toHaveBeenCalledWith(1);
  });
});
