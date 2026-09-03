import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { AnalyticsBanner } from "../AnalyticsBanner";

describe("AnalyticsBanner Component", () => {
  it("renders banner copy and links to analytics views", () => {
    render(<AnalyticsBanner />);

    expect(screen.getByText("Analítica Visual Integrada")).toBeInTheDocument();
    expect(
      screen.getByText("Descubre Tendencias Gráficas y Patrones de Venta"),
    ).toBeInTheDocument();

    const salesLink = screen.getByRole("link", { name: /Tendencias y Productos/i });
    expect(salesLink).toHaveAttribute("href", "/analytics/sales");

    const hourlyLink = screen.getByRole("link", { name: /Horas Pico & Calor/i });
    expect(hourlyLink).toHaveAttribute("href", "/analytics/hourly");
  });
});
