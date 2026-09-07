import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { POSModifyOrderModal } from "../modals/POSModifyOrderModal";
import { Order } from "@/types/pos";
import { OrderStatus } from "@/types";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";

vi.mock("@/hooks/pos/usePOSData", () => ({
  usePOSData: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCart", () => ({
  usePOSCart: vi.fn(),
}));

const mockOrder: Order = {
  id: "order-200",
  orderNumber: "260906-002",
  source: "POS",
  status: OrderStatus.PENDING,
  table: "Mesa 2",
  notes: "",
  subtotal: 240,
  tax: 0,
  total: 240,
  createdAt: new Date("2026-08-08T20:00:00Z"),
  updatedAt: new Date("2026-08-08T20:00:00Z"),
  pickupTime: null,
  orderItems: [],
};

const mockCustomers = [
  { id: "cust-1", name: "Juan Pérez" },
  { id: "cust-2", name: "María Gómez" },
];

describe("POSModifyOrderModal Component", () => {
  const defaultDataValue = {
    availableMenuItems: [],
    customers: mockCustomers,
    refreshOrders: vi.fn(),
  };

  const defaultCartValue = {
    modifyingOrder: mockOrder,
    setModifyingOrder: vi.fn(),
    modifyItems: [
      {
        id: "item-1",
        menuItemId: "menu-1",
        quantity: 3,
        unitPrice: 80,
        menuItemName: "COCA COLA",
      },
    ],
    modifyTable: "Mesa 2",
    setModifyTable: vi.fn(),
    modifyCustomerId: "cust-1",
    setModifyCustomerId: vi.fn(),
    modifyOrderTotals: {
      subtotalGross: 240,
      itemsDiscount: 0,
      subtotalNet: 240,
      orderDiscount: 0,
      totalDiscount: 0,
      total: 240,
    },
    modifyOrderDiscount: null,
    handleApplyModifyItemDiscount: vi.fn(),
    handleRemoveModifyItemDiscount: vi.fn(),
    handleApplyModifyOrderDiscount: vi.fn(),
    handleRemoveModifyOrderDiscount: vi.fn(),
    handleModifyQuantityChange: vi.fn(),
    handleModifyRemoveItem: vi.fn(),
    handleSaveModifiedOrder: vi.fn(),
    isSubmittingCart: false,
  };

  beforeEach(() => {
    vi.mocked(usePOSData).mockReturnValue(
      defaultDataValue as unknown as ReturnType<typeof usePOSData>,
    );
    vi.mocked(usePOSCart).mockReturnValue(
      defaultCartValue as unknown as ReturnType<typeof usePOSCart>,
    );
  });

  it("renders order number, items, and total correctly", () => {
    render(<POSModifyOrderModal />);

    expect(screen.getByText(/Modificar Orden #260906-002/i)).toBeInTheDocument();
    expect(screen.getByText("COCA COLA")).toBeInTheDocument();
    expect(screen.getByText("$80.00 c/u")).toBeInTheDocument();
    expect(screen.getAllByText("$240.00")).toHaveLength(2);
  });

  it("renders table and customer inputs and calls handlers on change", () => {
    render(<POSModifyOrderModal />);

    const tableInput = screen.getByPlaceholderText(/Ej. Mesa 4, Para Llevar.../i);
    expect(tableInput).toHaveValue("Mesa 2");
    fireEvent.change(tableInput, { target: { value: "Para Llevar" } });
    expect(defaultCartValue.setModifyTable).toHaveBeenCalledWith("Para Llevar");

    const customerSelect = screen.getByLabelText(/Cliente/i);
    expect(customerSelect).toHaveValue("cust-1");
    fireEvent.change(customerSelect, { target: { value: "cust-2" } });
    expect(defaultCartValue.setModifyCustomerId).toHaveBeenCalledWith("cust-2");
  });

  it("triggers quantity change when plus and minus are clicked", () => {
    render(<POSModifyOrderModal />);

    const minusButton = screen.getAllByRole("button")[1]; // first button inside item row
    fireEvent.click(minusButton);
    expect(defaultCartValue.handleModifyQuantityChange).toHaveBeenCalledWith(0, -1);

    const plusButton = screen.getAllByRole("button")[2];
    fireEvent.click(plusButton);
    expect(defaultCartValue.handleModifyQuantityChange).toHaveBeenCalledWith(0, 1);
  });

  it("triggers remove item when trash icon is clicked", () => {
    render(<POSModifyOrderModal />);

    const trashButton = screen.getByLabelText("Eliminar producto");
    fireEvent.click(trashButton);
    expect(defaultCartValue.handleModifyRemoveItem).toHaveBeenCalledWith(0);
  });

  it("triggers handleSaveModifiedOrder when clicking Guardar Cambios", () => {
    render(<POSModifyOrderModal />);

    const saveButton = screen.getByRole("button", { name: /Guardar Cambios/i });
    fireEvent.click(saveButton);
    expect(defaultCartValue.handleSaveModifiedOrder).toHaveBeenCalled();
  });

  it("closes modal when clicking close or cancel button", () => {
    render(<POSModifyOrderModal />);

    const cancelButton = screen.getByRole("button", { name: /Cancelar/i });
    fireEvent.click(cancelButton);
    expect(defaultCartValue.setModifyingOrder).toHaveBeenCalledWith(null);

    const closeButton = screen.getByLabelText(/Cerrar/i);
    fireEvent.click(closeButton);
    expect(defaultCartValue.setModifyingOrder).toHaveBeenCalledWith(null);
  });

  it("shows empty state message when modifyItems is empty", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      modifyItems: [],
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    expect(screen.getByText(/No quedan productos en la orden/i)).toBeInTheDocument();
  });

  it("renders discount breakdown when discounts are present", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      modifyOrderTotals: {
        subtotalGross: 240,
        itemsDiscount: 40,
        subtotalNet: 200,
        orderDiscount: 20,
        totalDiscount: 60,
        total: 180,
      },
      modifyOrderDiscount: {
        discountType: "FIXED",
        discountValue: 20,
        discountReason: "Promoción",
      },
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    expect(screen.getByText(/Subtotal bruto/i)).toBeInTheDocument();
    expect(screen.getByText(/Descuentos en productos/i)).toBeInTheDocument();
    expect(screen.getByText("-$40.00")).toBeInTheDocument();
    expect(screen.getByText(/Descuento orden -\$20\.00/i)).toBeInTheDocument();
    expect(screen.getByText("-$20.00")).toBeInTheDocument();
    expect(screen.getByText("$180.00")).toBeInTheDocument();
    expect(screen.getByText(/Editar Descuento Orden/i)).toBeInTheDocument();
  });

  it("opens discount modal when clicking item discount button", () => {
    render(<POSModifyOrderModal />);

    const discountBtn = screen.getByLabelText("Descuento de producto");
    fireEvent.click(discountBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Descuento: COCA COLA/i)).toBeInTheDocument();
  });

  it("opens order discount modal when clicking '+ Descuento Orden' button", () => {
    render(<POSModifyOrderModal />);

    const orderDiscountBtn = screen.getByText(/\+ Descuento Orden/i);
    fireEvent.click(orderDiscountBtn);

    expect(screen.getByRole("dialog")).toBeInTheDocument();
    expect(screen.getByText(/Descuento en Orden #260906-002/i)).toBeInTheDocument();
  });
});
