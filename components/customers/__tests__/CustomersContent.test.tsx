import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomersContent } from "../CustomersContent";
import * as exportLib from "@/lib/export";

describe("CustomersContent Component", () => {
  const mockCustomers = [
    {
      id: "cust-1",
      name: "Juan Pérez",
      phone: "3312345678",
      email: "juan@example.com",
      birthday: "1990-05-15",
      loyalty_points: 120,
      total_spend: 1500.5,
    },
    {
      id: "cust-2",
      name: "María Gómez",
      phone: "3398765432",
      email: "maria@example.com",
      birthday: "1988-11-20",
      loyalty_points: 80,
      total_spend: 920.0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("should render customer stats and table with customers", () => {
    render(<CustomersContent initialCustomers={mockCustomers} />);

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("María Gómez")).toBeInTheDocument();
    expect(screen.getByText("Directorio de Clientes (2)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument();
  });

  it("should filter customers with search query", async () => {
    const user = userEvent.setup();
    render(<CustomersContent initialCustomers={mockCustomers} />);

    const searchInput = screen.getByPlaceholderText(/Buscar cliente, teléfono o email.../i);
    await user.type(searchInput, "Juan");

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.queryByText("María Gómez")).not.toBeInTheDocument();
  });

  it("should trigger export with customer columns", async () => {
    const user = userEvent.setup();
    const exportCSVSpy = vi.spyOn(exportLib, "exportToCSV").mockImplementation(() => {});

    render(<CustomersContent initialCustomers={mockCustomers} />);

    await user.click(screen.getByRole("button", { name: /Exportar/i }));
    await user.click(screen.getByText("CSV (.csv)"));

    expect(exportCSVSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringContaining("clientes_"),
        data: expect.arrayContaining([
          expect.objectContaining({ name: "Juan Pérez" }),
          expect.objectContaining({ name: "María Gómez" }),
        ]),
      }),
    );
  });
});
