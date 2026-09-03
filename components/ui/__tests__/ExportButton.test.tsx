import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportButton } from "../ExportButton";
import * as exportLib from "@/lib/export";

describe("ExportButton Component", () => {
  type MockItem = { id: string; name: string; stock: number; price: number };

  const mockData: MockItem[] = [
    { id: "1", name: "Cerveza Corona", stock: 24, price: 35.0 },
    { id: "2", name: "Tacos al Pastor", stock: 100, price: 20.0 },
  ];

  const mockColumns = [
    { header: "Producto", key: "name" as const },
    { header: "Stock", key: "stock" as const },
    {
      header: "Precio",
      accessor: (item: MockItem) => `$${item.price.toFixed(2)}`,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render with default label 'Exportar'", () => {
    render(
      <ExportButton
        data={mockData}
        columns={mockColumns}
        filename="productos"
      />,
    );

    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument();
  });

  it("should render with custom label and variant", () => {
    render(
      <ExportButton
        data={mockData}
        columns={mockColumns}
        filename="productos"
        label="Descargar Reporte"
        variant="primary"
      />,
    );

    expect(
      screen.getByRole("button", { name: /Descargar Reporte/i }),
    ).toBeInTheDocument();
  });

  it("should open and close the dropdown when clicking the button", async () => {
    const user = userEvent.setup();
    render(
      <ExportButton
        data={mockData}
        columns={mockColumns}
        filename="productos"
      />,
    );

    const button = screen.getByRole("button", { name: /Exportar/i });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();

    // Click to open
    await user.click(button);
    expect(screen.getByRole("menu")).toBeInTheDocument();
    expect(screen.getByText("Excel (.xls)")).toBeInTheDocument();
    expect(screen.getByText("CSV (.csv)")).toBeInTheDocument();
    expect(screen.getByText(/2 filas/i)).toBeInTheDocument();

    // Click to close
    await user.click(button);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should close dropdown when pressing Escape", async () => {
    const user = userEvent.setup();
    render(
      <ExportButton
        data={mockData}
        columns={mockColumns}
        filename="productos"
      />,
    );

    const button = screen.getByRole("button", { name: /Exportar/i });
    await user.click(button);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Enter" });
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.keyDown(document, { key: "Escape" });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should close dropdown when clicking outside", async () => {
    const user = userEvent.setup();
    render(
      <div>
        <div data-testid="outside">Afuera</div>
        <ExportButton
          data={mockData}
          columns={mockColumns}
          filename="productos"
        />
      </div>,
    );

    const button = screen.getByRole("button", { name: /Exportar/i });
    await user.click(button);
    expect(screen.getByRole("menu")).toBeInTheDocument();

    fireEvent.mouseDown(screen.getByTestId("outside"));
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should trigger exportToCSV when CSV option is clicked", async () => {
    const user = userEvent.setup();
    const exportCSVSpy = vi.spyOn(exportLib, "exportToCSV").mockImplementation(() => {});

    render(
      <ExportButton
        data={mockData}
        columns={mockColumns}
        filename="inventario_2026"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Exportar/i }));
    await user.click(screen.getByText("CSV (.csv)"));

    expect(exportCSVSpy).toHaveBeenCalledWith({
      filename: "inventario_2026",
      columns: mockColumns,
      data: mockData,
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should trigger exportToExcel with resolved filename function and custom sheet name", async () => {
    const user = userEvent.setup();
    const exportExcelSpy = vi.spyOn(exportLib, "exportToExcel").mockImplementation(() => {});

    render(
      <ExportButton
        data={mockData}
        columns={mockColumns}
        filename={() => "clientes_dinamico"}
        sheetName="MisClientes"
        align="left"
      />,
    );

    await user.click(screen.getByRole("button", { name: /Exportar/i }));
    await user.click(screen.getByText("Excel (.xls)"));

    expect(exportExcelSpy).toHaveBeenCalledWith({
      filename: "clientes_dinamico",
      columns: mockColumns,
      data: mockData,
      sheetName: "MisClientes",
    });
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });

  it("should be disabled when disabled prop is true", async () => {
    const user = userEvent.setup();
    render(
      <ExportButton
        data={mockData}
        columns={mockColumns}
        filename="productos"
        disabled={true}
      />,
    );

    const button = screen.getByRole("button", { name: /Exportar/i });
    expect(button).toBeDisabled();

    await user.click(button);
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
  });
});
