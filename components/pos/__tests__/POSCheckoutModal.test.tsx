import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { POSCheckoutModal } from "../modals/POSCheckoutModal";
import { Order } from "@/types/pos";
import { OrderStatus } from "@/types";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";

vi.mock("@/hooks/pos/usePOSData", () => ({
  usePOSData: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCart", () => ({
  usePOSCart: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCheckout", () => ({
  usePOSCheckout: vi.fn(),
}));

const mockOrder: Order = {
  id: "order-123",
  orderNumber: "1050",
  source: "POS",
  status: OrderStatus.PENDING,
  table: "Mesa 4",
  notes: "Sin picante",
  subtotal: 100,
  tax: 16,
  total: 116,
  createdAt: new Date("2026-08-08T20:00:00Z"),
  updatedAt: new Date("2026-08-08T20:00:00Z"),
  pickupTime: null,
  orderItems: [
    {
      id: "item-1",
      orderId: "order-123",
      menuItemId: "menu-1",
      quantity: 1,
      unitPrice: 116,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      menuItem: {
        id: "menu-1",
        name: "Taco Especial",
        price: 116,
        isAvailable: true,
        category: "TACOS",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
};

describe("POSCheckoutModal Component", () => {
  const defaultDataValue = {
    availableMenuItems: [],
    refreshOrders: vi.fn(),
  };

  const defaultCartValue = {
    openModifyModal: vi.fn(),
  };

  const defaultCheckoutValue = {
    isSubmittingCheckout: false,
    checkoutError: null,
    checkoutOrder: mockOrder,
    setCheckoutOrder: vi.fn(),
    paymentMethod: "CARD",
    setPaymentMethod: vi.fn(),
    receivedAmount: "",
    setReceivedAmount: vi.fn(),
    tipType: "NONE",
    setTipType: vi.fn(),
    tipInput: "",
    setTipInput: vi.fn(),
    tipAmountCalculated: 0,
    change: 0,
    unusualTipInfo: null,
    setUnusualTipInfo: vi.fn(),
    setShowSplitBill: vi.fn(),
    handleProcessPayment: vi.fn(),
    handleFailedPayment: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(usePOSData).mockReturnValue(defaultDataValue as any);
    vi.mocked(usePOSCart).mockReturnValue(defaultCartValue as any);
    vi.mocked(usePOSCheckout).mockReturnValue(defaultCheckoutValue as any);
  });

  it("should render null when checkoutOrder is null", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      checkoutOrder: null,
    } as any);

    const { container } = render(<POSCheckoutModal />);
    expect(container.firstChild).toBeNull();
  });

  it("should render order detail, totals, tip choices and payment methods", () => {
    render(<POSCheckoutModal />);

    // Header
    expect(screen.getByText("Cobrar Orden #1050")).toBeInTheDocument();
    
    // Total to pay
    expect(screen.getByText("Total a Pagar")).toBeInTheDocument();
    expect(screen.getByText("$116.00")).toBeInTheDocument();

    // Tips options
    expect(screen.getByText("Sin Propina")).toBeInTheDocument();
    expect(screen.getByText("Porcentaje (%)")).toBeInTheDocument();
    expect(screen.getByText("Fijo ($)")).toBeInTheDocument();

    // Payment methods
    expect(screen.getByText("Efectivo")).toBeInTheDocument();
    expect(screen.getByText("Tarjeta")).toBeInTheDocument();
    expect(screen.getByText("Transferencia")).toBeInTheDocument();

    // Action buttons
    expect(screen.getByText("Registrar Pago")).toBeInTheDocument();
    expect(screen.getByText("Dividir Cuenta")).toBeInTheDocument();
    expect(screen.getByText("Regresar a Editar")).toBeInTheDocument();
    expect(screen.getByText("Marcar como Pago Fallido")).toBeInTheDocument();
  });

  it("should render received amount input and change when payment method is CASH", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      paymentMethod: "CASH",
      receivedAmount: "150",
      change: 34,
    } as any);

    render(<POSCheckoutModal />);

    const receivedInput = screen.getByPlaceholderText("Monto recibido ($)...");
    expect(receivedInput).toBeInTheDocument();
    expect(receivedInput).toHaveValue(150);

    expect(screen.getByText("Cambio a Entregar")).toBeInTheDocument();
    expect(screen.getByText("$34.00")).toBeInTheDocument();
  });

  it("should render checkout error when present", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      checkoutError: "Ocurrió un error al procesar el pago",
    } as any);

    render(<POSCheckoutModal />);
    expect(screen.getByText("Ocurrió un error al procesar el pago")).toBeInTheDocument();
  });

  it("should render unusual tip warning banner and buttons when present", () => {
    const handleProcessPayment = vi.fn();
    const setUnusualTipInfo = vi.fn();

    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      unusualTipInfo: { amount: 200, percentage: 50 },
      handleProcessPayment,
      setUnusualTipInfo,
    } as any);

    render(<POSCheckoutModal />);

    expect(screen.getByText("Propina inusual")).toBeInTheDocument();
    expect(screen.getByText("$200.00 (50.0%) — ¿es correcto?")).toBeInTheDocument();

    // Confirm button
    const confirmBtn = screen.getByRole("button", { name: /Sí, confirmar/i });
    fireEvent.click(confirmBtn);
    expect(handleProcessPayment).toHaveBeenCalledWith(true);

    // Cancel / correct button
    const correctBtn = screen.getByRole("button", { name: /Corregir/i });
    fireEvent.click(correctBtn);
    expect(setUnusualTipInfo).toHaveBeenCalledWith(null);
  });

  it("should trigger payment selection callbacks and action buttons callbacks", () => {
    const setPaymentMethod = vi.fn();
    const setTipType = vi.fn();
    const setShowSplitBill = vi.fn();
    const openModifyModal = vi.fn();
    const setCheckoutOrder = vi.fn();
    const handleFailedPayment = vi.fn();

    vi.mocked(usePOSCart).mockReturnValue({
      openModifyModal,
    } as any);

    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      setPaymentMethod,
      setTipType,
      setShowSplitBill,
      setCheckoutOrder,
      handleFailedPayment,
    } as any);

    render(<POSCheckoutModal />);

    // Click CASH payment method
    const cashBtn = screen.getByRole("button", { name: /Efectivo/i });
    fireEvent.click(cashBtn);
    expect(setPaymentMethod).toHaveBeenCalledWith("CASH");

    // Click Percentage tip button
    const percentageBtn = screen.getByRole("button", { name: /Porcentaje/i });
    fireEvent.click(percentageBtn);
    expect(setTipType).toHaveBeenCalledWith("PERCENTAGE");

    // Click Split Bill button
    const splitBtn = screen.getByRole("button", { name: /Dividir Cuenta/i });
    fireEvent.click(splitBtn);
    expect(setShowSplitBill).toHaveBeenCalledWith(true);

    // Click Return to Edit button
    const returnBtn = screen.getByRole("button", { name: /Regresar a Editar/i });
    fireEvent.click(returnBtn);
    expect(openModifyModal).toHaveBeenCalledWith(mockOrder);
    expect(setCheckoutOrder).toHaveBeenCalledWith(null);

    // Click Failed Payment button
    const failedBtn = screen.getByRole("button", { name: /Marcar como Pago Fallido/i });
    fireEvent.click(failedBtn);
    expect(handleFailedPayment).toHaveBeenCalled();
  });

  it("should support submitting using the form element", () => {
    const handleProcessPayment = vi.fn();

    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      handleProcessPayment,
    } as any);

    render(<POSCheckoutModal />);

    const submitBtn = screen.getByRole("button", { name: /Registrar Pago/i });
    fireEvent.click(submitBtn);
    expect(handleProcessPayment).toHaveBeenCalledWith(false);
  });
});
