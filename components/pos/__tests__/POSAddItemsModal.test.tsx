import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { POSAddItemsModal } from "../modals/POSAddItemsModal";
import { Order, MenuItem } from "@/types/pos";
import { OrderStatus } from "@/types";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";

vi.mock("@/hooks/pos/usePOSData", () => ({
  usePOSData: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCart", () => ({
  usePOSCart: vi.fn(),
  isMixedOrderItem: vi.fn((name: string) => name.toLowerCase().includes("orden mixta")),
}));

const mockOrder: Order = {
  id: "order-123",
  orderNumber: "1050",
  source: "POS",
  status: OrderStatus.PENDING,
  table: "Mesa 4",
  customer: { id: "cust-1", name: "Juan Perez" } as unknown as Order["customer"],
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
  {
    id: "menu-1",
    name: "Taco de Birria",
    price: 30,
    isAvailable: true,
    category: "TACOS",
    ingredientId: "ing-1",
    currentStock: 15,
    minimumStock: 5,
  },
  {
    id: "menu-2",
    name: "Quesadilla",
    price: 50,
    isAvailable: true,
    category: "ANTOJITOS",
    ingredientId: "ing-2",
    currentStock: 3,
    minimumStock: 5,
  },
  {
    id: "menu-3",
    name: "Torta Ahogada",
    price: 70,
    isAvailable: true,
    category: "PLATILLOS FUERTES",
    ingredientId: "ing-3",
    currentStock: 0,
    minimumStock: 5,
  },
  {
    id: "menu-4",
    name: "Orden Mixta",
    price: 85,
    isAvailable: true,
  },
];

describe("POSAddItemsModal Component", () => {
  const defaultDataValue = {
    availableMenuItems: mockAvailableItems,
  };

  const defaultCartValue = {
    editingOrder: mockOrder,
    setEditingOrder: vi.fn(),
    handleAddItems: vi.fn((e) => e?.preventDefault?.()),
    additionalItems: [],
    quickAddAdditionalItem: vi.fn(),
    updateAdditionalItemQty: vi.fn(),
    setAdditionalItemNotes: vi.fn(),
    addAdditionalItemRow: vi.fn(),
    handleAdditionalItemChange: vi.fn(),
    removeAdditionalItemRow: vi.fn(),
    isSubmittingCart: false,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(usePOSData).mockReturnValue(
      defaultDataValue as unknown as ReturnType<typeof usePOSData>,
    );
    vi.mocked(usePOSCart).mockReturnValue(
      defaultCartValue as unknown as ReturnType<typeof usePOSCart>,
    );
  });

  // Test 1: Renderizado del modal con datos de la orden activa y autoFocus en el input de búsqueda
  it("Test 1: should render header with active order details and autoFocus search input", () => {
    render(<POSAddItemsModal />);

    expect(
      screen.getByText("Agregar a Orden #1050"),
    ).toBeInTheDocument();
    expect(screen.getByText(/Mesa: Mesa 4/i)).toBeInTheDocument();
    expect(screen.getByText(/Juan Perez/i)).toBeInTheDocument();

    const searchInput = screen.getByPlaceholderText("Buscar producto...");
    expect(searchInput).toBeInTheDocument();
    expect(searchInput).toHaveFocus();
    expect(screen.getByText("Nuevos Productos")).toBeInTheDocument();
    expect(screen.getByText("Sin productos seleccionados")).toBeInTheDocument();
  });

  // Test 2: Filtrado por texto y por categorías en tiempo real
  it("Test 2: should filter items by search query and categories in real time", () => {
    render(<POSAddItemsModal />);

    // Initially all items are visible
    expect(screen.getByText("Taco de Birria")).toBeInTheDocument();
    expect(screen.getByText("Quesadilla")).toBeInTheDocument();
    expect(screen.getByText("Torta Ahogada")).toBeInTheDocument();

    // Type in search box
    const searchInput = screen.getByPlaceholderText("Buscar producto...");
    fireEvent.change(searchInput, { target: { value: "birria" } });

    expect(screen.getByText("Taco de Birria")).toBeInTheDocument();
    expect(screen.queryByText("Quesadilla")).not.toBeInTheDocument();
    expect(screen.queryByText("Torta Ahogada")).not.toBeInTheDocument();

    // Clear search with clear button
    const clearBtn = screen.getByRole("button", { name: "Limpiar búsqueda" });
    fireEvent.click(clearBtn);

    expect(screen.getByText("Quesadilla")).toBeInTheDocument();

    // Search for non-existent item
    fireEvent.change(searchInput, { target: { value: "mariscos" } });
    expect(screen.getByText("Sin resultados")).toBeInTheDocument();
    expect(
      screen.getByText("Intenta con otra categoría o búsqueda"),
    ).toBeInTheDocument();

    // Clear search again
    fireEvent.change(searchInput, { target: { value: "" } });

    // Filter by category: Antojitos
    const antojitosBtn = screen.getByRole("button", { name: "Antojitos" });
    fireEvent.click(antojitosBtn);

    expect(screen.getByText("Quesadilla")).toBeInTheDocument();
    expect(screen.queryByText("Taco de Birria")).not.toBeInTheDocument();

    // Reset with "Todos"
    const todosBtn = screen.getByRole("button", { name: "Todos" });
    fireEvent.click(todosBtn);

    expect(screen.getByText("Taco de Birria")).toBeInTheDocument();
    expect(screen.getByText("Quesadilla")).toBeInTheDocument();
  });

  // Test 3: Adición de producto con 1 tap e incremento de cantidad al volver a presionar
  it("Test 3: should add product with 1 tap using quickAddAdditionalItem", () => {
    const quickAddAdditionalItem = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      quickAddAdditionalItem,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    const tacoCard = screen.getByRole("button", { name: /Taco de Birria/i });
    fireEvent.click(tacoCard);

    expect(quickAddAdditionalItem).toHaveBeenCalledWith(mockAvailableItems[0]);

    // Tap again to increment
    fireEvent.click(tacoCard);
    expect(quickAddAdditionalItem).toHaveBeenCalledTimes(2);
  });

  // Test 3b: Fallback when quickAddAdditionalItem is not provided in hook
  it("Test 3b: should fallback to handleAdditionalItemChange/addAdditionalItemRow if quickAdd is omitted", () => {
    const addAdditionalItemRow = vi.fn();
    const handleAdditionalItemChange = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      quickAddAdditionalItem: undefined,
      addAdditionalItemRow,
      handleAdditionalItemChange,
      additionalItems: [{ menuItemId: "menu-1", quantity: "1", notes: "" }],
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    // Click existing item
    const tacoCard = screen.getByRole("button", { name: /Taco de Birria/i });
    fireEvent.click(tacoCard);
    expect(handleAdditionalItemChange).toHaveBeenCalledWith(0, "quantity", "2");

    // Click new item
    const quesadillaCard = screen.getByRole("button", { name: /Quesadilla/i });
    fireEvent.click(quesadillaCard);
    expect(addAdditionalItemRow).toHaveBeenCalled();
  });

  // Test 4: Controles de cantidad + y - y eliminación de ítems de la bandeja temporal
  it("Test 4: should handle quantity + and - controls and delete action in tray", () => {
    const updateAdditionalItemQty = vi.fn();
    const removeAdditionalItemRow = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      additionalItems: [
        { menuItemId: "menu-1", quantity: "2", notes: "Con cilantro" },
      ],
      updateAdditionalItemQty,
      removeAdditionalItemRow,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    // Check item in tray
    expect(screen.getAllByText("Taco de Birria")).toHaveLength(2); // Catalog & Tray
    expect(screen.getByDisplayValue("2")).toBeInTheDocument();

    // Increment (+)
    const incBtn = screen.getByRole("button", { name: "Aumentar cantidad" });
    fireEvent.click(incBtn);
    expect(updateAdditionalItemQty).toHaveBeenCalledWith(0, 1);

    // Decrement (-)
    const decBtn = screen.getByRole("button", { name: "Disminuir cantidad" });
    fireEvent.click(decBtn);
    expect(updateAdditionalItemQty).toHaveBeenCalledWith(0, -1);

    // Remove (Trash2)
    const removeBtn = screen.getByRole("button", { name: "Eliminar producto" });
    fireEvent.click(removeBtn);
    expect(removeAdditionalItemRow).toHaveBeenCalledWith(0);
  });

  // Test 4b: Fallback controls when updateAdditionalItemQty is not provided
  it("Test 4b: should fallback to handleAdditionalItemChange/removeRow on steppers", () => {
    const handleAdditionalItemChange = vi.fn();
    const removeAdditionalItemRow = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      additionalItems: [
        { menuItemId: "menu-1", quantity: "1", notes: "" },
      ],
      updateAdditionalItemQty: undefined,
      handleAdditionalItemChange,
      removeAdditionalItemRow,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    // Decrement from 1 should call removeAdditionalItemRow
    const decBtn = screen.getByRole("button", { name: "Disminuir cantidad" });
    fireEvent.click(decBtn);
    expect(removeAdditionalItemRow).toHaveBeenCalledWith(0);

    // Increment should call handleAdditionalItemChange
    const incBtn = screen.getByRole("button", { name: "Aumentar cantidad" });
    fireEvent.click(incBtn);
    expect(handleAdditionalItemChange).toHaveBeenCalledWith(0, "quantity", "2");

    // Quantity manual input change
    const qtyInput = screen.getByLabelText("Cantidad");
    fireEvent.change(qtyInput, { target: { value: "4" } });
    expect(handleAdditionalItemChange).toHaveBeenCalledWith(0, "quantity", "4");

    // Quantity input to 0 triggers remove
    fireEvent.change(qtyInput, { target: { value: "0" } });
    expect(removeAdditionalItemRow).toHaveBeenCalledWith(0);
  });

  // Test 4bb: Decrement fallback when current > 1
  it("Test 4bb: should decrement quantity via handleAdditionalItemChange when current > 1 and updateAdditionalItemQty is omitted", () => {
    const handleAdditionalItemChange = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      additionalItems: [
        { menuItemId: "menu-1", quantity: "3", notes: "" },
      ],
      updateAdditionalItemQty: undefined,
      handleAdditionalItemChange,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    const decBtn = screen.getByRole("button", { name: "Disminuir cantidad" });
    fireEvent.click(decBtn);
    expect(handleAdditionalItemChange).toHaveBeenCalledWith(0, "quantity", "2");
  });

  // Test 4c: Fallback removal with updateAdditionalItemQty when removeAdditionalItemRow is omitted
  it("Test 4c: should fallback to updateAdditionalItemQty for removal if removeRow is omitted", () => {
    const updateAdditionalItemQty = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      additionalItems: [
        { menuItemId: "menu-1", quantity: "2", notes: "" },
      ],
      updateAdditionalItemQty,
      removeAdditionalItemRow: undefined,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    const removeBtn = screen.getByRole("button", { name: "Eliminar producto" });
    fireEvent.click(removeBtn);
    expect(updateAdditionalItemQty).toHaveBeenCalledWith(0, -9999);
  });

  // Test 5: Inserción de notas específicas por producto
  it("Test 5: should insert and update kitchen notes per product", () => {
    const setAdditionalItemNotes = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      additionalItems: [
        { menuItemId: "menu-1", quantity: "1", notes: "" },
      ],
      setAdditionalItemNotes,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    const noteInput = screen.getByLabelText("Nota de producto");
    fireEvent.change(noteInput, { target: { value: "Sin cebolla y salsa aparte" } });

    expect(setAdditionalItemNotes).toHaveBeenCalledWith(0, "Sin cebolla y salsa aparte");
  });

  // Test 5b: Fallback for notes update when setAdditionalItemNotes is not provided
  it("Test 5b: should fallback to handleAdditionalItemChange for notes if setAdditionalItemNotes omitted", () => {
    const handleAdditionalItemChange = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      additionalItems: [
        { menuItemId: "menu-1", quantity: "1", notes: "" },
      ],
      setAdditionalItemNotes: undefined,
      handleAdditionalItemChange,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    const noteInput = screen.getByLabelText("Nota de producto");
    fireEvent.change(noteInput, { target: { value: "Bien dorado" } });

    expect(handleAdditionalItemChange).toHaveBeenCalledWith(0, "notes", "Bien dorado");
  });

  // Test 6: Envío del formulario y llamada a la API con los parámetros correctos
  it("Test 6: should submit form with updated items and show item summary on button", () => {
    const handleAddItems = vi.fn((e) => e?.preventDefault?.());
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      additionalItems: [
        { menuItemId: "menu-1", quantity: "2", notes: "Extra limón" },
      ],
      handleAddItems,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    // Total should be 2 * $30 = $60
    const submitBtn = screen.getByRole("button", {
      name: /Agregar a Orden \(2 productos · \$60\.00\)/i,
    });
    expect(submitBtn).toBeInTheDocument();
    expect(submitBtn).not.toBeDisabled();

    fireEvent.click(submitBtn);
    expect(handleAddItems).toHaveBeenCalled();
  });

  // Test 6b: Submitting state disables controls and displays "Guardando..."
  it("Test 6b: should disable inputs and buttons while isSubmittingCart is true", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      additionalItems: [
        { menuItemId: "menu-1", quantity: "1", notes: "" },
      ],
      isSubmittingCart: true,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    expect(screen.getByRole("button", { name: "Guardando..." })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cancelar" })).toBeDisabled();
    expect(screen.getByRole("button", { name: "Cerrar" })).toBeDisabled();
    expect(screen.getByLabelText("Cantidad")).toBeDisabled();
    expect(screen.getByLabelText("Disminuir cantidad")).toBeDisabled();
    expect(screen.getByLabelText("Aumentar cantidad")).toBeDisabled();
    expect(screen.getByLabelText("Eliminar producto")).toBeDisabled();
  });

  // Test 7: Cierre del modal con botón cancelar, botón cerrar o tecla Escape
  it("Test 7: should close modal when Cancel button, Close button or Escape key is triggered", () => {
    const setEditingOrder = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      setEditingOrder,
    } as unknown as ReturnType<typeof usePOSCart>);

    const { unmount } = render(<POSAddItemsModal />);

    // Click Close (X)
    const closeBtn = screen.getByRole("button", { name: "Cerrar" });
    fireEvent.click(closeBtn);
    expect(setEditingOrder).toHaveBeenCalledWith(null);

    // Click Cancelar
    const cancelBtn = screen.getByRole("button", { name: "Cancelar" });
    fireEvent.click(cancelBtn);
    expect(setEditingOrder).toHaveBeenCalledWith(null);

    // Press Escape
    fireEvent.keyDown(window, { key: "Escape" });
    expect(setEditingOrder).toHaveBeenCalledWith(null);

    unmount();
  });

  // Test 7b: Escape key does NOT close modal if isSubmittingCart is true
  it("Test 7b: should not close on Escape if submitting", () => {
    const setEditingOrder = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      isSubmittingCart: true,
      setEditingOrder,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    fireEvent.keyDown(window, { key: "Escape" });
    expect(setEditingOrder).not.toHaveBeenCalled();
  });

  // Test 8: Mobile tray toggle and status badges
  it("Test 8: should handle mobile tray view toggling and display stock badges", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      additionalItems: [
        { menuItemId: "menu-1", quantity: "1", notes: "" },
      ],
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    // Badges
    expect(screen.getByText("Bajo Stock")).toBeInTheDocument(); // Quesadilla has 3 <= min 5
    expect(screen.getByText("Sin Stock")).toBeInTheDocument(); // Torta Ahogada has 0
    expect(screen.getByText("Mixto")).toBeInTheDocument(); // Orden Mixta

    // Open mobile tray
    const mobileTrayBtn = screen.getByRole("button", {
      name: /Ver bandeja \(1 productos\)/i,
    });
    fireEvent.click(mobileTrayBtn);

    // Close mobile tray
    const backBtn = screen.getByRole("button", { name: "Volver al Catálogo" });
    fireEvent.click(backBtn);
  });

  // Test 9: Null / fallback cases
  it("Test 9: should render null when editingOrder is null", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      editingOrder: null,
    } as unknown as ReturnType<typeof usePOSCart>);

    const { container } = render(<POSAddItemsModal />);
    expect(container.firstChild).toBeNull();
  });

  it("Test 9b: should render properly with missing optional properties", () => {
    vi.mocked(usePOSData).mockReturnValue({
      availableMenuItems: [
        {
          id: "item-no-cat",
          name: "Agua Simple",
          price: 10,
          isAvailable: true,
          ingredientId: "ing-x",
          currentStock: null,
          minimumStock: null,
        },
        {
          id: "item-ok-stock",
          name: "Refresco",
          price: 20,
          isAvailable: true,
          ingredientId: "ing-y",
          currentStock: 10,
          minimumStock: null,
        },
      ],
    } as unknown as ReturnType<typeof usePOSData>);

    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      editingOrder: {
        ...mockOrder,
        table: "",
        customer: { id: "c-2", name: "Maria Lopez" } as unknown as Order["customer"],
      },
      additionalItems: undefined,
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);
    expect(screen.getByText("Agua Simple")).toBeInTheDocument();
    expect(screen.getByText("Maria Lopez")).toBeInTheDocument();
    expect(screen.getByText("Sin productos seleccionados")).toBeInTheDocument();
  });

  it("Test 9c: should handle form submission and controls safely when callbacks are undefined", () => {
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      handleAddItems: undefined,
      quickAddAdditionalItem: undefined,
      handleAdditionalItemChange: undefined,
      addAdditionalItemRow: undefined,
      updateAdditionalItemQty: undefined,
      removeAdditionalItemRow: undefined,
      setAdditionalItemNotes: undefined,
      additionalItems: [
        { menuItemId: "menu-1", quantity: "1", notes: "" },
      ],
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    // Click quick add without callbacks
    const card = screen.getByRole("button", { name: /Taco de Birria/i });
    fireEvent.click(card);

    // Steppers without callbacks
    const incBtn = screen.getByRole("button", { name: "Aumentar cantidad" });
    fireEvent.click(incBtn);

    const decBtn = screen.getByRole("button", { name: "Disminuir cantidad" });
    fireEvent.click(decBtn);

    const removeBtn = screen.getByRole("button", { name: "Eliminar producto" });
    fireEvent.click(removeBtn);

    const qtyInput = screen.getByLabelText("Cantidad");
    fireEvent.change(qtyInput, { target: { value: "3" } });

    const noteInput = screen.getByLabelText("Nota de producto");
    fireEvent.change(noteInput, { target: { value: "Extra" } });

    // Submit without handleAddItems
    const submitBtn = screen.getByRole("button", { name: /Agregar a Orden/i });
    fireEvent.click(submitBtn);
  });

  it("Test 9d: should cover item not found in menu, empty quantity string, and customer without name", () => {
    const handleAdditionalItemChange = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      editingOrder: {
        ...mockOrder,
        table: "Mesa 1",
        customer: { id: "c-3", name: "" } as unknown as Order["customer"],
      },
      updateAdditionalItemQty: undefined,
      handleAdditionalItemChange,
      additionalItems: [
        { menuItemId: "unknown-id", quantity: "", notes: "" },
      ],
    } as unknown as ReturnType<typeof usePOSCart>);

    render(<POSAddItemsModal />);

    // Item not found shows fallback "Producto"
    expect(screen.getByText("Producto")).toBeInTheDocument();

    // Increment with empty quantity string falls back to 1 + 1 = 2
    const incBtn = screen.getByRole("button", { name: "Aumentar cantidad" });
    fireEvent.click(incBtn);
    expect(handleAdditionalItemChange).toHaveBeenCalledWith(0, "quantity", "2");

    // Decrement with empty quantity string falls back to 1 <= 1 so calls remove
    const decBtn = screen.getByRole("button", { name: "Disminuir cantidad" });
    fireEvent.click(decBtn);
  });
});
