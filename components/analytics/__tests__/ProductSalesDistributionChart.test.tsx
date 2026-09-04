import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ProductSalesDistributionChart } from "../ProductSalesDistributionChart";

describe("ProductSalesDistributionChart Component", () => {
  it("renders summary badges, category select, metric buttons and chart", () => {
    const handleSelectCategory = vi.fn();
    const handleSelectMetric = vi.fn();
    const mockProducts = [
      { id: "1", name: "Latte Frío", category: "Bebidas", quantity: 45, revenue: 2925 },
      { id: "2", name: "Croissant Mantequilla", category: "Panadería", quantity: 20, revenue: 1000 },
    ];

    render(
      <ProductSalesDistributionChart
        productChartData={mockProducts}
        selectedCategory="TODAS"
        onSelectCategory={handleSelectCategory}
        categoriesList={["TODAS", "Bebidas", "Panadería"]}
        productMetric="revenue"
        onSelectMetric={handleSelectMetric}
        totalCategoryRevenue={3925}
        totalCategoryQuantity={65}
      />,
    );

    expect(screen.getByText("Distribución de Ventas por Producto")).toBeInTheDocument();
    expect(screen.getByText("$3,925.00")).toBeInTheDocument();
    expect(screen.getByText("65 u.")).toBeInTheDocument();
    expect(screen.getAllByText("Latte Frío").length).toBeGreaterThanOrEqual(1);

    const categorySelect = screen.getByLabelText("Filtrar por categoría");
    fireEvent.change(categorySelect, { target: { value: "Bebidas" } });
    expect(handleSelectCategory).toHaveBeenCalledWith("Bebidas");

    const revenueBtn = screen.getByRole("button", { name: /\$ Ingresos/i });
    fireEvent.click(revenueBtn);
    expect(handleSelectMetric).toHaveBeenCalledWith("revenue");

    const unitsBtn = screen.getByRole("button", { name: /# Unidades/i });
    fireEvent.click(unitsBtn);
    expect(handleSelectMetric).toHaveBeenCalledWith("quantity");

    expect(screen.getByTestId("product-distribution-chart")).toBeInTheDocument();

    const productRow = screen.getAllByText("Latte Frío")[1]?.closest(".group");
    if (productRow) {
      fireEvent.mouseEnter(productRow);
      expect(screen.getByText("Ingresos: $2,925.00")).toBeInTheDocument();
      fireEvent.mouseLeave(productRow);
    }
  });

  it("renders empty state fallback when no products in selected category", () => {
    render(
      <ProductSalesDistributionChart
        productChartData={[]}
        selectedCategory="Postres"
        onSelectCategory={vi.fn()}
        categoriesList={["TODAS", "Postres"]}
        productMetric="quantity"
        onSelectMetric={vi.fn()}
        totalCategoryRevenue={0}
        totalCategoryQuantity={0}
      />,
    );

    expect(
      screen.getByText("No hay datos de productos en la categoría seleccionada."),
    ).toBeInTheDocument();
    expect(screen.getByText("N/A")).toBeInTheDocument();
  });
});
