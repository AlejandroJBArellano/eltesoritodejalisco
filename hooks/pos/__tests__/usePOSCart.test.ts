import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePOSCart } from "../usePOSCart";
import { MenuItem, Order } from "@/types/pos";

const mockMenuItems: MenuItem[] = [
  {
    id: "1",
    name: "Taco Pastor",
    price: 20,
    isAvailable: true,
    category: "Tacos",
  },
  {
    id: "2",
    name: "Gringa",
    price: 35,
    isAvailable: true,
    category: "Gringas",
  },
  {
    id: "3",
    name: "Orden Mixta",
    price: 60,
    isAvailable: true,
    category: "Tacos",
  },
];

const mockRefreshOrders = vi.fn().mockResolvedValue([] as Order[]);

describe("usePOSCart Hook", () => {
  it("should initialize default empty form state", () => {
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    expect(result.current.formState.customerId).toBe("");
    expect(result.current.formState.source).toBe("Otro");
    expect(result.current.formState.serviceType).toBe("COMEDOR");
    expect(result.current.formState.items.length).toBe(0);
  });

  it("should add grid items to the cart correctly", () => {
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    // Add Taco Pastor
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[0]);
    });

    expect(result.current.formState.items.length).toBe(1);
    expect(result.current.formState.items[0].menuItemId).toBe("1");
    expect(result.current.formState.items[0].quantity).toBe("1");

    // Add Gringa
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[1]);
    });

    expect(result.current.formState.items.length).toBe(2);
    expect(result.current.formState.items[1].menuItemId).toBe("2");
    expect(result.current.formState.items[1].quantity).toBe("1");

    // Click Gringa again, should increment quantity
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[1]);
    });
    expect(result.current.formState.items[1].quantity).toBe("2");
  });

  it("should update quantity and remove item when quantity drops to 0", () => {
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    // Add Taco Pastor
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[0]);
    });
    expect(result.current.formState.items.length).toBe(1);

    // Increment quantity
    act(() => {
      result.current.handleQuantityChange(0, 1);
    });
    expect(result.current.formState.items[0].quantity).toBe("2");

    // Decrement quantity
    act(() => {
      result.current.handleQuantityChange(0, -1);
    });
    expect(result.current.formState.items[0].quantity).toBe("1");

    // Decrement again, should remove item
    act(() => {
      result.current.handleQuantityChange(0, -1);
    });
    expect(result.current.formState.items.length).toBe(0);
  });

  it("should handle two-step clear cart flow", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    // Add Taco Pastor first so the cart is not empty
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[0]);
    });
    expect(result.current.formState.items.length).toBe(1);

    expect(result.current.clearCartArmed).toBe(false);

    // Step 1: Arm the clear cart
    act(() => {
      result.current.handleClearCart();
    });
    expect(result.current.clearCartArmed).toBe(true);
    expect(result.current.formState.items.length).toBe(1); // not cleared yet

    // Step 2: Confirm clear cart
    act(() => {
      result.current.handleClearCart();
    });
    expect(result.current.clearCartArmed).toBe(false);
    expect(result.current.formState.items.length).toBe(0); // cleared now

    vi.useRealTimers();
  });

  it("should auto-reset armed state for clear cart after 3 seconds", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    act(() => {
      result.current.handleClearCart();
    });
    expect(result.current.clearCartArmed).toBe(true);

    act(() => {
      vi.advanceTimersByTime(3000);
    });
    expect(result.current.clearCartArmed).toBe(false);

    vi.useRealTimers();
  });

  it("should handle mixed order flavor changes correctly without exceeding total limit", () => {
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    // Trigger mixed order flow by clicking "Orden Mixta"
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[2]);
    });

    expect(result.current.mixedOrderMenuItem).toEqual(mockMenuItems[2]);
    expect(result.current.mixedFlavorCounts.Carnitas).toBe(0);

    // Increment Carnitas flavor
    act(() => {
      result.current.handleMixedFlavorChange("Carnitas", 1);
    });
    expect(result.current.mixedFlavorCounts.Carnitas).toBe(1);

    // Try to add more than MIXED_ORDER_TOTAL (3 flavors total)
    act(() => {
      result.current.handleMixedFlavorChange("Birria", 2);
    });
    expect(result.current.mixedFlavorCounts.Birria).toBe(2); // total = 3 now

    // Incrementing Pastor should fail/be ignored since total is 3
    act(() => {
      result.current.handleMixedFlavorChange("Pastor", 1);
    });
    expect(result.current.mixedFlavorCounts.Pastor).toBe(0); // stayed 0
  });

  it("totalCartItems should reflect the sum of all item quantities", () => {
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    // Empty cart → 0
    expect(result.current.totalCartItems).toBe(0);

    // Add 1x Taco Pastor
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[0]);
    });
    expect(result.current.totalCartItems).toBe(1);

    // Add 1x Gringa
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[1]);
    });
    expect(result.current.totalCartItems).toBe(2);

    // Increment Taco Pastor quantity by 2 more
    act(() => {
      result.current.handleQuantityChange(0, 1);
    });
    act(() => {
      result.current.handleQuantityChange(0, 1);
    });
    expect(result.current.totalCartItems).toBe(4); // 3x Taco + 1x Gringa
  });

  it("cartTotal should reflect item prices × quantities", () => {
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    // Empty cart → 0
    expect(result.current.cartTotal).toBe(0);

    // Add 2x Taco Pastor ($20 each) + 1x Gringa ($35)
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[0]); // 1x $20
    });
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[0]); // now 2x $20
    });
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[1]); // 1x $35
    });

    // Expected: 2*20 + 1*35 = 75
    expect(result.current.cartTotal).toBe(75);
  });

  it("should update serviceType when handleServiceTypeChange is called", () => {
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    expect(result.current.formState.serviceType).toBe("COMEDOR");

    act(() => {
      result.current.handleServiceTypeChange("PARA_LLEVAR");
    });
    expect(result.current.formState.serviceType).toBe("PARA_LLEVAR");

    act(() => {
      result.current.handleServiceTypeChange("DOMICILIO");
    });
    expect(result.current.formState.serviceType).toBe("DOMICILIO");

    act(() => {
      result.current.handleServiceTypeChange("COMEDOR");
    });
    expect(result.current.formState.serviceType).toBe("COMEDOR");
  });

  it("should send properly resolved table on checkout submit", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        order: { id: "order-1", orderNumber: "1001", table: "Mesa 3" },
      }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    // Add 1 item
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[0]);
      result.current.handleFormChange("table", "3");
    });

    const setCheckoutOrder = vi.fn();
    const fakeEvent = { preventDefault: vi.fn() } as unknown as React.FormEvent<HTMLFormElement>;

    await act(async () => {
      await result.current.handleCheckoutSubmit(fakeEvent, setCheckoutOrder);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/orders",
      expect.objectContaining({
        method: "POST",
        body: expect.stringContaining('"table":"Mesa 3"'),
      }),
    );
  });

  it("should apply item discount and calculate cart totals correctly", () => {
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    // Add 2x Gringa (35 each = 70 gross)
    act(() => {
      result.current.handleGridItemClick(mockMenuItems[1]);
      result.current.handleQuantityChange(0, 1);
    });

    expect(result.current.cartTotals.subtotalGross).toBe(70);
    expect(result.current.cartTotals.total).toBe(70);

    // Apply fixed discount of $10 to item 0
    act(() => {
      result.current.handleApplyItemDiscount(0, {
        discountType: "FIXED",
        discountValue: 10,
        discountScope: "ROW",
        discountReason: "Promoción",
      });
    });

    expect(result.current.formState.items[0].discountAmount).toBe(10);
    expect(result.current.cartTotals.itemsDiscount).toBe(10);
    expect(result.current.cartTotals.total).toBe(60);

    // Apply 10% discount on order
    act(() => {
      result.current.handleApplyOrderDiscount({
        discountType: "PERCENT",
        discountValue: 10,
        discountReason: "Cortesía",
      });
    });

    // Subtotal net before order discount is 60. 10% of 60 = 6. Total = 54.
    expect(result.current.cartTotals.orderDiscount).toBe(6);
    expect(result.current.cartTotals.totalDiscount).toBe(16);
    expect(result.current.cartTotals.total).toBe(54);

    // Remove order discount
    act(() => {
      result.current.handleRemoveOrderDiscount();
    });
    expect(result.current.cartTotals.orderDiscount).toBe(0);
    expect(result.current.cartTotals.total).toBe(60);

    // Remove item discount
    act(() => {
      result.current.handleRemoveItemDiscount(0);
    });
    expect(result.current.cartTotals.itemsDiscount).toBe(0);
    expect(result.current.cartTotals.total).toBe(70);
  });

  it("should handle quickAddAdditionalItem, updateAdditionalItemQty, and setAdditionalItemNotes", () => {
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    // Initial state
    expect(result.current.additionalItems).toEqual([]);

    // Quick add 1x Taco Pastor
    act(() => {
      result.current.quickAddAdditionalItem(mockMenuItems[0]);
    });
    expect(result.current.additionalItems).toEqual([
      { menuItemId: "1", quantity: "1", notes: "" },
    ]);

    // Quick add Taco Pastor again -> quantity should increment to 2
    act(() => {
      result.current.quickAddAdditionalItem(mockMenuItems[0]);
    });
    expect(result.current.additionalItems).toEqual([
      { menuItemId: "1", quantity: "2", notes: "" },
    ]);

    // Quick add Gringa -> appends new row
    act(() => {
      result.current.quickAddAdditionalItem(mockMenuItems[1]);
    });
    expect(result.current.additionalItems).toHaveLength(2);
    expect(result.current.additionalItems[1].menuItemId).toBe("2");

    // Set notes on Taco Pastor
    act(() => {
      result.current.setAdditionalItemNotes(0, "Sin cebolla");
    });
    expect(result.current.additionalItems[0].notes).toBe("Sin cebolla");

    // Adding Taco Pastor again when notes are present adds as separate item (not merging)
    act(() => {
      result.current.quickAddAdditionalItem(mockMenuItems[0]);
    });
    expect(result.current.additionalItems).toHaveLength(3);

    // Update quantity with delta +1
    act(() => {
      result.current.updateAdditionalItemQty(1, 1);
    });
    expect(result.current.additionalItems[1].quantity).toBe("2");

    // Update quantity with delta -1
    act(() => {
      result.current.updateAdditionalItemQty(1, -1);
    });
    expect(result.current.additionalItems[1].quantity).toBe("1");

    // Update quantity with delta -1 again -> reaches 0 and removes item
    act(() => {
      result.current.updateAdditionalItemQty(1, -1);
    });
    expect(result.current.additionalItems).toHaveLength(2);

    // Calling with out of bounds index does nothing
    act(() => {
      result.current.updateAdditionalItemQty(99, 1);
      result.current.setAdditionalItemNotes(99, "test");
    });
    expect(result.current.additionalItems).toHaveLength(2);
  });

  it("should reset additionalItems when setEditingOrder is called with an order", () => {
    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    act(() => {
      result.current.quickAddAdditionalItem(mockMenuItems[0]);
    });
    expect(result.current.additionalItems).toHaveLength(1);

    const dummyOrder = { id: "order-99", orderNumber: "1099" } as Order;
    act(() => {
      result.current.setEditingOrder(dummyOrder);
    });
    expect(result.current.editingOrder).toBe(dummyOrder);
    expect(result.current.additionalItems).toEqual([]);
  });

  it("should handleAddItems successfully and trigger notification and callback", async () => {
    const mockFetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ success: true }),
    });
    global.fetch = mockFetch;

    const { result } = renderHook(() =>
      usePOSCart(mockMenuItems, mockRefreshOrders),
    );

    const dummyOrder = { id: "order-123", orderNumber: "1123" } as Order;
    act(() => {
      result.current.setEditingOrder(dummyOrder);
      result.current.quickAddAdditionalItem(mockMenuItems[0]);
    });

    const onSuccess = vi.fn();
    await act(async () => {
      await result.current.handleAddItems(undefined, onSuccess);
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "/api/orders/order-123",
      expect.objectContaining({
        method: "PATCH",
        body: expect.stringContaining('"menuItemId":"1"'),
      }),
    );
    expect(mockRefreshOrders).toHaveBeenCalled();
    expect(result.current.editingOrder).toBeNull();
    expect(result.current.additionalItems).toEqual([]);
    expect(result.current.addItemsSuccessNotification).toEqual({
      order: dummyOrder,
      orderNumber: "1123",
    });
    expect(onSuccess).toHaveBeenCalledWith(dummyOrder);
  });
});
