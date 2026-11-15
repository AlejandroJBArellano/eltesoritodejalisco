import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MenuTable } from "../MenuTable";
import { useMenuItems } from "../../hooks/useMenuItems";
import { useRecipes } from "../../hooks/useRecipes";
import { MenuItem } from "../../types";

vi.mock("next/image", () => ({
  default: (props: React.ImgHTMLAttributes<HTMLImageElement> & { unoptimized?: boolean }) => {
    const { unoptimized, ...rest } = props;
    // eslint-disable-next-line @next/next/no-img-element
    return <img data-unoptimized={String(Boolean(unoptimized))} {...rest} />;
  },
}));

vi.mock("../../hooks/useMenuItems", () => ({
  useMenuItems: vi.fn(),
}));

vi.mock("../../hooks/useRecipes", () => ({
  useRecipes: vi.fn(),
}));

describe("MenuTable", () => {
  const openEditProductModal = vi.fn();
  const handleDelete = vi.fn();
  const openRecipeModal = vi.fn();
  const onSortChange = vi.fn();
  const onPageChange = vi.fn();
  const onPageSizeChange = vi.fn();
  const onCustomize = vi.fn();

  const items: MenuItem[] = [
    {
      id: "m1",
      name: "Taco Pastor",
      description: "Con piña",
      price: 25,
      category: "Tacos",
      imageUrl: "https://example.com/taco.webp",
      isAvailable: true,
      customizationGroups: 2,
    },
    {
      id: "m2",
      name: "Agua Jamaica",
      description: null,
      price: 30,
      category: null,
      imageUrl: null,
      isAvailable: false,
      customizationGroups: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useMenuItems).mockReturnValue({
      openEditProductModal,
      handleDelete,
      deleteArmedItemId: null,
    } as any);
    vi.mocked(useRecipes).mockReturnValue({
      openRecipeModal,
    } as any);
  });

  it("renders unoptimized images, customization badges, and handles sorting & actions", () => {
    render(
      <MenuTable
        paginatedItems={items}
        totalPages={2}
        totalItems={12}
        currentPage={1}
        pageSize={10}
        sortField="name"
        sortDirection="asc"
        onSortChange={onSortChange}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        onCustomize={onCustomize}
      />,
    );

    const img = screen.getByAltText("Taco Pastor");
    expect(img).toHaveAttribute("data-unoptimized", "true");
    expect(screen.getByText(/Personalizable · 2 grupos/i)).toBeInTheDocument();
    expect(screen.getByText("Sin categoría")).toBeInTheDocument();

    // Toggle active sort column asc -> desc
    fireEvent.click(screen.getByText("Nombre"));
    expect(onSortChange).toHaveBeenCalledWith("name", "desc");

    // Sort different column -> asc
    fireEvent.click(screen.getByText("Precio"));
    expect(onSortChange).toHaveBeenCalledWith("price", "asc");

    // Row actions
    const editButtons = screen.getAllByTitle("Editar Producto");
    fireEvent.click(editButtons[0]);
    expect(openEditProductModal).toHaveBeenCalledWith(items[0]);

    const recipeButtons = screen.getAllByTitle("Gestionar Receta");
    fireEvent.click(recipeButtons[0]);
    expect(openRecipeModal).toHaveBeenCalledWith("m1");

    const customButtons = screen.getAllByTitle("Personalizar platillo");
    fireEvent.click(customButtons[0]);
    expect(onCustomize).toHaveBeenCalledWith(items[0]);

    const deleteButtons = screen.getAllByTitle("Eliminar Producto");
    fireEvent.click(deleteButtons[0]);
    expect(handleDelete).toHaveBeenCalledWith("m1");

    // Pagination controls
    fireEvent.click(screen.getByRole("button", { name: /siguiente/i }));
    expect(onPageChange).toHaveBeenCalledWith(2);

    fireEvent.change(screen.getByRole("combobox"), { target: { value: "20" } });
    expect(onPageSizeChange).toHaveBeenCalledWith(20);
  });

  it("renders empty state when no paginatedItems", () => {
    render(
      <MenuTable
        paginatedItems={[]}
        totalPages={1}
        totalItems={0}
        currentPage={1}
        pageSize={10}
        sortField="price"
        sortDirection="desc"
        onSortChange={onSortChange}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    expect(
      screen.getByText("No se encontraron productos en el menú."),
    ).toBeInTheDocument();
  });

  it("renders singular customization badge and delete confirmation state", () => {
    vi.mocked(useMenuItems).mockReturnValue({
      openEditProductModal,
      handleDelete,
      deleteArmedItemId: "m1",
    } as any);

    render(
      <MenuTable
        paginatedItems={[{ ...items[0], customizationGroups: 1 }]}
        totalPages={1}
        totalItems={1}
        currentPage={1}
        pageSize={10}
        sortField="price"
        sortDirection="asc"
        onSortChange={onSortChange}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
      />,
    );

    expect(screen.getByText(/Personalizable · 1 grupo$/i)).toBeInTheDocument();
    expect(screen.getByTitle("Confirmar eliminación")).toHaveTextContent(
      "¿Seguro?",
    );
  });
});
