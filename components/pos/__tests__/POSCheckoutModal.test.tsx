import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { POSCheckoutModal } from "../modals/POSCheckoutModal";
import { Order } from "@/types/pos";
import { OrderStatus } from "@/types";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { useOptionalUser } from "@/components/UserProvider";

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
    customers: [],
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
    handleCourtesyPayment: vi.fn(),
    handleFailedPayment: vi.fn(),
    handleCreditPayment: vi.fn(),
  };

  beforeEach(() => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "ADMIN",
      isAdmin: true,
      isWaiter: false,
      isChef: false,
      isAuthenticated: true,
    });
    vi.mocked(usePOSData).mockReturnValue(
      defaultDataValue as unknown as ReturnType<typeof usePOSData>,
    );
    vi.mocked(usePOSCart).mockReturnValue(
      defaultCartValue as unknown as ReturnType<typeof usePOSCart>,
    );
    vi.mocked(usePOSCheckout).mockReturnValue(
      defaultCheckoutValue as unknown as ReturnType<typeof usePOSCheckout>,
    );
  });

  it("should render null when checkoutOrder is null", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      checkoutOrder: null,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    const { container } = render(<POSCheckoutModal />);
    expect(container.firstChild).toBeNull();
  });

  it("should render order detail, totals, tip choices and payment methods", () => {
    render(<POSCheckoutModal />);

    // Header
    expect(screen.getByText("Cobrar Orden #1050")).toBeInTheDocument();
    
    // Total to pay
    expect(screen.getByText("Total a Pagar")).toBeInTheDocument();
    expect(screen.getAllByText("$116.00").length).toBeGreaterThan(0);

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
    } as unknown as ReturnType<typeof usePOSCheckout>);

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
    } as unknown as ReturnType<typeof usePOSCheckout>);

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
    } as unknown as ReturnType<typeof usePOSCheckout>);

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
    } as unknown as ReturnType<typeof usePOSCart>);

    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      setPaymentMethod,
      setTipType,
      setShowSplitBill,
      setCheckoutOrder,
      handleFailedPayment,
    } as unknown as ReturnType<typeof usePOSCheckout>);

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
    } as unknown as ReturnType<typeof usePOSCheckout>);

    render(<POSCheckoutModal />);

    const submitBtn = screen.getByRole("button", { name: /Registrar Pago/i });
    fireEvent.click(submitBtn);
    expect(handleProcessPayment).toHaveBeenCalledWith(false);
  });

  it("should show tip badge when tipAmountCalculated > 0 and user is admin", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      tipAmountCalculated: 20,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    render(<POSCheckoutModal />);

    expect(screen.getByText("Incluye $20.00 de propina")).toBeInTheDocument();
    expect(screen.getByText("$136.00")).toBeInTheDocument();
  });

  it("should hide tip badge when tipAmountCalculated > 0 and user is waiter, but keep total to pay", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      tipAmountCalculated: 20,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    render(<POSCheckoutModal />);

    expect(screen.queryByText(/Incluye.*propina/i)).toBeNull();
    // Still shows the combined total to pay so the waiter knows what to charge the customer
    expect(screen.getByText("$136.00")).toBeInTheDocument();
  });

  it("should show warning if trying to send to credit without an assigned customer", () => {
    const orderWithoutCustomer = {
      ...mockOrder,
      customer: undefined,
      customerId: undefined,
    };

    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      checkoutOrder: orderWithoutCustomer,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    render(<POSCheckoutModal />);

    const creditBtn = screen.getByRole("button", { name: /A Crédito/i });
    fireEvent.click(creditBtn);

    expect(
      screen.getByText(/Para enviar a crédito, asigna primero un cliente/i)
    ).toBeInTheDocument();
  });

  it("should allow admin to confirm credit payment directly", () => {
    const orderWithCustomer = {
      ...mockOrder,
      customer: { id: "c-1", name: "Raúl González" },
    };

    const handleCreditPaymentMock = vi.fn();
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      checkoutOrder: orderWithCustomer,
      handleCreditPayment: handleCreditPaymentMock,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    render(<POSCheckoutModal />);

    const creditBtn = screen.getByRole("button", { name: /A Crédito/i });
    fireEvent.click(creditBtn);

    expect(screen.getByText("Confirmar Venta a Crédito")).toBeInTheDocument();
    expect(screen.getAllByText(/Raúl González/i).length).toBeGreaterThan(0);

    const confirmBtn = screen.getByRole("button", { name: /Confirmar Crédito/i });
    fireEvent.click(confirmBtn);

    expect(handleCreditPaymentMock).toHaveBeenCalled();
  });

  it("should require manager PIN for waiter and authorize credit upon valid PIN", async () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    const orderWithCustomer = {
      ...mockOrder,
      customer: { id: "c-1", name: "Raúl González" },
    };

    const handleCreditPaymentMock = vi.fn();
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      checkoutOrder: orderWithCustomer,
      handleCreditPayment: handleCreditPaymentMock,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({ valid: true }),
    });

    render(<POSCheckoutModal />);

    const creditBtn = screen.getByRole("button", { name: /A Crédito/i });
    fireEvent.click(creditBtn);

    expect(screen.getByText(/Autorización de Gerencia Requerida/i)).toBeInTheDocument();

    const pinInput = screen.getByPlaceholderText(/Ingresa PIN de 4 dígitos/i);
    fireEvent.change(pinInput, { target: { value: "1234" } });

    const confirmBtn = screen.getByRole("button", { name: /Confirmar Crédito/i });
    fireEvent.click(confirmBtn);

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/auth/verify-pin",
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({ pin: "1234" }),
      })
    );

    await vi.waitFor(() => {
      expect(handleCreditPaymentMock).toHaveBeenCalled();
    });
  });

  it("should show error when waiter enters invalid PIN", async () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    const orderWithCustomer = {
      ...mockOrder,
      customer: { id: "c-1", name: "Raúl González" },
    };

    const handleCreditPaymentMock = vi.fn();
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      checkoutOrder: orderWithCustomer,
      handleCreditPayment: handleCreditPaymentMock,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: false,
      json: async () => ({ valid: false, error: "PIN de autorización incorrecto" }),
    });

    render(<POSCheckoutModal />);

    const creditBtn = screen.getByRole("button", { name: /A Crédito/i });
    fireEvent.click(creditBtn);

    const pinInput = screen.getByPlaceholderText(/Ingresa PIN de 4 dígitos/i);
    fireEvent.change(pinInput, { target: { value: "9999" } });

    const confirmBtn = screen.getByRole("button", { name: /Confirmar Crédito/i });
    fireEvent.click(confirmBtn);

    expect(
      await screen.findByText("PIN de autorización incorrecto")
    ).toBeInTheDocument();
    expect(handleCreditPaymentMock).not.toHaveBeenCalled();
  });

  it("should allow assigning a customer to the order directly from checkout modal", async () => {
    const orderWithoutCustomer = {
      ...mockOrder,
      customer: undefined,
      customerId: undefined,
    };

    const setCheckoutOrderMock = vi.fn();
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      checkoutOrder: orderWithoutCustomer,
      setCheckoutOrder: setCheckoutOrderMock,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    vi.mocked(usePOSData).mockReturnValue({
      ...defaultDataValue,
      customers: [{ id: "cust-9", name: "Esteban Quito" }],
      refreshOrders: vi.fn().mockResolvedValue([]),
    } as unknown as ReturnType<typeof usePOSData>);

    global.fetch = vi.fn().mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        order: { ...orderWithoutCustomer, customerId: "cust-9" },
      }),
    });

    render(<POSCheckoutModal />);

    const select = screen.getByRole("combobox", { name: /seleccionar cliente/i });
    fireEvent.change(select, { target: { value: "cust-9" } });

    const assignBtn = screen.getByRole("button", { name: /asignar/i });
    fireEvent.click(assignBtn);

    expect(global.fetch).toHaveBeenCalledWith(
      `/api/orders/${orderWithoutCustomer.id}`,
      expect.objectContaining({
        method: "PATCH",
        body: JSON.stringify({ customerId: "cust-9" }),
      }),
    );
  });

  it("renders discount breakdown when order has item or order discounts", () => {
    const discountedOrder: Order = {
      ...mockOrder,
      subtotal: 100,
      total: 70,
      discountType: "FIXED",
      discountValue: 10,
      discountAmount: 10,
      discountReason: "Promoción",
      orderItems: [
        {
          ...mockOrder.orderItems[0],
          id: "item-1",
          orderId: "order-123",
          menuItemId: "menu-1",
          quantity: 1,
          unitPrice: 100,
          discountType: "FIXED",
          discountValue: 20,
          discountAmount: 20,
          discountScope: "ROW",
          discountReason: "Cortesía",
          status: OrderStatus.PENDING,
          createdAt: new Date(),
        },
      ],
    };

    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      checkoutOrder: discountedOrder,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    render(<POSCheckoutModal />);

    expect(screen.getByText(/Subtotal bruto/i)).toBeInTheDocument();
    expect(screen.getAllByText("$100.00").length).toBeGreaterThan(0);
    expect(screen.getByText(/Descuentos en productos/i)).toBeInTheDocument();
    expect(screen.getByText("-$20.00")).toBeInTheDocument();
    expect(screen.getByText(/Descuento orden -\$10\.00/i)).toBeInTheDocument();
    expect(screen.getByText("-$10.00")).toBeInTheDocument();
    expect(screen.getByText("$70.00")).toBeInTheDocument();
    expect(screen.getByText(/Editar Descuento/i)).toBeInTheDocument();
  });

  it("opens order discount modal when clicking '+ Descuento Orden'", () => {
    render(<POSCheckoutModal />);

    const discountBtn = screen.getByText(/\+ Descuento Orden/i);
    fireEvent.click(discountBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Descuento en Orden #1050/i)).toBeInTheDocument();
  });

  it("renders prominent 'Registrar Cortesía ($0.00)' button when order total is 0 and handles payment", () => {
    const freeOrder: Order = {
      ...mockOrder,
      subtotal: 100,
      total: 0,
      discountType: "PERCENT",
      discountValue: 100,
      discountAmount: 100,
      discountReason: "Cortesía",
    };

    const handleCourtesyPaymentMock = vi.fn();
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...defaultCheckoutValue,
      checkoutOrder: freeOrder,
      tipAmountCalculated: 0,
      handleCourtesyPayment: handleCourtesyPaymentMock,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    render(<POSCheckoutModal />);

    expect(screen.getByText(/Orden 100% Bonificada \/ Cortesía/i)).toBeInTheDocument();
    const courtesyBtn = screen.getByRole("button", { name: /Registrar Cortesía \(\$0\.00\)/i });
    expect(courtesyBtn).toBeInTheDocument();

    // Ensure payment method options and cash inputs are NOT rendered
    expect(screen.queryByText(/Método de Pago/i)).not.toBeInTheDocument();
    expect(screen.queryByPlaceholderText(/Monto recibido/i)).not.toBeInTheDocument();

    fireEvent.click(courtesyBtn);
    expect(handleCourtesyPaymentMock).toHaveBeenCalled();
  });
});
