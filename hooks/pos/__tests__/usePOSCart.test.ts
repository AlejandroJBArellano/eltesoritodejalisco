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
});
