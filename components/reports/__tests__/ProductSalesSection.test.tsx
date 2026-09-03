import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProductSalesSection } from "../ProductSalesSection";

describe("ProductSalesSection Component", () => {
  it("renders product table rows and top selling cards", () => {
    const mockProducts = [
      {
        id: "p1",
        name: "Capuchino Vainilla",
        category: "Cafetería",
        quantity: 50,
        revenue: 3250,
        rank: 1,
        averageUnitPrice: 65,
        percentageOfTotal: 65,
      },
      {
        id: "p2",
        name: "Panqué de Limón",
        category: "Repostería",
        quantity: 35,
        revenue: 1750,
        rank: 2,
        averageUnitPrice: 50,
        percentageOfTotal: 35,
      },
    ];

    const mockTopSelling = [
      { name: "Capuchino Vainilla", quantity: 50, revenue: 3250 },
      { name: "Panqué de Limón", quantity: 35, revenue: 1750 },
    ];

    render(
      <ProductSalesSection
        enrichedProductSales={mockProducts}
        topSellingItems={mockTopSelling}
        period="7days"
      />,
    );

    expect(
      screen.getByText("Ventas por Producto (Detallado)"),
    ).toBeInTheDocument();
    expect(screen.getAllByText("Capuchino Vainilla").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("Cafetería")).toBeInTheDocument();
    expect(screen.getAllByText("$3250.00").length).toBeGreaterThanOrEqual(1);

    expect(
      screen.getByText("Top Productos Más Vendidos"),
    ).toBeInTheDocument();
    expect(screen.getByText("50 vendidos")).toBeInTheDocument();
  });

  it("renders empty state fallbacks when no products exist", () => {
    render(
      <ProductSalesSection
        enrichedProductSales={[]}
        topSellingItems={[]}
        period="today"
      />,
    );

    expect(
      screen.getByText("No hay ventas registradas en el período."),
    ).toBeInTheDocument();
    expect(
      screen.getByText("No hay ventas registradas aún."),
    ).toBeInTheDocument();
  });
});
