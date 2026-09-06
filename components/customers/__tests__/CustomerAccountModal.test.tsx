import React from "react";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { CustomerAccountModal } from "../CustomerAccountModal";

const mockTenant = {
  id: "tenant-abc",
  name: "El Tesorito de Jalisco",
  system_name: "TesoritoOS",
  rfc: "XAXX010101000",
  postal_code: "44100",
  regimen_fiscal: "601",
  ticket_footer_text: "Gracias",
};

vi.mock("@/components/TenantProvider", () => ({
  useTenant: () => mockTenant,
}));

describe("CustomerAccountModal Component", () => {
  const mockCustomer = {
    id: "cust-1",
    name: "Ana Morales",
    phone: "3311223344",
    email: "ana@example.com",
    debt_balance: 380,
  };

  const mockStatementData = {
    customer: mockCustomer,
    totalDebt: 380,
    pendingNotes: [
      {
        id: "note-1",
        orderNumber: "201",
        createdAt: "2026-05-15T12:00:00Z",
        total: 250,
        totalPaid: 50,
        remainingBalance: 200,
        notes: null,
        items: [{ id: "it-1", quantity: 2, name: "Torta Ahogada", unitPrice: 125 }],
        payments: [{ id: "p-1", amount: 50, method: "CASH", createdAt: "2026-05-15T13:00:00Z" }],
      },
      {
        id: "note-2",
        orderNumber: "205",
        createdAt: "2026-05-16T14:00:00Z",
        total: 180,
        totalPaid: 0,
        remainingBalance: 180,
        notes: null,
        items: [{ id: "it-2", quantity: 1, name: "Agua Horchata", unitPrice: 180 }],
        payments: [],
      },
    ],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => mockStatementData,
    });
  });

  it("returns null when isOpen is false", () => {
    const { container } = render(
      <CustomerAccountModal
        isOpen={false}
        onClose={vi.fn()}
        customer={mockCustomer}
      />
    );
    expect(container).toBeEmptyDOMElement();
  });

  it("loads and displays customer statement, total debt and notes", async () => {
    render(
      <CustomerAccountModal
        isOpen={true}
        onClose={vi.fn()}
        customer={mockCustomer}
      />
    );

    expect(global.fetch).toHaveBeenCalledWith(
      "/api/customers/cust-1/account-statement"
    );

    expect(await screen.findByText(/Ana Morales/i)).toBeInTheDocument();
    expect(screen.getByText("$380.00")).toBeInTheDocument();
    expect(screen.getByText("2")).toBeInTheDocument(); // 2 notes count
    expect(screen.getByText("#201")).toBeInTheDocument();
    expect(screen.getByText("#205")).toBeInTheDocument();
  });

  it("switches to ticket tab and back to summary", async () => {
    render(
      <CustomerAccountModal
        isOpen={true}
        onClose={vi.fn()}
        customer={mockCustomer}
      />
    );

    await screen.findByText("#201");

    const ticketTab = screen.getByRole("button", { name: /Ticket 80mm/i });
    fireEvent.click(ticketTab);

    // Should display ticket container
    expect(screen.getByTestId("account-ticket-container")).toBeInTheDocument();

    const summaryTab = screen.getByRole("button", { name: /Resumen y Notas/i });
    fireEvent.click(summaryTab);

    expect(screen.queryByTestId("account-ticket-container")).not.toBeInTheDocument();
    expect(screen.getByText("Desglose de Notas Anteriores (2)")).toBeInTheDocument();
  });

  it("expands note to view product items and abonos", async () => {
    render(
      <CustomerAccountModal
        isOpen={true}
        onClose={vi.fn()}
        customer={mockCustomer}
      />
    );

    await screen.findByText("#201");

    const noteRow = screen.getByText("#201");
    fireEvent.click(noteRow);

    expect(await screen.findByText("2x Torta Ahogada")).toBeInTheDocument();
    expect(screen.getByText(/Total Original: \$250\.00/i)).toBeInTheDocument();
    expect(screen.getByText(/Abonado: \$50\.00/i)).toBeInTheDocument();
  });

  it("opens abono modal and triggers onAbonoSuccess when payment is registered", async () => {
    const onAbonoSuccess = vi.fn();

    render(
      <CustomerAccountModal
        isOpen={true}
        onClose={vi.fn()}
        customer={mockCustomer}
        onAbonoSuccess={onAbonoSuccess}
      />
    );

    await screen.findByText("$380.00");

    const abonoBtn = screen.getByRole("button", { name: /Registrar Abono/i });
    fireEvent.click(abonoBtn);

    expect(screen.getByText("Registrar Abono a Cuenta")).toBeInTheDocument();

    // Mock successful payment
    (global.fetch as any).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ success: true, appliedAmount: 100 }),
    });

    const amountInput = screen.getByLabelText(/Monto del Abono/i);
    fireEvent.change(amountInput, { target: { value: "100" } });

    const receivedInput = screen.getByLabelText(/Efectivo Recibido/i);
    fireEvent.change(receivedInput, { target: { value: "100" } });

    const submitBtn = screen.getByRole("button", { name: /Abonar \$100\.00/i });
    fireEvent.click(submitBtn);

    await waitFor(() => {
      expect(onAbonoSuccess).toHaveBeenCalled();
    });
  });

  it("handles fetch error gracefully", async () => {
    (global.fetch as any).mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: "Error de servidor" }),
    });

    render(
      <CustomerAccountModal
        isOpen={true}
        onClose={vi.fn()}
        customer={mockCustomer}
      />
    );

    expect(
      await screen.findByText("Error de servidor")
    ).toBeInTheDocument();
  });
});
