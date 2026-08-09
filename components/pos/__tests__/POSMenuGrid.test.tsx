import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { POSMenuGrid } from "../POSMenuGrid";
import { MenuItem } from "@/types/pos";
import { usePOSData } from "@/hooks/pos/usePOSData";
import { usePOSCart } from "@/hooks/pos/usePOSCart";
import { usePOSCheckout } from "@/hooks/pos/usePOSCheckout";

vi.mock("@/hooks/pos/usePOSData", () => ({
  usePOSData: vi.fn(),
}));

vi.mock("@/hooks/pos/usePOSCart", () => ({
  usePOSCart: vi.fn(),
  isMixedOrderItem: vi.fn(() => false),
}));

vi.mock("@/hooks/pos/usePOSCheckout", () => ({
  usePOSCheckout: vi.fn(),
}));

const mockItems: MenuItem[] = [
  {
    id: "1",
    name: "Taco de Birria",
    price: 30,
    isAvailable: true,
    category: "TACOS",
  },
  {
    id: "2",
    name: "Agua de Horchata",
    price: 25,
    isAvailable: true,
    category: "BEBIDAS",
  },
];

const mockCategories = ["ALL", "TACOS", "BEBIDAS"];

const defaultDataValue = {
  availableMenuItems: mockItems,
  customers: [],
  isLoading: false,
  ordersLoading: false,
  errorMessage: null,
  activeCategory: "ALL",
  setActiveCategory: vi.fn(),
  searchQuery: "",
  setSearchQuery: vi.fn(),
  categories: mockCategories,
  filteredMenuItems: mockItems,
  nextFolioDisplay: "",
  refreshOrders: vi.fn(),
  lowStockItems: [],
};

const defaultCartValue = {
  formState: { items: [] },
  formErrors: {},
  cartError: null,
  editingOrder: null,
  setEditingOrder: vi.fn(),
  additionalItems: [],
  modifyingOrder: null,
  setModifyingOrder: vi.fn(),
  modifyItems: [],
  mixedOrderMenuItem: null,
  setMixedOrderMenuItem: vi.fn(),
  mixedFlavorCounts: {},
  handleFormChange: vi.fn(),
  handleGridItemClick: vi.fn(),
  handleMixedFlavorChange: vi.fn(),
  handleMixedOrderConfirm: vi.fn(),
  handleQuantityChange: vi.fn(),
  handleItemNoteChange: vi.fn(),
  handleClearCart: vi.fn(),
  clearCartArmed: false,
  openModifyModal: vi.fn(),
  handleModifyQuantityChange: vi.fn(),
  handleModifyRemoveItem: vi.fn(),
  handleSaveModifiedOrder: vi.fn(),
  addAdditionalItemRow: vi.fn(),
  handleAdditionalItemChange: vi.fn(),
  removeAdditionalItemRow: vi.fn(),
  handleAddItems: vi.fn(),
  handleCheckoutSubmit: vi.fn(),
  handleCancelOrder: vi.fn(),
  isSubmittingCart: false,
};

const defaultCheckoutValue = {
  isSubmittingCheckout: false,
  checkoutError: null,
  checkoutOrder: null,
  setCheckoutOrder: vi.fn(),
  paymentMethod: "CARD",
  setPaymentMethod: vi.fn(),
  receivedAmount: "",
  setReceivedAmount: vi.fn(),
  showTicket: false,
  setShowTicket: vi.fn(),
  showKitchenTicket: false,
  setShowKitchenTicket: vi.fn(),
  tipType: "NONE",
  setTipType: vi.fn(),
  tipInput: "",
  setTipInput: vi.fn(),
  tipAmountCalculated: 0,
  change: 0,
  unusualTipInfo: null,
  setUnusualTipInfo: vi.fn(),
  showWhatsAppModal: false,
  setShowWhatsAppModal: vi.fn(),
  whatsappNumber: "",
  setWhatsappNumber: vi.fn(),
  generateWhatsAppMessage: vi.fn(),
  editingTipOrder: null,
  setEditingTipOrder: vi.fn(),
  editTipType: "NONE",
  setEditTipType: vi.fn(),
  editTipInput: "",
  setEditTipInput: vi.fn(),
  editTipAmountCalculated: 0,
  showSplitBill: false,
  setShowSplitBill: vi.fn(),
  billingOrder: null,
  setBillingOrder: vi.fn(),
  handleProcessPayment: vi.fn(),
  handleSplitPayment: vi.fn(),
  handleUpdateTip: vi.fn(),
  handleFailedPayment: vi.fn(),
};

describe("POSMenuGrid Component", () => {
  beforeEach(() => {
    vi.mocked(usePOSData).mockReturnValue(defaultDataValue as any);
    vi.mocked(usePOSCart).mockReturnValue(defaultCartValue as any);
    vi.mocked(usePOSCheckout).mockReturnValue(defaultCheckoutValue as any);
  });

  it("should render catalog title and menu items correctly", () => {
    render(<POSMenuGrid />);

    expect(screen.getByText("Catálogo de Productos")).toBeInTheDocument();
    expect(screen.getByText("Taco de Birria")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(screen.getByText("Agua de Horchata")).toBeInTheDocument();
  });

  it("should trigger item click callback when clicking a product card", () => {
    const handleGridItemClick = vi.fn();
    vi.mocked(usePOSCart).mockReturnValue({
      ...defaultCartValue,
      handleGridItemClick,
    } as any);

    render(<POSMenuGrid />);

    const tacoCard = screen.getByText("Taco de Birria").closest("button");
    expect(tacoCard).toBeInTheDocument();

    if (tacoCard) {
      fireEvent.click(tacoCard);
      expect(handleGridItemClick).toHaveBeenCalledWith(mockItems[0]);
    }
  });

  it("should call setSearchQuery on search input change", () => {
    const setSearchQuery = vi.fn();
    vi.mocked(usePOSData).mockReturnValue({
      ...defaultDataValue,
      setSearchQuery,
    } as any);

    render(<POSMenuGrid />);

    const searchInput = screen.getByPlaceholderText(/Buscar producto/i);
    fireEvent.change(searchInput, { target: { value: "Birria" } });
    expect(setSearchQuery).toHaveBeenCalledWith("Birria");
  });
});
