import { describe, it, expect, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { usePOSCheckout } from "../usePOSCheckout";
import { OrderStatus, OrderWithDetails } from "@/types";

vi.mock("@/components/TenantProvider", () => ({
  useTenant: () => ({
    id: "tenant-1",
    name: "El Tesorito de Jalisco",
  }),
}));

const mockRefreshOrders = vi.fn().mockResolvedValue([] as OrderWithDetails[]);

const mockOrder: OrderWithDetails = {
  id: "order-1",
  orderNumber: "1001",
  total: 100,
  subtotal: 100,
  tax: 0,
  status: OrderStatus.PENDING,
  customerId: "",
  source: "Otro",
  table: "Mesa 1",
  notes: "",
  orderItems: [
    {
      id: "item-1",
      orderId: "order-1",
      menuItemId: "menu-1",
      quantity: 2,
      unitPrice: 50,
      createdAt: new Date(),
      menuItem: {
        id: "menu-1",
        name: "Taco Pastor",
        price: 50,
        isAvailable: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
  createdAt: new Date(),
  updatedAt: new Date(),
};

describe("usePOSCheckout Hook", () => {
  it("should initialize default state correctly", () => {
    const { result } = renderHook(() => usePOSCheckout(mockRefreshOrders));

    expect(result.current.isSubmittingCheckout).toBe(false);
    expect(result.current.checkoutError).toBeNull();
    expect(result.current.checkoutOrder).toBeNull();
    expect(result.current.paymentMethod).toBe("CASH");
    expect(result.current.receivedAmount).toBe("");
    expect(result.current.tipType).toBe("NONE");
    expect(result.current.tipInput).toBe("");
    expect(result.current.tipAmountCalculated).toBe(0);
    expect(result.current.change).toBe(0);
  });

  it("should calculate PERCENTAGE tip correctly", () => {
    const { result } = renderHook(() => usePOSCheckout(mockRefreshOrders));

    act(() => {
      result.current.setCheckoutOrder(mockOrder);
      result.current.setTipType("PERCENTAGE");
      result.current.setTipInput("15");
    });

    // 15% of 100 is 15
    expect(result.current.tipAmountCalculated).toBe(15);
  });

  it("should calculate FIXED tip correctly", () => {
    const { result } = renderHook(() => usePOSCheckout(mockRefreshOrders));

    act(() => {
      result.current.setCheckoutOrder(mockOrder);
      result.current.setTipType("FIXED");
      result.current.setTipInput("25");
    });

    expect(result.current.tipAmountCalculated).toBe(25);
  });

  it("should calculate change correctly based on received amount and calculated tip", () => {
    const { result } = renderHook(() => usePOSCheckout(mockRefreshOrders));

    act(() => {
      result.current.setCheckoutOrder(mockOrder);
      result.current.setTipType("FIXED");
      result.current.setTipInput("10"); // total = 100 + 10 = 110
      result.current.setReceivedAmount("150");
    });

    // change should be 150 - 110 = 40
    expect(result.current.change).toBe(40);
  });

  it("should detect unusual tip and request confirmation before API call", async () => {
    const { result } = renderHook(() => usePOSCheckout(mockRefreshOrders));

    act(() => {
      result.current.setCheckoutOrder(mockOrder);
      result.current.setTipType("PERCENTAGE");
      result.current.setTipInput("35"); // 35% is > 30% limit
    });

    expect(result.current.unusualTipInfo).toBeNull();

    // Call checkout payment
    await act(async () => {
      await result.current.handleProcessPayment();
    });

    // Should NOT have processed (no fetch should be triggered, state is set)
    expect(result.current.unusualTipInfo).toEqual({
      amount: 35,
      percentage: 35,
    });
  });
});
