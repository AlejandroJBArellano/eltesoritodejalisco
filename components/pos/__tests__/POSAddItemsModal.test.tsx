import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { POSAddItemsModal } from "../modals/POSAddItemsModal";
import { Order, MenuItem } from "@/types/pos";
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
  usePOSCheckout: vi.fn(() => ({})),
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
  orderItems: [],
};

const mockAvailableItems: MenuItem[] = [
  { id: "menu-1", name: "Taco de Birria", price: 30, isAvailable: true },
  { id: "menu-2", name: "Quesadilla", price: 50, isAvailable: true },
];

describe("POSAddItemsModal Component", () => {
  const defaultDataValue = {
    availableMenuItems: mockAvailableItems,
  };

  const defaultCartValue = {
    editingOrder: mockOrder,
    setEditingOrder: vi.fn(),
    handleAddItems: vi.fn(),
    additionalItems: [{ menuItemId: "", quantity: "1" }],
    addAdditionalItemRow: vi.fn(),
    handleAdditionalItemChange: vi.fn(),
    removeAdditionalItemRow: vi.fn(),
    isSubmittingCart: false,
  };

  beforeEach(() => {
    vi.mocked(usePOSData).mockReturnValue(defaultDataValue as any);
    vi.mocked(usePOSCart).mockReturnValue(defaultCartValue as any);
  });

  it("should render null when editingOrder is null", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      editingOrder: null,
    } as any);

    const { container } = render(<POSAddItemsModal />);
    expect(container.firstChild).toBeNull();
  });

  it("should render header, items selectors, and actions correctly", () => {
    render(<POSAddItemsModal />);

    expect(screen.getByText("Agregar Productos a Orden #1050")).toBeInTheDocument();
    expect(screen.getByText("Nuevos Productos")).toBeInTheDocument();
    expect(screen.getByText("Fila")).toBeInTheDocument();

    // Select input should be rendered
    expect(screen.getByRole("combobox")).toBeInTheDocument();
    expect(screen.getByRole("spinbutton")).toBeInTheDocument();

    // Action buttons
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Agregar Productos" })).toBeInTheDocument();
  });

  it("should trigger callbacks when interactions occur", () => {
    const addAdditionalItemRow = vi.fn();
    const handleAdditionalItemChange = vi.fn();
    const removeAdditionalItemRow = vi.fn();
    const setEditingOrder = vi.fn();
    const handleAddItems = vi.fn((e) => e.preventDefault());

    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      addAdditionalItemRow,
      handleAdditionalItemChange,
      removeAdditionalItemRow,
      setEditingOrder,
      handleAddItems,
    } as any);

    render(<POSAddItemsModal />);

    // Add Row Click
    const addRowBtn = screen.getByRole("button", { name: /Fila/i });
    fireEvent.click(addRowBtn);
    expect(addAdditionalItemRow).toHaveBeenCalled();

    // Select Product Change
    const select = screen.getByRole("combobox");
    fireEvent.change(select, { target: { value: "menu-1" } });
    expect(handleAdditionalItemChange).toHaveBeenCalledWith(0, "menuItemId", "menu-1");

    // Quantity Change
    const qtyInput = screen.getByRole("spinbutton");
    fireEvent.change(qtyInput, { target: { value: "3" } });
    expect(handleAdditionalItemChange).toHaveBeenCalledWith(0, "quantity", "3");

    // Remove row Click
    const deleteBtn = screen.getAllByRole("button")[2]; // Close = 0, Fila = 1, Trash = 2
    fireEvent.click(deleteBtn);
    expect(removeAdditionalItemRow).toHaveBeenCalledWith(0);

    // Cancel Click
    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtn);
    expect(setEditingOrder).toHaveBeenCalledWith(null);
  });

  it("should disable inputs and select components during submitting", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      isSubmittingCart: true,
    } as any);

    render(<POSAddItemsModal />);

    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getByRole("spinbutton")).toBeDisabled();
    
    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    expect(cancelBtn).toBeDisabled();

    const submitBtn = screen.getByRole("button", { name: "Guardando..." });
    expect(submitBtn).toBeDisabled();
  });
});
