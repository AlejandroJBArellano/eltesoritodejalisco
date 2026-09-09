import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor, within } from "@testing-library/react";
import { POSModifyOrderModal } from "../modals/POSModifyOrderModal";
import { Order } from "@/types/pos";
import { OrderStatus } from "@/types";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { useOptionalUser } from "@/components/UserProvider";

vi.mock("@/hooks/pos/usePOSData", () => ({
  usePOSData: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCart", () => ({
  usePOSCart: vi.fn(),
}));

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
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
  orderItems: [
    {
      id: "item-1",
      orderId: "order-200",
      menuItemId: "menu-1",
      quantity: 3,
      unitPrice: 80,
      createdAt: new Date(),
      menuItem: {
        id: "menu-1",
        name: "COCA COLA",
        price: 80,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
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
    setEditingOrder: vi.fn(),
    modifyItems: [
      {
        id: "item-1",
        menuItemId: "menu-1",
        quantity: 3,
        unitPrice: 80,
        menuItemName: "COCA COLA",
        notes: "Bien fría",
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
    hasUnsavedModifyChanges: false,
    handleApplyModifyItemDiscount: vi.fn(),
    handleRemoveModifyItemDiscount: vi.fn(),
    handleApplyModifyOrderDiscount: vi.fn(),
    handleRemoveModifyOrderDiscount: vi.fn(),
    handleModifyQuantityChange: vi.fn(),
    handleModifyNotesChange: vi.fn(),
    handleModifyRemoveItem: vi.fn(),
    handleSaveModifiedOrder: vi.fn().mockResolvedValue(true),
    isSubmittingCart: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOptionalUser).mockReturnValue({
      id: "user-1",
      email: "admin@example.com",
      isWaiter: false,
    } as any);
    vi.mocked(usePOSData).mockReturnValue(
      defaultDataValue as unknown as ReturnType<typeof usePOSData>,
    );
    vi.mocked(usePOSCart).mockReturnValue(
      defaultCartValue as unknown as ReturnType<typeof usePOSCart>,
    );
  });

  it("returns null when modifyingOrder is null", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      modifyingOrder: null,
    } as unknown as ReturnType<typeof usePOSCart>);

    const { container } = render(<POSModifyOrderModal />);
    expect(container.firstChild).toBeNull();
  });

  it("renders order number, items, note input, and totals correctly in desktop/mobile layout", () => {
    render(<POSModifyOrderModal />);

    expect(
      screen.getByText(/Modificar Orden #260906-002/i),
    ).toBeInTheDocument();
    expect(screen.getByText("COCA COLA")).toBeInTheDocument();
    expect(screen.getByText("$80.00 c/u")).toBeInTheDocument();
    expect(screen.getAllByText("$240.00").length).toBeGreaterThanOrEqual(1);

    const noteInput = screen.getByPlaceholderText(/Nota \(ej\. Sin cebolla\)\.\.\./i);
    expect(noteInput).toBeInTheDocument();
    expect(noteInput).toHaveValue("Bien fría");

    expect(screen.getByRole("button", { name: /Agregar Productos/i })).toBeInTheDocument();
  });

  it("modifies item notes when typing in the notes input", () => {
    render(<POSModifyOrderModal />);

    const noteInput = screen.getByPlaceholderText(/Nota \(ej\. Sin cebolla\)\.\.\./i);
    fireEvent.change(noteInput, { target: { value: "Sin hielo y con popote" } });

    expect(defaultCartValue.handleModifyNotesChange).toHaveBeenCalledWith(
      0,
      "Sin hielo y con popote",
    );
  });

  it("renders table and customer inputs and calls handlers on change", () => {
    render(<POSModifyOrderModal />);

    const tableInput = screen.getByPlaceholderText(
      /Ej. Mesa 4, Para Llevar.../i,
    );
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

    const minusButton = screen.getByLabelText("Disminuir cantidad");
    fireEvent.click(minusButton);
    expect(defaultCartValue.handleModifyQuantityChange).toHaveBeenCalledWith(
      0,
      -1,
    );

    const plusButton = screen.getByLabelText("Aumentar cantidad");
    fireEvent.click(plusButton);
    expect(defaultCartValue.handleModifyQuantityChange).toHaveBeenCalledWith(
      0,
      1,
    );
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

  it("closes modal directly when clicking close or cancel button without unsaved changes", () => {
    render(<POSModifyOrderModal />);

    const cancelButton = screen.getByRole("button", { name: /Cancelar/i });
    fireEvent.click(cancelButton);
    expect(defaultCartValue.setModifyingOrder).toHaveBeenCalledWith(null);

    const closeButton = screen.getByLabelText(/Cerrar/i);
    fireEvent.click(closeButton);
    expect(defaultCartValue.setModifyingOrder).toHaveBeenCalledWith(null);
  });

  it("shows discard confirmation dialog when closing with unsaved changes", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      hasUnsavedModifyChanges: true,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    const closeButton = screen.getByLabelText(/Cerrar/i);
    fireEvent.click(closeButton);

    expect(screen.getByText("Descartar cambios")).toBeInTheDocument();
    expect(
      screen.getByText(/Tienes cambios no guardados en esta comanda/i),
    ).toBeInTheDocument();

    // Cancel discard dialog
    const continueBtn = screen.getByRole("button", { name: /Continuar editando/i });
    fireEvent.click(continueBtn);
    expect(screen.queryByText("Descartar cambios")).not.toBeInTheDocument();
    expect(defaultCartValue.setModifyingOrder).not.toHaveBeenCalled();

    // Confirm discard
    fireEvent.click(closeButton);
    const discardBtn = screen.getByRole("button", { name: /^Descartar$/i });
    fireEvent.click(discardBtn);
    expect(defaultCartValue.setModifyingOrder).toHaveBeenCalledWith(null);
  });

  it("transitions directly to adding items if there are no unsaved changes", () => {
    render(<POSModifyOrderModal />);

    const addProductsBtn = screen.getByRole("button", { name: /Agregar Productos/i });
    fireEvent.click(addProductsBtn);

    expect(defaultCartValue.setEditingOrder).toHaveBeenCalledWith(mockOrder);
    expect(defaultCartValue.setModifyingOrder).toHaveBeenCalledWith(null);
  });

  it("prompts for confirmation when clicking '+ Agregar Productos' with unsaved changes", async () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      hasUnsavedModifyChanges: true,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    const addProductsBtn = screen.getByRole("button", { name: /Agregar Productos/i });
    fireEvent.click(addProductsBtn);

    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();
    expect(
      screen.getByText(/Tienes cambios sin guardar\. ¿Deseas guardarlos antes de agregar productos\?/i),
    ).toBeInTheDocument();

    // Option 1: Cancel
    const alertDialog = screen.getByRole("alertdialog");
    const cancelOption = within(alertDialog).getByRole("button", { name: /^Cancelar$/i });
    fireEvent.click(cancelOption);
    expect(screen.queryByText("Cambios sin guardar")).not.toBeInTheDocument();
    expect(defaultCartValue.setEditingOrder).not.toHaveBeenCalled();

    // Option 2: Descartar y Continuar
    fireEvent.click(addProductsBtn);
    const alertDialog2 = screen.getByRole("alertdialog");
    const discardAndContinue = within(alertDialog2).getByRole("button", {
      name: /Descartar y Continuar/i,
    });
    fireEvent.click(discardAndContinue);
    expect(defaultCartValue.setEditingOrder).toHaveBeenCalledWith(mockOrder);
    expect(defaultCartValue.setModifyingOrder).toHaveBeenCalledWith(null);

    // Option 3: Guardar y Continuar
    vi.clearAllMocks();
    fireEvent.click(addProductsBtn);
    const alertDialog3 = screen.getByRole("alertdialog");
    const saveAndContinue = within(alertDialog3).getByRole("button", {
      name: /Guardar y Continuar/i,
    });
    fireEvent.click(saveAndContinue);
    await waitFor(() => {
      expect(defaultCartValue.handleSaveModifiedOrder).toHaveBeenCalled();
      expect(defaultCartValue.setEditingOrder).toHaveBeenCalledWith(mockOrder);
    });
  });

  it("closes modal on Escape key when there are no unsaved changes", () => {
    render(<POSModifyOrderModal />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(defaultCartValue.setModifyingOrder).toHaveBeenCalledWith(null);
  });

  it("shows discard confirmation on Escape key when there are unsaved changes", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      hasUnsavedModifyChanges: true,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.getByText("Descartar cambios")).toBeInTheDocument();

    // Escape closes confirmation modal
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Descartar cambios")).not.toBeInTheDocument();
  });

  it("does not close on Escape key when isSubmittingCart is true", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      isSubmittingCart: true,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(defaultCartValue.setModifyingOrder).not.toHaveBeenCalled();
  });

  it("requires manager authorization if user is waiter and items are reduced", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      id: "waiter-1",
      email: "waiter@example.com",
      isWaiter: true,
    } as any);

    // mockOrder had quantity 3 originally, now modifyItems has quantity 1 (reduction)
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      modifyItems: [
        {
          id: "item-1",
          menuItemId: "menu-1",
          quantity: 1,
          unitPrice: 80,
          menuItemName: "COCA COLA",
        },
      ],
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    const saveButton = screen.getByRole("button", { name: /Guardar Cambios/i });
    fireEvent.click(saveButton);

    // Manager PIN authorization modal should open
    expect(
      screen.getByText(/Autorizar Cancelación de Productos/i),
    ).toBeInTheDocument();
    expect(defaultCartValue.handleSaveModifiedOrder).not.toHaveBeenCalled();
  });

  it("shows empty state message when modifyItems is empty", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      modifyItems: [],
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    expect(
      screen.getByText(/No quedan productos en la orden/i),
    ).toBeInTheDocument();
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

  it("opens discount modal when clicking item discount button and applies or removes discount", () => {
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
    expect(
      screen.getByText(/Descuento en Orden #260906-002/i),
    ).toBeInTheDocument();
  });

  it("removes order discount when Quitar button is clicked", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      modifyOrderDiscount: {
        discountType: "PERCENT",
        discountValue: 10,
        discountReason: "Familiar",
      },
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    const quitarBtn = screen.getByRole("button", { name: /Quitar/i });
    fireEvent.click(quitarBtn);

    expect(defaultCartValue.handleRemoveModifyOrderDiscount).toHaveBeenCalled();
  });

  it("opens item discount modal when clicking item discount badge, applies and removes discount", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      modifyItems: [
        {
          id: "item-1",
          menuItemId: "menu-1",
          quantity: 2,
          unitPrice: 80,
          menuItemName: "COCA COLA",
          discountType: "PERCENT",
          discountValue: 10,
          discountAmount: 16,
          discountScope: "ROW",
        },
      ],
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    // Click the discount badge
    const badgeBtn = screen.getByText(/-10%/i);
    fireEvent.click(badgeBtn);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();
    expect(screen.getByText(/Descuento: COCA COLA/i)).toBeInTheDocument();

    // Remove discount from inside the modal
    const removeDiscountBtn = within(dialog).getByRole("button", { name: /Quitar Descuento/i });
    fireEvent.click(removeDiscountBtn);
    expect(defaultCartValue.handleRemoveModifyItemDiscount).toHaveBeenCalledWith(0);

    // Re-open and apply a preset discount
    fireEvent.click(screen.getByText(/-10%/i));
    const dialog2 = screen.getByRole("dialog");
    const presetBtn = within(dialog2).getByRole("button", { name: "15%" });
    fireEvent.click(presetBtn);
    const applyDiscountBtn = within(dialog2).getByRole("button", { name: /Aplicar Descuento/i });
    fireEvent.click(applyDiscountBtn);
    expect(defaultCartValue.handleApplyModifyItemDiscount).toHaveBeenCalledWith(
      0,
      expect.objectContaining({ discountType: "PERCENT", discountValue: 15 }),
    );
  });

  it("applies and removes discount for the entire order in discount modal, and can be closed", () => {
    render(<POSModifyOrderModal />);

    // Open order discount modal
    const orderDiscountBtn = screen.getByText(/\+ Descuento Orden/i);
    fireEvent.click(orderDiscountBtn);

    const dialog = screen.getByRole("dialog");
    expect(dialog).toBeInTheDocument();

    // Close via close button in discount modal
    const closeBtn = within(dialog).getByLabelText("Cerrar");
    fireEvent.click(closeBtn);
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();

    // Re-open and apply preset
    fireEvent.click(screen.getByText(/\+ Descuento Orden/i));
    const dialog2 = screen.getByRole("dialog");
    const presetBtn = within(dialog2).getByRole("button", { name: "20%" });
    fireEvent.click(presetBtn);
    const applyBtn = within(dialog2).getByRole("button", { name: /Aplicar Descuento/i });
    fireEvent.click(applyBtn);

    expect(defaultCartValue.handleApplyModifyOrderDiscount).toHaveBeenCalledWith(
      expect.objectContaining({ discountType: "PERCENT", discountValue: 20 }),
    );
  });

  it("removes discount from inside the order discount modal", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      modifyOrderDiscount: {
        discountType: "PERCENT",
        discountValue: 10,
        discountReason: "Amigo",
      },
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    // Open order discount modal when discount already exists
    const editOrderDiscountBtn = screen.getByText(/Editar Descuento Orden/i);
    fireEvent.click(editOrderDiscountBtn);

    const dialog = screen.getByRole("dialog");
    const removeBtn = within(dialog).getByRole("button", { name: /Quitar Descuento/i });
    fireEvent.click(removeBtn);

    expect(defaultCartValue.handleRemoveModifyOrderDiscount).toHaveBeenCalled();
  });

  it("dismisses add items confirmation dialog when pressing Escape key", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      hasUnsavedModifyChanges: true,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    // Open add items confirmation
    fireEvent.click(screen.getByRole("button", { name: /Agregar Productos/i }));
    expect(screen.getByText("Cambios sin guardar")).toBeInTheDocument();

    // Press Escape -> closes confirmation dialog
    fireEvent.keyDown(window, { key: "Escape" });
    expect(screen.queryByText("Cambios sin guardar")).not.toBeInTheDocument();
    expect(defaultCartValue.setModifyingOrder).not.toHaveBeenCalled();
  });

  it("authorizes successfully with manager PIN when waiter reduces items and clicks Guardar Cambios", async () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      id: "waiter-1",
      email: "waiter@example.com",
      isWaiter: true,
    } as any);

    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      modifyItems: [
        {
          id: "item-1",
          menuItemId: "menu-1",
          quantity: 1,
          unitPrice: 80,
          menuItemName: "COCA COLA",
        },
      ],
    } as unknown as ReturnType<typeof usePOSCart>);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, manager: { name: "Gerente General" } }),
    } as any);

    render(<POSModifyOrderModal />);

    // Click Guardar Cambios -> opens auth modal
    const saveButton = screen.getByRole("button", { name: /Guardar Cambios/i });
    fireEvent.click(saveButton);

    const pinInput = screen.getByLabelText(/Ingresa el PIN de 4 dígitos/i);
    fireEvent.change(pinInput, { target: { value: "1234" } });

    const authSubmit = screen.getByRole("button", { name: /Autorizar/i });
    fireEvent.click(authSubmit);

    await waitFor(() => {
      expect(defaultCartValue.handleSaveModifiedOrder).toHaveBeenCalledWith("1234");
    });
  });

  it("handles manager PIN authorization when transitioning to add products", async () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      id: "waiter-1",
      email: "waiter@example.com",
      isWaiter: true,
    } as any);

    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      hasUnsavedModifyChanges: true,
      modifyItems: [
        {
          id: "item-1",
          menuItemId: "menu-1",
          quantity: 1,
          unitPrice: 80,
          menuItemName: "COCA COLA",
        },
      ],
    } as unknown as ReturnType<typeof usePOSCart>);

    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ valid: true, manager: { name: "Gerente General" } }),
    } as any);

    render(<POSModifyOrderModal />);

    // Click + Agregar Productos with unsaved changes & reductions
    const addProductsBtn = screen.getByRole("button", { name: /Agregar Productos/i });
    fireEvent.click(addProductsBtn);

    // Click Guardar y Continuar in confirmation modal
    const alertDialog = screen.getByRole("alertdialog");
    const saveAndContinue = within(alertDialog).getByRole("button", {
      name: /Guardar y Continuar/i,
    });
    fireEvent.click(saveAndContinue);

    // Auth modal should open
    expect(
      screen.getByText(/Autorizar Cancelación de Productos/i),
    ).toBeInTheDocument();

    const pinInput = screen.getByLabelText(/Ingresa el PIN de 4 dígitos/i);
    fireEvent.change(pinInput, { target: { value: "4321" } });

    const authSubmit = screen.getByRole("button", { name: /Autorizar/i });
    fireEvent.click(authSubmit);

    await waitFor(() => {
      expect(defaultCartValue.handleSaveModifiedOrder).toHaveBeenCalledWith("4321");
      expect(defaultCartValue.setEditingOrder).toHaveBeenCalledWith(mockOrder);
    });
  });

  it("can close the manager auth modal without authorizing", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      id: "waiter-1",
      email: "waiter@example.com",
      isWaiter: true,
    } as any);

    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      modifyItems: [
        {
          id: "item-1",
          menuItemId: "menu-1",
          quantity: 1,
          unitPrice: 80,
          menuItemName: "COCA COLA",
        },
      ],
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSModifyOrderModal />);

    fireEvent.click(screen.getByRole("button", { name: /Guardar Cambios/i }));
    const authModalCard = screen.getByText(/Autorizar Cancelación de Productos/i).closest("div.bg-card")!;
    expect(authModalCard).toBeInTheDocument();

    const closeBtn = within(authModalCard as HTMLElement).getByLabelText("Cerrar");
    fireEvent.click(closeBtn);
    expect(screen.queryByText(/Autorizar Cancelación de Productos/i)).not.toBeInTheDocument();
  });
});

