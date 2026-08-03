import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { POSMenuGrid } from "../POSMenuGrid";
import { MenuItem } from "@/types/pos";

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

describe("POSMenuGrid Component", () => {
  it("should render catalog title and menu items correctly", () => {
    const handleGridItemClick = vi.fn();
    render(
      <POSMenuGrid
        searchQuery=""
        setSearchQuery={vi.fn()}
        activeCategory="ALL"
        setActiveCategory={vi.fn()}
        categories={mockCategories}
        filteredMenuItems={mockItems}
        handleGridItemClick={handleGridItemClick}
      />,
    );

    expect(screen.getByText("Catálogo de Productos")).toBeInTheDocument();
    expect(screen.getByText("Taco de Birria")).toBeInTheDocument();
    expect(screen.getByText("$30.00")).toBeInTheDocument();
    expect(screen.getByText("Agua de Horchata")).toBeInTheDocument();
  });

  it("should trigger item click callback when clicking a product card", () => {
    const handleGridItemClick = vi.fn();
    render(
      <POSMenuGrid
        searchQuery=""
        setSearchQuery={vi.fn()}
        activeCategory="ALL"
        setActiveCategory={vi.fn()}
        categories={mockCategories}
        filteredMenuItems={mockItems}
        handleGridItemClick={handleGridItemClick}
      />,
    );

    const tacoCard = screen.getByText("Taco de Birria").closest("button");
    expect(tacoCard).toBeInTheDocument();

    if (tacoCard) {
      fireEvent.click(tacoCard);
      expect(handleGridItemClick).toHaveBeenCalledWith(mockItems[0]);
    }
  });

  it("should call setSearchQuery on search input change", () => {
    const setSearchQuery = vi.fn();
    render(
      <POSMenuGrid
        searchQuery=""
        setSearchQuery={setSearchQuery}
        activeCategory="ALL"
        setActiveCategory={vi.fn()}
        categories={mockCategories}
        filteredMenuItems={mockItems}
        handleGridItemClick={vi.fn()}
      />,
    );

    const searchInput = screen.getByPlaceholderText(/Buscar producto/i);
    fireEvent.change(searchInput, { target: { value: "Birria" } });
    expect(setSearchQuery).toHaveBeenCalledWith("Birria");
  });
});
