import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { ReportsHeader } from "../ReportsHeader";

describe("ReportsHeader Component", () => {
  it("renders page title, period and action buttons", () => {
    render(
      <ReportsHeader
        period="7days"
        dailySalesData={[]}
        enrichedProductSales={[]}
      />,
    );

    expect(screen.getByText("Reportes & Balance")).toBeInTheDocument();
    expect(screen.getByText(/Últimos 7 días/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /Explorar Gráficas/i })).toHaveAttribute(
      "href",
      "/analytics/sales",
    );
    expect(screen.getByRole("link", { name: /Horas Pico/i })).toHaveAttribute(
      "href",
      "/analytics/hourly",
    );
    expect(screen.getByText(/Imprimir \/ PDF/i)).toBeInTheDocument();
  });

  it("calls window.print when print button is clicked", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});
    render(
      <ReportsHeader
        period="today"
        dailySalesData={[]}
        enrichedProductSales={[]}
      />,
    );

    const printBtn = screen.getByText(/Imprimir \/ PDF/i);
    printBtn.click();
    expect(printSpy).toHaveBeenCalled();
    printSpy.mockRestore();
  });
});
