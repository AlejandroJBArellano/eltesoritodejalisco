import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { MenuStatsCards } from "../MenuStatsCards";

vi.mock("../../hooks/useMenuItems", () => ({
  useMenuItems: () => ({
    items: [
      { id: "1", name: "Tacos", isAvailable: true, category: "Comida" },
      { id: "2", name: "Agua", isAvailable: false, category: "Comida" },
      { id: "3", name: "Flan", isAvailable: true, category: "Comida" },
      { id: "4", name: "Soda", isAvailable: false, category: "Comida" },
    ],
  }),
}));

vi.mock("../../hooks/useMenuCategories", () => ({
  useMenuCategories: () => ({
    menuCategories: [{ id: "c1", name: "Comida" }],
  }),
}));

describe("MenuStatsCards Component", () => {
  it("renders item counts and categories accurately", () => {
    render(<MenuStatsCards />);

    expect(screen.getByText("Total Platillos")).toBeInTheDocument();
    expect(screen.getByText("4")).toBeInTheDocument();

    expect(screen.getByText("Platillos Activos")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument();

    expect(screen.getByText("Categorías Registradas")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
  });
});
