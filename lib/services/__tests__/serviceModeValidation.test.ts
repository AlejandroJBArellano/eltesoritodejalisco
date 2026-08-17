import { describe, it, expect } from "vitest";

interface MenuItemValidation {
  id: string;
  name: string;
  show_in_dine_in?: boolean;
  show_in_takeaway?: boolean;
}

function validateItemServiceMode(item: MenuItemValidation, type: "takeout" | "dine-in"): { valid: boolean; error?: string } {
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

describe("Service Mode Exclusivity Validation", () => {
  const exclusiveDineInItem: MenuItemValidation = {
    id: "item-1",
    name: "Cerveza de Barril en Tarro",
    show_in_dine_in: true,
    show_in_takeaway: false,
  };

  const exclusiveTakeoutItem: MenuItemValidation = {
    id: "item-2",
    name: "Paquete Familiar para Llevar",
    show_in_dine_in: false,
    show_in_takeaway: true,
  };

  const omniChannelItem: MenuItemValidation = {
    id: "item-3",
    name: "Tacos de Birria",
    show_in_dine_in: true,
    show_in_takeaway: true,
  };

  it("should reject exclusive dine-in item when ordering for takeout", () => {
    const result = validateItemServiceMode(exclusiveDineInItem, "takeout");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("solo está disponible para consumir en el restaurante");
  });

  it("should allow exclusive dine-in item when ordering for dine-in", () => {
    const result = validateItemServiceMode(exclusiveDineInItem, "dine-in");
    expect(result.valid).toBe(true);
  });

  it("should reject exclusive takeout item when ordering for dine-in", () => {
    const result = validateItemServiceMode(exclusiveTakeoutItem, "dine-in");
    expect(result.valid).toBe(false);
    expect(result.error).toContain("solo está disponible para llevar");
  });

  it("should allow exclusive takeout item when ordering for takeout", () => {
    const result = validateItemServiceMode(exclusiveTakeoutItem, "takeout");
    expect(result.valid).toBe(true);
  });

  it("should allow omni-channel item for both dine-in and takeout", () => {
    expect(validateItemServiceMode(omniChannelItem, "takeout").valid).toBe(true);
    expect(validateItemServiceMode(omniChannelItem, "dine-in").valid).toBe(true);
  });
});
