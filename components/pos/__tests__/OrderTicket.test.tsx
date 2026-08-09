import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderTicket } from "../OrderTicket";
import { OrderWithDetails, OrderStatus, PaymentMethod } from "@/types";

// Mock useTenant
vi.mock("@/components/TenantProvider", () => ({
  useTenant: () => ({
    id: "tenant-abc",
    name: "El Tesorito de Jalisco",
    system_name: "TesoritoOS",
    rfc: "XAXX010101000",
    postal_code: "44100",
    regimen_fiscal: "601",
  }),
}));

const mockOrder: OrderWithDetails = {
  id: "order-123",
  orderNumber: "1050",
  source: "POS",
  status: OrderStatus.PENDING,
  table: "Mesa 4",
  notes: "Sin picante",
  subtotal: 100,
  tax: 16,
  total: 116,
  createdAt: new Date("2026-08-08T20:00:00Z"),
  updatedAt: new Date("2026-08-08T20:00:00Z"),
  pickupTime: null,
  orderItems: [
    {
      id: "item-1",
      orderId: "order-123",
      menuItemId: "menu-1",
      quantity: 1,
      unitPrice: 116,
      status: OrderStatus.PENDING,
      createdAt: new Date(),
      menuItem: {
        id: "menu-1",
        name: "Taco Especial",
        price: 116,
        isAvailable: true,
        category: "TACOS",
        createdAt: new Date(),
        updatedAt: new Date(),
      },
    },
  ],
  payments: [
    {
      id: "payment-1",
      orderId: "order-123",
      amount: 136,
      tipAmount: 20,
      method: PaymentMethod.CASH,
      createdAt: new Date(),
    },
  ],
};

describe("OrderTicket Component", () => {
  it("should render order receipt layout correctly", () => {
    render(<OrderTicket order={mockOrder} />);

    // Business info
    expect(screen.getByText("EL TESORITO DE JALISCO")).toBeInTheDocument();
    expect(screen.getByText("RFC: XAXX010101000")).toBeInTheDocument();
    expect(screen.getByText("C.P.: 44100")).toBeInTheDocument();
    expect(screen.getByText("Régimen: 601")).toBeInTheDocument();

    // Folio & Order details
    expect(screen.getByText("FOLIO: #1050")).toBeInTheDocument();
    expect(screen.getByText("MESA: Mesa 4")).toBeInTheDocument();

    // Order items
    expect(screen.getByText("Taco Especial")).toBeInTheDocument();
    expect(screen.getByText("1")).toBeInTheDocument();
    expect(screen.getByText("$116.00")).toBeInTheDocument();
  });

  it("should calculate and render subtotal, IVA, and totals correctly", () => {
    render(<OrderTicket order={mockOrder} />);

    // Subtotal (116 / 1.16 = 100.00)
    expect(screen.getByText("SUBTOTAL: $100.00")).toBeInTheDocument();
    
    // IVA (116 - 100 = 16.00)
    expect(screen.getByText("IVA (16%): $16.00")).toBeInTheDocument();

    // Total Venta (116.00)
    expect(screen.getByText("TOTAL VENTA: $116.00")).toBeInTheDocument();

    // Propina (20.00)
    expect(screen.getByText("PROPINA: $20.00")).toBeInTheDocument();

    // Pago Total (116.00 + 20.00 = 136.00)
    expect(screen.getByText("PAGO TOTAL: $136.00")).toBeInTheDocument();
  });

  it("should render the Powered by Kittn promotion with the correct QR code redirect URL", () => {
    render(<OrderTicket order={mockOrder} />);

    // Powered by Kittn text elements
    expect(screen.getByText(/Powered by Kittn/i)).toBeInTheDocument();
    expect(screen.getByText(/Get Yours/i)).toBeInTheDocument();

    // QR Code assertions
    const qrCode = screen.getByTestId("qr-code");
    expect(qrCode).toBeInTheDocument();
    expect(qrCode.tagName.toLowerCase()).toBe("img");
    expect(qrCode.getAttribute("width")).toBe("80");
    expect(qrCode.getAttribute("height")).toBe("80");
    
    // Check that the URL encodes the order-id and tenant-id as query params and matches the QR Code API
    const expectedUrl = "https://trykittn.com?ref=pos_order-123_tenant-abc";
    const expectedSrc = `https://api.qrserver.com/v1/create-qr-code/?size=80x80&ecc=M&data=${encodeURIComponent(expectedUrl)}`;
    expect(qrCode.getAttribute("src")).toBe(expectedSrc);
  });
});
