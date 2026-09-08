import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { POSCheckoutModal } from "../POSCheckoutModal";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { useOptionalUser } from "@/components/UserProvider";

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSData", () => ({
  usePOSData: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCart", () => ({
  usePOSCart: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCheckout", () => ({
  usePOSCheckout: vi.fn(),
}));

vi.mock("../POSDiscountModal", () => ({
  POSDiscountModal: vi.fn(() => <div data-testid="discount-modal" />),
}));

vi.mock("../POSManagerAuthModal", () => ({
  POSManagerAuthModal: vi.fn(({ isOpen, onAuthorize, onClose }: any) =>
    isOpen ? (
      <div data-testid="pos-manager-auth-modal">
        <button onClick={() => onAuthorize({ pin: "1234" })}>Autorizar</button>
        <button onClick={onClose}>Cancelar</button>
      </div>
    ) : null,
  ),
}));

describe("POSCheckoutModal", () => {
  const mockSetCheckoutOrder = vi.fn();
  const mockSetPaymentMethod = vi.fn();
  const mockSetReceivedAmount = vi.fn();
  const mockSetTipType = vi.fn();
  const mockSetTipInput = vi.fn();
  const mockSetUnusualTipInfo = vi.fn();
  const mockSetShowSplitBill = vi.fn();
  const mockHandleProcessPayment = vi.fn();
  const mockHandleCourtesyPayment = vi.fn();
  const mockHandleFailedPayment = vi.fn();
  const mockHandleCreditPayment = vi.fn();
  const mockOpenModifyModal = vi.fn();
  const mockRefreshOrders = vi.fn().mockResolvedValue([]);

  const baseOrder = {
    id: "order-101",
    orderNumber: "260906-009",
    table: "Mesa 4",
    status: "PENDING",
    subtotal: 600,
    total: 680,
    tax: 0,
    customer: { id: "cust-1", name: "Carlos Slim" },
    orderItems: [
      {
        id: "item-1",
        quantity: 2,
        unitPrice: 240,
        notes: "Término medio",
        menuItem: { name: "Hamburguesa Clásica" },
        discountAmount: 0,
      },
      {
        id: "item-2",
        quantity: 1,
        unitPrice: 200,
        menuItem: { name: "Papas Trufadas" },
        discountAmount: 0,
      },
    ],
    discountType: null,
    discountValue: null,
    discountAmount: 0,
    discountReason: null,
  };

  const baseCheckoutState = {
    isSubmittingCheckout: false,
    checkoutError: null,
    checkoutOrder: baseOrder,
    setCheckoutOrder: mockSetCheckoutOrder,
    paymentMethod: "CASH",
    setPaymentMethod: mockSetPaymentMethod,
    receivedAmount: "700",
    setReceivedAmount: mockSetReceivedAmount,
    tipType: "NONE",
    setTipType: mockSetTipType,
    tipInput: "",
    setTipInput: mockSetTipInput,
    tipAmountCalculated: 0,
    change: 20,
    unusualTipInfo: null,
    setUnusualTipInfo: mockSetUnusualTipInfo,
    setShowSplitBill: mockSetShowSplitBill,
    handleProcessPayment: mockHandleProcessPayment,
    handleCourtesyPayment: mockHandleCourtesyPayment,
    handleFailedPayment: mockHandleFailedPayment,
    handleCreditPayment: mockHandleCreditPayment,
  };

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
      availableMenuItems: [],
      customers: [
        { id: "cust-1", name: "Carlos Slim" },
        { id: "cust-2", name: "Ana Torres" },
      ],
      refreshOrders: mockRefreshOrders,
    } as any);

    vi.mocked(usePOSCart).mockReturnValue({
      openModifyModal: mockOpenModifyModal,
    } as any);

    vi.mocked(usePOSCheckout).mockReturnValue(baseCheckoutState as any);
  });

  it("returns null when checkoutOrder is null", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...baseCheckoutState,
      checkoutOrder: null,
    } as any);

    const { container } = render(<POSCheckoutModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders header with order number, table badge and customer badge", () => {
    render(<POSCheckoutModal />);

    expect(screen.getByText(/Cobrar Orden #260906-009/i)).toBeDefined();
    expect(screen.getByText("Mesa 4")).toBeDefined();
    expect(screen.getByText("Cliente: Carlos Slim")).toBeDefined();
  });

  it("renders order items list and financial breakdown in left column", () => {
    render(<POSCheckoutModal />);

    expect(screen.getByText(/Resumen de la Orden/i)).toBeDefined();
    expect(screen.getByText(/Hamburguesa Clásica/i)).toBeDefined();
    expect(screen.getByText(/Término medio/i)).toBeDefined();
    expect(screen.getByText(/Papas Trufadas/i)).toBeDefined();
    expect(screen.getByText(/Subtotal bruto/i)).toBeDefined();
  });

  it("renders total to pay and cash payment inputs in right column", () => {
    render(<POSCheckoutModal />);

    expect(screen.getAllByText("$680.00").length).toBeGreaterThan(0);
    expect(screen.getByPlaceholderText(/Monto recibido/i)).toBeDefined();
    expect(screen.getByText(/Cambio a Entregar/i)).toBeDefined();
    expect(screen.getByText("$20.00")).toBeDefined();
  });

  it("handles exact amount quick cash preset button", () => {
    render(<POSCheckoutModal />);

    const exactBtn = screen.getByRole("button", { name: /Exacto \(\$680\.00\)/i });
    expect(exactBtn).toBeDefined();

    fireEvent.click(exactBtn);
    expect(mockSetReceivedAmount).toHaveBeenCalledWith("680.00");
  });

  it("handles quick cash bill preset button", () => {
    render(<POSCheckoutModal />);

    const bill1000Btn = screen.getByRole("button", { name: "$1000" });
    expect(bill1000Btn).toBeDefined();

    fireEvent.click(bill1000Btn);
    expect(mockSetReceivedAmount).toHaveBeenCalledWith("1000");
  });

  it("switches payment method when clicked", () => {
    render(<POSCheckoutModal />);

    const cardBtn = screen.getByRole("button", { name: /Tarjeta/i });
    fireEvent.click(cardBtn);
    expect(mockSetPaymentMethod).toHaveBeenCalledWith("CARD");

    const transferBtn = screen.getByRole("button", { name: /Transferencia/i });
    fireEvent.click(transferBtn);
    expect(mockSetPaymentMethod).toHaveBeenCalledWith("TRANSFER");
  });

  it("changes tip options and quick percentage presets", () => {
    render(<POSCheckoutModal />);

    const pctBtn = screen.getByRole("button", { name: /Porcentaje \(%\)/i });
    fireEvent.click(pctBtn);
    expect(mockSetTipType).toHaveBeenCalledWith("PERCENTAGE");

    const quick15Btn = screen.getByRole("button", { name: "15%" });
    fireEvent.click(quick15Btn);
    expect(mockSetTipType).toHaveBeenCalledWith("PERCENTAGE");
    expect(mockSetTipInput).toHaveBeenCalledWith("15");
  });

  it("calls handleProcessPayment when submitting the form", () => {
    render(<POSCheckoutModal />);

    const submitBtn = screen.getByRole("button", { name: /Registrar Pago/i });
    fireEvent.click(submitBtn);

    expect(mockHandleProcessPayment).toHaveBeenCalledWith(false);
  });

  it("handles courtesy payment when total is $0.00", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...baseCheckoutState,
      checkoutOrder: {
        ...baseOrder,
        total: 0,
        subtotal: 0,
      },
      tipAmountCalculated: 0,
    } as any);

    render(<POSCheckoutModal />);

    expect(screen.getByText(/Orden 100% Bonificada \/ Cortesía/i)).toBeDefined();
    const courtesyBtn = screen.getByRole("button", { name: /Registrar Cortesía \(\$0\.00\)/i });
    fireEvent.click(courtesyBtn);

    expect(mockHandleCourtesyPayment).toHaveBeenCalled();
  });

  it("triggers secondary actions: split bill, edit order, and failed payment", () => {
    render(<POSCheckoutModal />);

    const splitBtn = screen.getByRole("button", { name: /Dividir Cuenta/i });
    fireEvent.click(splitBtn);
    expect(mockSetShowSplitBill).toHaveBeenCalledWith(true);

    const editBtn = screen.getByRole("button", { name: /Regresar a Editar/i });
    fireEvent.click(editBtn);
    expect(mockOpenModifyModal).toHaveBeenCalledWith(baseOrder);
    expect(mockSetCheckoutOrder).toHaveBeenCalledWith(null);

    const failedBtn = screen.getByRole("button", { name: /Marcar como Pago Fallido/i });
    fireEvent.click(failedBtn);
    expect(mockHandleFailedPayment).toHaveBeenCalled();
  });

  it("opens credit confirmation when A Crédito is clicked for customer", () => {
    render(<POSCheckoutModal />);

    const creditBtn = screen.getByRole("button", { name: /A Crédito/i });
    fireEvent.click(creditBtn);

    expect(screen.getByText(/Confirmar Venta a Crédito/i)).toBeDefined();
    const confirmCreditBtn = screen.getByRole("button", { name: /Confirmar Crédito/i });
    fireEvent.click(confirmCreditBtn);

    expect(mockHandleCreditPayment).toHaveBeenCalled();
  });

  it("displays and handles unusual tip confirmation banner", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...baseCheckoutState,
      unusualTipInfo: {
        amount: 300,
        percentage: 44.1,
      },
    } as any);

    render(<POSCheckoutModal />);

    expect(screen.getByText(/Propina inusual/i)).toBeDefined();
    expect(screen.getByText(/\$300\.00 \(44\.1%\) — ¿es correcto\?/i)).toBeDefined();

    const confirmBtn = screen.getByRole("button", { name: /Sí, confirmar/i });
    fireEvent.click(confirmBtn);
    expect(mockHandleProcessPayment).toHaveBeenCalledWith(true);

    const correctBtn = screen.getByRole("button", { name: /Corregir/i });
    fireEvent.click(correctBtn);
    expect(mockSetUnusualTipInfo).toHaveBeenCalledWith(null);
  });

  it("renders empty state when order has no items", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...baseCheckoutState,
      checkoutOrder: {
        ...baseOrder,
        orderItems: [],
      },
    } as any);

    render(<POSCheckoutModal />);
    expect(screen.getByText(/Sin productos registrados/i)).toBeDefined();
  });

  it("handles courtesy payment directly when user is not a waiter", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...baseCheckoutState,
      checkoutOrder: {
        ...baseOrder,
        total: 0,
      },
      tipAmountCalculated: 0,
    } as any);

    render(<POSCheckoutModal />);

    const courtesyBtn = screen.getByRole("button", { name: /Registrar Cortesía \(\$0\.00\)/i });
    fireEvent.click(courtesyBtn);

    expect(mockHandleCourtesyPayment).toHaveBeenCalled();
  });

  it("requires manager auth modal when user is a waiter and requests courtesy payment", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    vi.mocked(usePOSCheckout).mockReturnValue({
      ...baseCheckoutState,
      checkoutOrder: {
        ...baseOrder,
        total: 0,
      },
      tipAmountCalculated: 0,
    } as any);

    render(<POSCheckoutModal />);

    const courtesyBtn = screen.getByRole("button", { name: /Registrar Cortesía \(\$0\.00\)/i });
    fireEvent.click(courtesyBtn);

    // Should NOT call courtesy payment directly
    expect(mockHandleCourtesyPayment).not.toHaveBeenCalled();

    // Manager auth modal should be open
    expect(screen.getByTestId("pos-manager-auth-modal")).toBeDefined();

    // Authorizing with PIN should invoke courtesy payment with pin
    const authBtn = screen.getByRole("button", { name: "Autorizar" });
    fireEvent.click(authBtn);

    expect(mockHandleCourtesyPayment).toHaveBeenCalledWith("1234");
  });

  it("requires manager auth modal on submit when user is a waiter and order total is 0", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    vi.mocked(usePOSCheckout).mockReturnValue({
      ...baseCheckoutState,
      checkoutOrder: {
        ...baseOrder,
        total: 0,
      },
      tipAmountCalculated: 0,
    } as any);

    const { container } = render(<POSCheckoutModal />);
    const form = container.querySelector("form")!;
    fireEvent.submit(form);

    expect(mockHandleCourtesyPayment).not.toHaveBeenCalled();
    expect(screen.getByTestId("pos-manager-auth-modal")).toBeDefined();
  });
});
