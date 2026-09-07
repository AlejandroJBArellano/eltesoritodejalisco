import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { POSTipModal } from "../POSTipModal";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { useOptionalUser } from "@/components/UserProvider";

vi.mock("@/hooks/pos/usePOSCheckout", () => ({
  usePOSCheckout: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSData", () => ({
  usePOSData: vi.fn(),
}));

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
}));

vi.mock("../POSManagerAuthModal", () => ({
  POSManagerAuthModal: vi.fn(({ isOpen, onClose, onAuthorize, title }) => {
    if (!isOpen) return null;
    return (
      <div data-testid="manager-auth-modal">
        <span>{title}</span>
        <button onClick={() => onAuthorize({ pin: "1234", reason: "Error" })}>
          Autorizar Mock
        </button>
        <button onClick={onClose}>Cerrar Auth</button>
      </div>
    );
  }),
}));

describe("POSTipModal", () => {
  const mockSetEditingTipOrder = vi.fn();
  const mockSetEditTipType = vi.fn();
  const mockSetEditTipInput = vi.fn();
  const mockHandleUpdateTip = vi.fn();
  const mockRefreshOrders = vi.fn();

  const baseCheckoutState = {
    isSubmittingCheckout: false,
    editingTipOrder: {
      id: "ord-101",
      orderNumber: "101",
      total: 250,
      payments: [{ id: "pay-1", tipAmount: 25 }],
    },
    setEditingTipOrder: mockSetEditingTipOrder,
    editTipType: "FIXED",
    setEditTipType: mockSetEditTipType,
    editTipInput: "25",
    setEditTipInput: mockSetEditTipInput,
    editTipAmountCalculated: 25,
    handleUpdateTip: mockHandleUpdateTip,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePOSData).mockReturnValue({
      refreshOrders: mockRefreshOrders,
    } as any);

    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "ADMIN",
      isAdmin: true,
      isWaiter: false,
      isChef: false,
      isAuthenticated: true,
    });

    vi.mocked(usePOSCheckout).mockReturnValue(baseCheckoutState as any);
  });

  it("returns null when editingTipOrder is null", () => {
    vi.mocked(usePOSCheckout).mockReturnValue({
      ...baseCheckoutState,
      editingTipOrder: null,
    } as any);

    const { container } = render(<POSTipModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders order information and tip amount when editingTipOrder is set", () => {
    render(<POSTipModal />);

    expect(screen.getByText(/Editar Propina - Orden #101/i)).toBeDefined();
    expect(screen.getByText(/Total de la orden: \$250\.00/i)).toBeDefined();
    expect(screen.getByText(/Nueva Propina: \$25\.00/i)).toBeDefined();
  });

  it("changes tip type when clicking type buttons", () => {
    render(<POSTipModal />);

    fireEvent.click(screen.getByRole("button", { name: /Sin Propina/i }));
    expect(mockSetEditTipType).toHaveBeenCalledWith("NONE");
    expect(mockSetEditTipInput).toHaveBeenCalledWith("");

    fireEvent.click(screen.getByRole("button", { name: "%" }));
    expect(mockSetEditTipType).toHaveBeenCalledWith("PERCENTAGE");

    fireEvent.click(screen.getByRole("button", { name: "$ Fijo" }));
    expect(mockSetEditTipType).toHaveBeenCalledWith("FIXED");
  });

  it("updates tip input when clicking percentage presets", () => {
    render(<POSTipModal />);

    fireEvent.click(screen.getByRole("button", { name: "10%" }));
    expect(mockSetEditTipType).toHaveBeenCalledWith("PERCENTAGE");
    expect(mockSetEditTipInput).toHaveBeenCalledWith("10");

    fireEvent.click(screen.getByRole("button", { name: "15%" }));
    expect(mockSetEditTipInput).toHaveBeenCalledWith("15");

    fireEvent.click(screen.getByRole("button", { name: "20%" }));
    expect(mockSetEditTipInput).toHaveBeenCalledWith("20");
  });

  it("allows typing custom tip value", () => {
    render(<POSTipModal />);

    const input = screen.getByPlaceholderText("$ Monto");
    fireEvent.change(input, { target: { value: "50" } });
    expect(mockSetEditTipInput).toHaveBeenCalledWith("50");
  });

  it("closes modal when clicking close or cancel buttons", () => {
    const { rerender } = render(<POSTipModal />);

    fireEvent.click(screen.getByRole("button", { name: "Cancelar" }));
    expect(mockSetEditingTipOrder).toHaveBeenCalledWith(null);

    mockSetEditingTipOrder.mockClear();
    rerender(<POSTipModal />);
    fireEvent.click(screen.getByRole("button", { name: "Cerrar modal" }));
    expect(mockSetEditingTipOrder).toHaveBeenCalledWith(null);
  });

  it("calls handleUpdateTip directly without auth modal when user is ADMIN", async () => {
    render(<POSTipModal />);

    fireEvent.click(screen.getByRole("button", { name: /Actualizar Propina/i }));

    expect(mockHandleUpdateTip).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId("manager-auth-modal")).toBeNull();
  });

  it("prompts POSManagerAuthModal, handles close and passes pin to handleUpdateTip when user is WAITER", async () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    render(<POSTipModal />);

    fireEvent.click(screen.getByRole("button", { name: /Actualizar Propina/i }));

    expect(mockHandleUpdateTip).not.toHaveBeenCalled();
    expect(screen.getByTestId("manager-auth-modal")).toBeDefined();
    expect(screen.getByText("Autorizar Edición de Propina")).toBeDefined();

    // Close auth modal
    fireEvent.click(screen.getByRole("button", { name: "Cerrar Auth" }));
    expect(screen.queryByTestId("manager-auth-modal")).toBeNull();

    // Reopen and authorize
    fireEvent.click(screen.getByRole("button", { name: /Actualizar Propina/i }));
    fireEvent.click(screen.getByRole("button", { name: "Autorizar Mock" }));
    await waitFor(() => {
      expect(mockHandleUpdateTip).toHaveBeenCalledWith("1234");
    });
  });
});
