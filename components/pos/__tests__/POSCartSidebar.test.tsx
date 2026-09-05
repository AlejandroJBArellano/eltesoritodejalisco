import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { POSCartSidebar } from "../POSCartSidebar";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";
import { MenuItem, Customer, OrderFormState } from "@/types/pos";

vi.mock("@/hooks/pos/usePOSData", () => ({
  usePOSData: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCart", () => ({
  usePOSCart: vi.fn(),
  isMixedOrderItem: vi.fn().mockReturnValue(false),
}));

vi.mock("@/hooks/pos/usePOSCheckout", () => ({
  usePOSCheckout: vi.fn(),
}));

const mockMenuItems: MenuItem[] = [
  { id: "item-1", name: "Taco Pastor", price: 25, isAvailable: true },
  { id: "item-2", name: "Gringa", price: 45, isAvailable: true },
];

const mockCustomers: Customer[] = [
  { id: "cust-1", name: "Carlos Slim" },
];

describe("POSCartSidebar Component", () => {
  const mockHandleFormChange = vi.fn();
  const mockHandleServiceTypeChange = vi.fn();
  const mockHandleQuantityChange = vi.fn();
  const mockHandleItemNoteChange = vi.fn();
  const mockHandleClearCart = vi.fn();

  const defaultFormState: OrderFormState = {
    customerId: "",
    source: "Otro",
    serviceType: "COMEDOR",
    table: "",
    notes: "",
    items: [],
  };

  beforeEach(() => {
    vi.clearAllMocks();

    vi.mocked(usePOSData).mockReturnValue({
      availableMenuItems: mockMenuItems,
      customers: mockCustomers,
      refreshOrders: vi.fn().mockResolvedValue([]),
      orders: [],
      ordersLoading: false,
    } as unknown as ReturnType<typeof usePOSData>);

    vi.mocked(usePOSCheckout).mockReturnValue({
      isSubmittingCheckout: false,
    } as unknown as ReturnType<typeof usePOSCheckout>);

    vi.mocked(usePOSCart).mockReturnValue({
      formState: defaultFormState,
      formErrors: {},
      cartError: null,
      handleFormChange: mockHandleFormChange,
      handleServiceTypeChange: mockHandleServiceTypeChange,
      handleQuantityChange: mockHandleQuantityChange,
      handleItemNoteChange: mockHandleItemNoteChange,
      handleClearCart: mockHandleClearCart,
      clearCartArmed: false,
      isSubmittingCart: false,
    } as unknown as ReturnType<typeof usePOSCart>);
  });

  it("renders the 3 service type buttons and shows mesa input when COMEDOR is active", () => {
    render(<POSCartSidebar />);

    expect(screen.getByRole("radio", { name: /comedor/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /llevar/i })).toBeInTheDocument();
    expect(screen.getByRole("radio", { name: /domicilio/i })).toBeInTheDocument();

    // In COMEDOR mode, mesa input should be rendered
    expect(screen.getByPlaceholderText("Ej. 4, Terraza...")).toBeInTheDocument();
  });

  it("calls handleServiceTypeChange when clicking service type buttons", () => {
    render(<POSCartSidebar />);

    fireEvent.click(screen.getByRole("radio", { name: /llevar/i }));
    expect(mockHandleServiceTypeChange).toHaveBeenCalledWith("PARA_LLEVAR");

    fireEvent.click(screen.getByRole("radio", { name: /domicilio/i }));
    expect(mockHandleServiceTypeChange).toHaveBeenCalledWith("DOMICILIO");

    fireEvent.click(screen.getByRole("radio", { name: /comedor/i }));
    expect(mockHandleServiceTypeChange).toHaveBeenCalledWith("COMEDOR");
  });

  it("does not render mesa input when serviceType is PARA_LLEVAR or DOMICILIO", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      formState: { ...defaultFormState, serviceType: "PARA_LLEVAR" },
      formErrors: {},
      cartError: null,
      handleFormChange: mockHandleFormChange,
      handleServiceTypeChange: mockHandleServiceTypeChange,
      handleQuantityChange: mockHandleQuantityChange,
      handleItemNoteChange: mockHandleItemNoteChange,
      handleClearCart: mockHandleClearCart,
      clearCartArmed: false,
      isSubmittingCart: false,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSCartSidebar />);
    expect(screen.queryByPlaceholderText("Ej. 4, Terraza...")).not.toBeInTheDocument();
  });

  it("handles table, customer, source, and notes changes", () => {
    render(<POSCartSidebar />);

    const tableInput = screen.getByPlaceholderText("Ej. 4, Terraza...");
    fireEvent.change(tableInput, { target: { value: "Mesa 5" } });
    expect(mockHandleFormChange).toHaveBeenCalledWith("table", "Mesa 5");

    const notesInput = screen.getByPlaceholderText("Sin cebolla, salsa aparte...");
    fireEvent.change(notesInput, { target: { value: "Sin cilantro" } });
    expect(mockHandleFormChange).toHaveBeenCalledWith("notes", "Sin cilantro");

    const customerSelect = screen.getByDisplayValue("General");
    fireEvent.change(customerSelect, { target: { value: "cust-1" } });
    expect(mockHandleFormChange).toHaveBeenCalledWith("customerId", "cust-1");

    const sourceSelect = screen.getByDisplayValue("Otro");
    fireEvent.change(sourceSelect, { target: { value: "Instagram" } });
    expect(mockHandleFormChange).toHaveBeenCalledWith("source", "Instagram");
  });

  it("renders empty cart message when items array is empty", () => {
    render(<POSCartSidebar />);
    expect(screen.getByText("El carrito está vacío")).toBeInTheDocument();
    expect(screen.queryByText("GUARDAR E IMPRIMIR")).not.toBeInTheDocument();
  });

  it("renders items in cart, allows quantity updates, and toggles item notes", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      formState: {
        ...defaultFormState,
        items: [
          { menuItemId: "item-1", quantity: "2", notes: "" },
        ],
      },
      formErrors: {},
      cartError: null,
      handleFormChange: mockHandleFormChange,
      handleServiceTypeChange: mockHandleServiceTypeChange,
      handleQuantityChange: mockHandleQuantityChange,
      handleItemNoteChange: mockHandleItemNoteChange,
      handleClearCart: mockHandleClearCart,
      clearCartArmed: false,
      isSubmittingCart: false,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSCartSidebar />);

    expect(screen.getByText("Taco Pastor")).toBeInTheDocument();
    expect(screen.getAllByText("$50.00").length).toBe(2); // fila y total a pagar

    // Click increment and decrement
    const buttons = screen.getAllByRole("button");
    const minusBtn = buttons.find((b) => b.querySelector(".lucide-minus"));
    const plusBtn = buttons.find((b) => b.querySelector(".lucide-plus"));

    expect(minusBtn).toBeDefined();
    expect(plusBtn).toBeDefined();

    fireEvent.click(minusBtn!);
    expect(mockHandleQuantityChange).toHaveBeenCalledWith(0, -1);

    fireEvent.click(plusBtn!);
    expect(mockHandleQuantityChange).toHaveBeenCalledWith(0, 1);

    // Toggle note input
    const noteToggle = screen.getByTitle("Agregar nota");
    fireEvent.click(noteToggle);

    const noteInput = screen.getByPlaceholderText("Nota especial (sin cebolla, extra salsa...)");
    expect(noteInput).toBeInTheDocument();

    fireEvent.change(noteInput, { target: { value: "Extra limón" } });
    expect(mockHandleItemNoteChange).toHaveBeenCalledWith(0, "Extra limón");

    // Click again to close note
    fireEvent.click(noteToggle);
    expect(screen.queryByPlaceholderText("Nota especial (sin cebolla, extra salsa...)")).not.toBeInTheDocument();
  });

  it("renders armed clear cart confirmation", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      formState: {
        ...defaultFormState,
        items: [{ menuItemId: "item-1", quantity: "1", notes: "" }],
      },
      formErrors: {},
      cartError: null,
      handleFormChange: mockHandleFormChange,
      handleServiceTypeChange: mockHandleServiceTypeChange,
      handleQuantityChange: mockHandleQuantityChange,
      handleItemNoteChange: mockHandleItemNoteChange,
      handleClearCart: mockHandleClearCart,
      clearCartArmed: true,
      isSubmittingCart: false,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSCartSidebar />);
    const clearBtn = screen.getByText("¿Confirmar?");
    expect(clearBtn).toBeInTheDocument();
    fireEvent.click(clearBtn);
    expect(mockHandleClearCart).toHaveBeenCalled();
  });

  it("displays form errors and cart errors when present", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      formState: defaultFormState,
      formErrors: { items: "Agrega al menos un producto" },
      cartError: "Error al procesar la orden",
      handleFormChange: mockHandleFormChange,
      handleServiceTypeChange: mockHandleServiceTypeChange,
      handleQuantityChange: mockHandleQuantityChange,
      handleItemNoteChange: mockHandleItemNoteChange,
      handleClearCart: mockHandleClearCart,
      clearCartArmed: false,
      isSubmittingCart: false,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSCartSidebar />);
    expect(screen.getByText("Agrega al menos un producto")).toBeInTheDocument();
  });

  it("disables submit button and shows loading spinner when isSubmittingCart is true", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      formState: {
        ...defaultFormState,
        items: [{ menuItemId: "item-1", quantity: "1", notes: "" }],
      },
      formErrors: {},
      cartError: null,
      handleFormChange: mockHandleFormChange,
      handleServiceTypeChange: mockHandleServiceTypeChange,
      handleQuantityChange: mockHandleQuantityChange,
      handleItemNoteChange: mockHandleItemNoteChange,
      handleClearCart: mockHandleClearCart,
      clearCartArmed: false,
      isSubmittingCart: true,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSCartSidebar />);
    const submitBtn = screen.getByRole("button", { name: /guardando/i });
    expect(submitBtn).toBeDisabled();
  });
});
