import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CustomerAccountTicket } from "../CustomerAccountTicket";

const mockTenant = {
  id: "tenant-abc",
  slug: "tesorito",
  name: "El Tesorito de Jalisco",
  system_name: "TesoritoOS",
  rfc: "XAXX010101000",
  postal_code: "44100",
  regimen_fiscal: "601",
  ticket_footer_text: "Gracias por su preferencia",
};

vi.mock("@/components/TenantProvider", () => ({
  useTenant: () => mockTenant,
}));

describe("CustomerAccountTicket Component", () => {
  const mockCustomer = {
    id: "cust-1",
    name: "Carlos Mendoza",
    phone: "3312345678",
    email: "carlos@example.com",
  };

  const mockPendingNotes = [
    {
      id: "ord-1",
      orderNumber: "101",
      createdAt: new Date("2026-05-10T14:30:00Z"),
      total: 350.0,
      totalPaid: 100.0,
      remainingBalance: 250.0,
      notes: "Para llevar",
      items: [{ quantity: 2, name: "Orden Tacos", unitPrice: 175.0 }],
    },
    {
      id: "ord-2",
      orderNumber: "105",
      createdAt: "2026-05-12 18:00:00",
      total: 200.0,
      totalPaid: 0,
      remainingBalance: 200.0,
      notes: null,
      items: [{ quantity: 1, name: "Consomé", unitPrice: 200.0 }],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders header, fiscal info, customer and pending notes", () => {
    render(
      <CustomerAccountTicket
        customer={mockCustomer}
        pendingNotes={mockPendingNotes}
        totalDebt={450.0}
      />
    );

    expect(screen.getByText("EL TESORITO DE JALISCO")).toBeInTheDocument();
    expect(screen.getByText(/RFC: XAXX010101000/i)).toBeInTheDocument();
    expect(screen.getByText("ESTADO DE CUENTA")).toBeInTheDocument();
    expect(screen.getByText(/Carlos Mendoza/i)).toBeInTheDocument();
    expect(screen.getByText(/3312345678/i)).toBeInTheDocument();

    // Notes
    expect(screen.getByText("#101")).toBeInTheDocument();
    expect(screen.getByText("#105")).toBeInTheDocument();
    expect(screen.getByText("$350.00")).toBeInTheDocument();
    expect(screen.getByText("$250.00")).toBeInTheDocument();

    // Totals
    expect(screen.getByText("Total Notas: $550.00")).toBeInTheDocument();
    expect(screen.getByText("Total Abonado: $100.00")).toBeInTheDocument();
    expect(screen.getByText("SALDO DEUDOR: $450.00")).toBeInTheDocument();
    expect(screen.getByText("Gracias por su preferencia")).toBeInTheDocument();
  });

  it("renders last payment if provided", () => {
    const lastPayment = {
      amount: 100,
      method: "TRANSFER",
      createdAt: new Date("2026-05-11T12:00:00Z"),
    };

    render(
      <CustomerAccountTicket
        customer={mockCustomer}
        pendingNotes={mockPendingNotes}
        totalDebt={450.0}
        lastPayment={lastPayment}
      />
    );

    expect(screen.getByText("Último Abono Registrado")).toBeInTheDocument();
    expect(screen.getByText(/\$100\.00 \(TRANSFER\)/i)).toBeInTheDocument();
  });

  it("handles print button click", () => {
    const printSpy = vi.spyOn(window, "print").mockImplementation(() => {});

    render(
      <CustomerAccountTicket
        customer={mockCustomer}
        pendingNotes={mockPendingNotes}
        totalDebt={450.0}
      />
    );

    const printButton = screen.getByRole("button", {
      name: /Imprimir Estado de Cuenta/i,
    });
    fireEvent.click(printButton);

    expect(printSpy).toHaveBeenCalledTimes(1);
  });

  it("renders WhatsApp button with properly formatted link", () => {
    render(
      <CustomerAccountTicket
        customer={mockCustomer}
        pendingNotes={mockPendingNotes}
        totalDebt={450.0}
      />
    );

    const waLink = screen.getByRole("link", { name: /Enviar por WhatsApp/i });
    expect(waLink).toBeInTheDocument();
    expect(waLink.getAttribute("href")).toContain("wa.me/3312345678");
    expect(waLink.getAttribute("href")).toContain("Carlos%20Mendoza");
    expect(waLink.getAttribute("href")).toContain("450.00");
  });

  it("handles customer without phone without crashing and hides WhatsApp link", () => {
    const customerNoPhone = {
      id: "cust-2",
      name: "Pedro Sin Teléfono",
      phone: null,
    };

    render(
      <CustomerAccountTicket
        customer={customerNoPhone}
        pendingNotes={[]}
        totalDebt={0}
      />
    );

    expect(screen.getByText(/Pedro Sin Teléfono/i)).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /Enviar por WhatsApp/i })
    ).not.toBeInTheDocument();
    expect(screen.getByText("Sin notas pendientes")).toBeInTheDocument();
  });
});
