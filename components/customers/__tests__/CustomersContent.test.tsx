import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { CustomersContent } from "../CustomersContent";
import * as exportLib from "@/lib/export";
import { useOptionalUser } from "@/components/UserProvider";

const mockTenant = {
  id: "tenant-abc",
  name: "El Tesorito de Jalisco",
  system_name: "TesoritoOS",
};

vi.mock("@/components/TenantProvider", () => ({
  useTenant: () => mockTenant,
}));

vi.mock("@/components/UserProvider", () => ({
  useOptionalUser: vi.fn(),
}));

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
      debt_balance: 450.0,
      pending_orders_count: 2,
    },
    {
      id: "cust-2",
      name: "María Gómez",
      phone: "3398765432",
      email: "maria@example.com",
      birthday: "1988-11-20",
      loyalty_points: 80,
      total_spend: 920.0,
      debt_balance: 0,
      pending_orders_count: 0,
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "ADMIN",
      isAdmin: true,
      isWaiter: false,
      isChef: false,
      isAuthenticated: true,
    });
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ customers: mockCustomers }),
    });
  });

  it("should render customer stats including Total por Cobrar and table with customers", () => {
    render(<CustomersContent initialCustomers={mockCustomers} />);

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("María Gómez")).toBeInTheDocument();
    expect(screen.getByText("Directorio de Clientes (2)")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /Exportar/i })).toBeInTheDocument();

    // Total por Cobrar KPI y badge de tabla
    expect(screen.getByText("Total por Cobrar")).toBeInTheDocument();
    expect(screen.getAllByText("$450.00").length).toBeGreaterThanOrEqual(2);
    expect(screen.getByText("1 con deuda")).toBeInTheDocument();

    // Table Debt Badges
    expect(screen.getByText("Al corriente")).toBeInTheDocument();
  });

  it("should filter customers with 'Solo con Deuda' toggle", () => {
    render(<CustomersContent initialCustomers={mockCustomers} />);

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.getByText("María Gómez")).toBeInTheDocument();

    const soloConDeudaBtn = screen.getByRole("button", { name: /Solo con Deuda/i });
    fireEvent.click(soloConDeudaBtn);

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.queryByText("María Gómez")).not.toBeInTheDocument();

    // Toggle off
    fireEvent.click(soloConDeudaBtn);
    expect(screen.getByText("María Gómez")).toBeInTheDocument();
  });

  it("should open Estado de Cuenta modal when clicking action button", () => {
    render(<CustomersContent initialCustomers={mockCustomers} />);

    const accountBtn = screen.getByTestId("account-statement-btn-cust-1");
    fireEvent.click(accountBtn);

    expect(screen.getByText("Estado de Cuenta")).toBeInTheDocument();
    expect(screen.getByText(/Cliente: Juan Pérez/i)).toBeInTheDocument();
  });

  it("should filter customers with search query", async () => {
    const user = userEvent.setup();
    render(<CustomersContent initialCustomers={mockCustomers} />);

    const searchInput = screen.getByPlaceholderText(/Buscar cliente, teléfono o email.../i);
    await user.type(searchInput, "Juan");

    expect(screen.getByText("Juan Pérez")).toBeInTheDocument();
    expect(screen.queryByText("María Gómez")).not.toBeInTheDocument();
  });

  it("should trigger export with customer columns including Saldo Deudor", async () => {
    const user = userEvent.setup();
    const exportCSVSpy = vi.spyOn(exportLib, "exportToCSV").mockImplementation(() => {});

    render(<CustomersContent initialCustomers={mockCustomers} />);

    await user.click(screen.getByRole("button", { name: /Exportar/i }));
    await user.click(screen.getByText("CSV (.csv)"));

    expect(exportCSVSpy).toHaveBeenCalledWith(
      expect.objectContaining({
        filename: expect.stringContaining("clientes_"),
        data: expect.arrayContaining([
          expect.objectContaining({ name: "Juan Pérez", debt_balance: 450 }),
          expect.objectContaining({ name: "María Gómez", debt_balance: 0 }),
        ]),
      }),
    );
  });

  it("should open WhatsApp modal when clicking WhatsApp action button", () => {
    render(<CustomersContent initialCustomers={mockCustomers} />);

    const waBtn = screen.getByTestId("whatsapp-btn-cust-1");
    fireEvent.click(waBtn);

    expect(screen.getByText("Acciones Rápidas WhatsApp")).toBeInTheDocument();
    expect(screen.getByText(/Cliente: Juan Pérez/i)).toBeInTheDocument();
  });

  it("should hide delete customer button when user is a waiter", () => {
    vi.mocked(useOptionalUser).mockReturnValue({
      profile: null,
      role: "WAITER",
      isAdmin: false,
      isWaiter: true,
      isChef: false,
      isAuthenticated: true,
    });

    render(<CustomersContent initialCustomers={mockCustomers} />);

    expect(screen.queryByTitle("Eliminar Cliente")).not.toBeInTheDocument();
  });

  it("should render delete customer button when user is admin or not waiter", () => {
    render(<CustomersContent initialCustomers={mockCustomers} />);

    expect(screen.getAllByTitle("Eliminar Cliente").length).toBe(2);
  });
});

