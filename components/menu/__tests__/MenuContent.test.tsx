import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MenuContent } from "../MenuContent";
import { MenuItem } from "../types";

const routerRefreshMock = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({
    refresh: routerRefreshMock,
    push: vi.fn(),
  }),
}));

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    // eslint-disable-next-line @next/next/no-img-element
    <img {...props} />
  ),
}));

vi.mock("@/components/PageHeader", () => ({
  PageHeader: ({
    title,
    actions,
  }: {
    title: string;
    actions?: React.ReactNode;
  }) => (
    <header>
      <h1>{title}</h1>
      <div>{actions}</div>
    </header>
  ),
}));

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: () => ({
    hasPermission: () => true,
  }),
}));

vi.mock("../components/CategoriesPanel", () => ({
  CategoriesPanel: () => <div data-testid="categories-panel" />,
}));
vi.mock("../components/CategoryModal", () => ({
  CategoryModal: () => null,
}));
vi.mock("../components/IngredientModal", () => ({
  IngredientModal: () => null,
}));
vi.mock("../components/ProductModal", () => ({
  ProductModal: () => null,
}));
vi.mock("../components/RecipeModal", () => ({
  RecipeModal: () => null,
}));
vi.mock("../components/CustomizationEditorModal", () => ({
  CustomizationEditorModal: () => <div data-testid="customization-modal" />,
}));

const sampleItems: MenuItem[] = Array.from({ length: 12 }, (_, idx) => ({
  id: `item-${idx + 1}`,
  name:
    idx === 0
      ? "Agua Horchata"
      : idx === 1
        ? "Taco Pastor"
        : `Producto ${String(idx + 1).padStart(2, "0")}`,
  description: idx === 1 ? "Con piña" : "Clásico",
  price: (idx + 1) * 10,
  category: idx === 0 ? "Bebidas" : idx === 1 ? "Tacos" : null,
  imageUrl: null,
  isAvailable: idx % 2 === 0,
  customizationGroups: 0,
}));

describe("MenuContent client-side filtering, sorting, and pagination", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    window.history.replaceState(null, "", "/menu");
  });

  it("filters, sorts, paginates in memory without router.push, and updates URL via replaceState", () => {
    const replaceStateSpy = vi.spyOn(window.history, "replaceState");

    render(
      <MenuContent
        items={sampleItems}
        categories={["Bebidas", "Tacos"]}
        initialMenuCategories={[
          {
            id: "c1",
            name: "Bebidas",
            sort_order: 1,
            is_active: true,
            show_in_pickup: true,
          },
          {
            id: "c2",
            name: "Tacos",
            sort_order: 2,
            is_active: true,
            show_in_pickup: true,
          },
        ]}
        initialIngredients={[]}
        searchParams={{
          q: "",
          category: "all",
          availability: "all",
          sort: "name",
          direction: "asc",
          page: 1,
          pageSize: 10,
        }}
      />,
    );

    expect(screen.getByText("Catálogo de Menú (12)")).toBeInTheDocument();
    expect(screen.getByText("Agua Horchata")).toBeInTheDocument();
    expect(screen.queryByText("Taco Pastor")).not.toBeInTheDocument();

    // Go to page 2 in client memory
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(screen.getByText("Taco Pastor")).toBeInTheDocument();
    expect(replaceStateSpy).toHaveBeenCalledWith(null, "", "/menu?page=2");

    // Search filter resets page to 1 and filters by description/name
    const searchInput = screen.getByPlaceholderText(/buscar por nombre/i);
    fireEvent.change(searchInput, { target: { value: "piña" } });
    expect(screen.getByText("Catálogo de Menú (1)")).toBeInTheDocument();
    expect(screen.getByText("Taco Pastor")).toBeInTheDocument();

    // Clear search, filter by uncategorized & availability & sort by price desc
    fireEvent.change(searchInput, { target: { value: "" } });
    const selects = screen.getAllByRole("combobox");
    // [0] categoryFilter, [1] availabilityFilter, [2] pageSize
    fireEvent.change(selects[0], { target: { value: "uncategorized" } });
    expect(screen.getByText("Catálogo de Menú (10)")).toBeInTheDocument();

    fireEvent.change(selects[1], { target: { value: "unavailable" } });
    expect(screen.getByText("Catálogo de Menú (5)")).toBeInTheDocument();

    fireEvent.change(selects[0], { target: { value: "all" } });
    fireEvent.change(selects[1], { target: { value: "all" } });
    fireEvent.click(screen.getByText("Precio"));
    fireEvent.click(screen.getByText("Precio"));
    expect(screen.getByText("Producto 12")).toBeInTheDocument();

    // Sort by state and category as well
    fireEvent.click(screen.getByRole("button", { name: "Estado" }));
    fireEvent.click(screen.getByRole("button", { name: "Categoría" }));

    // Page size change works in memory
    fireEvent.change(selects[2], { target: { value: "20" } });
    expect(screen.getByText("Taco Pastor")).toBeInTheDocument();

    // Filter by named category and available items
    fireEvent.change(selects[0], { target: { value: "Bebidas" } });
    fireEvent.change(selects[1], { target: { value: "available" } });
    expect(screen.getByText("Catálogo de Menú (1)")).toBeInTheDocument();

    // Open customization modal
    fireEvent.click(screen.getByTitle("Personalizar platillo"));
    expect(screen.getByTestId("customization-modal")).toBeInTheDocument();

    // Refresh button invokes router.refresh()
    fireEvent.click(screen.getByText("Actualizar Lista"));
    expect(routerRefreshMock).toHaveBeenCalledTimes(1);

    replaceStateSpy.mockRestore();
  });
});
