import React from "react";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import { OrderTicket } from "../OrderTicket";
import { OrderWithDetails, OrderStatus, PaymentMethod } from "@/types";

let mockTenant = {
  id: "tenant-abc",
  slug: "tesorito",
  name: "El Tesorito de Jalisco",
  system_name: "TesoritoOS",
  rfc: "XAXX010101000",
  postal_code: "44100",
  regimen_fiscal: "601",
  google_reviews_url: null as string | null,
  ticket_footer_text: null as string | null,
};

// Mock useTenant
vi.mock("@/components/TenantProvider", () => ({
  useTenant: () => mockTenant,
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

  it("should render a single centered Pickup QR code when Google Reviews URL is not configured", () => {
    mockTenant.google_reviews_url = null;
    mockTenant.ticket_footer_text = null;

    render(<OrderTicket order={mockOrder} />);

    // Check Pickup QR
    const qrPickup = screen.getByTestId("qr-pickup");
    expect(qrPickup).toBeInTheDocument();
    expect(qrPickup.getAttribute("width")).toBe("80");
    expect(qrPickup.getAttribute("height")).toBe("80");

    const expectedPickupUrl = "https://tesorito.trykittn.com";
    expect(qrPickup.getAttribute("src")).toContain(encodeURIComponent(expectedPickupUrl));

    // Reviews QR should NOT be rendered
    expect(screen.queryByTestId("qr-reviews")).not.toBeInTheDocument();

    // Powered by Kittn footer
    expect(screen.getByText(/Powered by Kittn • trykittn.com/i)).toBeInTheDocument();
  });

  it("should render dual QR codes (Pickup + Google Reviews) and social footer when configured", () => {
    mockTenant.google_reviews_url = "https://g.page/r/CbXxExample/review";
    mockTenant.ticket_footer_text = "📸 @el_tesorito_jalisco • 🎵 @tesorito";

    render(<OrderTicket order={mockOrder} />);

    // Check Pickup QR in dual mode (size 70x70)
    const qrPickup = screen.getByTestId("qr-pickup");
    expect(qrPickup).toBeInTheDocument();
    expect(qrPickup.getAttribute("width")).toBe("70");
    expect(qrPickup.getAttribute("height")).toBe("70");

    // Check Google Reviews QR in dual mode (size 70x70)
    const qrReviews = screen.getByTestId("qr-reviews");
    expect(qrReviews).toBeInTheDocument();
    expect(qrReviews.getAttribute("width")).toBe("70");
    expect(qrReviews.getAttribute("height")).toBe("70");
    expect(qrReviews.getAttribute("src")).toContain(encodeURIComponent("https://g.page/r/CbXxExample/review"));

    // Check headers
    expect(screen.getByText("Pide en Línea")).toBeInTheDocument();
    expect(screen.getByText("Califícanos")).toBeInTheDocument();

    // Check social footer
    expect(screen.getByText("📸 @el_tesorito_jalisco • 🎵 @tesorito")).toBeInTheDocument();

    // Powered by Kittn footer
    expect(screen.getByText(/Powered by Kittn • trykittn.com/i)).toBeInTheDocument();
  });
});
