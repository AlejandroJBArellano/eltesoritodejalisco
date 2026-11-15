import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MenuFilters } from "../MenuFilters";
import { useMenuCategories } from "../../hooks/useMenuCategories";

vi.mock("../../hooks/useMenuCategories", () => ({
  useMenuCategories: vi.fn(),
}));

describe("MenuFilters", () => {
  const onSearchChange = vi.fn();
  const onCategoryChange = vi.fn();
  const onAvailabilityChange = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMenuCategories).mockReturnValue({
      menuCategories: [
        { id: "2", name: "Bebidas", sort_order: 20, is_active: true },
        { id: "1", name: "Tacos", sort_order: 10, is_active: true },
        { id: "3", name: "Oculta", sort_order: 30, is_active: false },
      ],
    } as any);
  });

  it("renders sorted active categories and forwards search, category, and availability changes", () => {
    render(
      <MenuFilters
        searchQuery="taco"
        categoryFilter="all"
        availabilityFilter="all"
        onSearchChange={onSearchChange}
        onCategoryChange={onCategoryChange}
        onAvailabilityChange={onAvailabilityChange}
      />,
    );

    const options = screen
      .getAllByRole("option")
      .map((opt) => opt.textContent);
    expect(options).toContain("Tacos");
    expect(options).toContain("Bebidas");
    expect(options).not.toContain("Oculta");

    const input = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(input, { target: { value: "pastor" } });
    expect(onSearchChange).toHaveBeenCalledWith("pastor");

    const form = input.closest("form")!;
    fireEvent.submit(form);
    expect(onSearchChange).toHaveBeenCalledWith("taco");

    const [catSelect, availSelect] = screen.getAllByRole("combobox");
    fireEvent.change(catSelect, { target: { value: "Tacos" } });
    expect(onCategoryChange).toHaveBeenCalledWith("Tacos");

    fireEvent.change(availSelect, { target: { value: "unavailable" } });
    expect(onAvailabilityChange).toHaveBeenCalledWith("unavailable");
  });
});
