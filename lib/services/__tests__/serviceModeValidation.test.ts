import { describe, it, expect } from "vitest";

interface MenuItemValidation {
  id: string;
  name: string;
  price: number;
  is_available?: boolean;
  show_in_dine_in?: boolean;
  show_in_takeaway?: boolean;
}

function validateItemAvailabilityAndServiceMode(
  item: MenuItemValidation,
  type: "takeout" | "dine-in",
): { valid: boolean; error?: string } {
  if (item.is_available === false) {
    return {
      valid: false,
      error: `El producto "${item.name}" está agotado o no disponible en este momento`,
    };
  }

  if (type === "takeout" && item.show_in_takeaway === false) {
    return {
      valid: false,
      error: `El producto "${item.name}" solo está disponible para consumir en el restaurante`,
    };
  }

  if (type === "dine-in" && item.show_in_dine_in === false) {
    return {
      valid: false,
      error: `El producto "${item.name}" solo está disponible para llevar`,
    };
  }

  return { valid: true };
}

function sanitizeTipAmount(tipAmount: unknown): number {
  const rawTip = Number(tipAmount);
  return Number.isFinite(rawTip)
    ? Math.max(0, Math.min(Math.round(rawTip * 100) / 100, 10000))
    : 0;
}

interface CartItem {
  menuItemId: string;
  name: string;
  price: number;
  quantity: number;
}

function syncCartPricesAndPurgeObsolete(
  cart: CartItem[],
  availableItems: MenuItemValidation[],
): CartItem[] {
  const availableMap = new Map(availableItems.map((i) => [i.id, i]));
  const updatedCart: CartItem[] = [];

  for (const cartItem of cart) {
    const freshItem = availableMap.get(cartItem.menuItemId);
    if (!freshItem || freshItem.is_available === false) {
      // Obsolete or unavailable item is purged
      continue;
    }
    updatedCart.push({
      ...cartItem,
      name: freshItem.name,
      price: freshItem.price,
    });
  }

  return updatedCart;
}

describe("Service Mode Exclusivity Validation", () => {
  const exclusiveDineInItem: MenuItemValidation = {
    id: "item-1",
    name: "Cerveza de Barril en Tarro",
    price: 60,
    is_available: true,
    show_in_dine_in: true,
    show_in_takeaway: false,
  };

  const exclusiveTakeoutItem: MenuItemValidation = {
    id: "item-2",
    name: "Paquete Familiar para Llevar",
    price: 250,
    is_available: true,
    show_in_dine_in: false,
    show_in_takeaway: true,
  };

  const omniChannelItem: MenuItemValidation = {
    id: "item-3",
    name: "Tacos de Birria",
    price: 120,
    is_available: true,
    show_in_dine_in: true,
    show_in_takeaway: true,
  };

  const unavailableItem: MenuItemValidation = {
    id: "item-4",
    name: "Postre Especial Agotado",
    price: 80,
    is_available: false,
    show_in_dine_in: true,
    show_in_takeaway: true,
  };

  it("should reject unavailable (sold out) item regardless of service mode", () => {
    const takeoutResult = validateItemAvailabilityAndServiceMode(unavailableItem, "takeout");
    expect(takeoutResult.valid).toBe(false);
    expect(takeoutResult.error).toContain("está agotado o no disponible");

    const dineInResult = validateItemAvailabilityAndServiceMode(unavailableItem, "dine-in");
    expect(dineInResult.valid).toBe(false);
    expect(dineInResult.error).toContain("está agotado o no disponible");
  });

  it("should reject exclusive dine-in item when ordering for takeout", () => {
    const result = validateItemAvailabilityAndServiceMode(exclusiveDineInItem, "takeout");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("solo está disponible para consumir en el restaurante");
  });

  it("should allow exclusive dine-in item when ordering for dine-in", () => {
    const result = validateItemAvailabilityAndServiceMode(exclusiveDineInItem, "dine-in");
    expect(result.valid).toBe(true);
  });

  it("should reject exclusive takeout item when ordering for dine-in", () => {
    const result = validateItemAvailabilityAndServiceMode(exclusiveTakeoutItem, "dine-in");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("solo está disponible para llevar");
  });

  it("should allow exclusive takeout item when ordering for takeout", () => {
    const result = validateItemAvailabilityAndServiceMode(exclusiveTakeoutItem, "takeout");
    expect(result.valid).toBe(true);
  });

  it("should allow omni-channel item for both dine-in and takeout", () => {
    expect(validateItemAvailabilityAndServiceMode(omniChannelItem, "takeout").valid).toBe(true);
    expect(validateItemAvailabilityAndServiceMode(omniChannelItem, "dine-in").valid).toBe(true);
  });
});

describe("Tip Amount Sanitization", () => {
  it("should clamp negative tips to 0", () => {
    expect(sanitizeTipAmount(-50)).toBe(0);
    expect(sanitizeTipAmount("-10.50")).toBe(0);
  });

  it("should sanitize valid positive tips", () => {
    expect(sanitizeTipAmount(25)).toBe(25);
    expect(sanitizeTipAmount("15.75")).toBe(15.75);
    expect(sanitizeTipAmount(15.999)).toBe(16);
  });

  it("should fallback to 0 for invalid non-numeric inputs", () => {
    expect(sanitizeTipAmount(null)).toBe(0);
    expect(sanitizeTipAmount(undefined)).toBe(0);
    expect(sanitizeTipAmount("abc")).toBe(0);
    expect(sanitizeTipAmount(NaN)).toBe(0);
  });

  it("should clamp excessively large tips to maximum limit", () => {
    expect(sanitizeTipAmount(999999)).toBe(10000);
  });
});

describe("Silent Cart Price Sync and Stale Item Purge", () => {
  it("should silently update prices and names when menu items change in database", () => {
    const initialCart: CartItem[] = [
      { menuItemId: "item-1", name: "Tacos de Birria", price: 100, quantity: 2 },
    ];
    const freshMenuItems: MenuItemValidation[] = [
      { id: "item-1", name: "Tacos de Birria Suprema", price: 120, is_available: true },
    ];

    const synced = syncCartPricesAndPurgeObsolete(initialCart, freshMenuItems);
    expect(synced).toHaveLength(1);
    expect(synced[0].price).toBe(120);
    expect(synced[0].name).toBe("Tacos de Birria Suprema");
    expect(synced[0].quantity).toBe(2);
  });

  it("should purge items from cart if deleted or marked is_available = false in database", () => {
    const initialCart: CartItem[] = [
      { menuItemId: "item-1", name: "Tacos de Birria", price: 100, quantity: 2 },
      { menuItemId: "item-deleted", name: "Platillo Antiguo Eliminado", price: 50, quantity: 1 },
      { menuItemId: "item-unavailable", name: "Postre Agotado", price: 40, quantity: 1 },
    ];
    const freshMenuItems: MenuItemValidation[] = [
      { id: "item-1", name: "Tacos de Birria", price: 100, is_available: true },
      { id: "item-unavailable", name: "Postre Agotado", price: 40, is_available: false },
    ];

    const synced = syncCartPricesAndPurgeObsolete(initialCart, freshMenuItems);
    expect(synced).toHaveLength(1);
    expect(synced[0].menuItemId).toBe("item-1");
  });
});
