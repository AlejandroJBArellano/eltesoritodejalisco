import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { DailySummaryTicket } from "../DailySummaryTicket";
import { OrderStatus, PaymentMethod, type OrderWithDetails } from "@/types";
import type {
  DailyCut,
  DailyCutSummaryTotals,
  ExpenseDetailItem,
  TipBreakdownItem,
} from "../types";

const mockTotals: DailyCutSummaryTotals = {
  ventaNeta: 1000,
  ivaAcumulado: 160,
  propinasEfectivo: 50,
  propinasTarjeta: 50,
  cajaEfectivo: 1050,
  cajaTarjeta: 300,
  comisionTarjeta: 12,
  cajaTarjetaNeta: 288,
  utilidadReal: 1100,
  utilidadFinal: 888,
  ordersAtTable: 3,
  ordersDelivery: 2,
  averageTicket: 232,
  creditoOtorgadoHoy: 0,
};

const mockTenant = {
  id: "tenant-1",
  name: "El Tesorito de Jalisco",
  rfc: "XAXX010101000",
  postal_code: "44100",
  regimen_fiscal: "601 General de Ley Personas Morales",
  slug: "tesorito",
  google_reviews_url: null,
  ticket_footer_text: null,
  terminal_commission_rate: 4,
  created_at: null,
  updated_at: null,
};

const mockTipBreakdown: TipBreakdownItem[] = [
  { employee_name: "María Gómez", hours_worked: 7.5, tip_amount: 60 },
  { employee_name: "Juan Pérez", hours_worked: 5, tip_amount: 40 },
];

const mockExpensesDetail: ExpenseDetailItem[] = [
  { description: "Hielo y limones", amount: 120, category: "Insumos" },
  { description: "Gas LP", amount: 200, category: "Servicios" },
];

const mockOrders: OrderWithDetails[] = [
  {
    id: "ord-1",
    orderNumber: "101",
    source: "POS",
    status: OrderStatus.PAID,
    table: "Mesa 4",
    subtotal: 400,
    tax: 64,
    total: 464,
    createdAt: new Date("2026-09-09T14:30:00Z"),
    updatedAt: new Date("2026-09-09T14:30:00Z"),
    orderItems: [],
    payments: [
      {
        id: "pay-1",
        orderId: "ord-1",
        method: PaymentMethod.CASH,
        amount: 464,
        tipAmount: 30,
        createdAt: new Date("2026-09-09T14:30:00Z"),
      },
    ],
  },
  {
    id: "ord-2",
    orderNumber: "102",
    source: "POS",
    status: OrderStatus.PAID,
    table: "Domicilio",
    subtotal: 300,
    tax: 48,
    total: 348,
    createdAt: new Date("2026-09-09T15:00:00Z"),
    updatedAt: new Date("2026-09-09T15:00:00Z"),
    orderItems: [],
    payments: [
      {
        id: "pay-2",
        orderId: "ord-2",
        method: PaymentMethod.TRANSFER,
        amount: 348,
        tipAmount: 0,
        createdAt: new Date("2026-09-09T15:00:00Z"),
      },
    ],
  },
  {
    id: "ord-3",
    orderNumber: "103",
    source: "POS",
    status: OrderStatus.PAID,
    table: "Para Llevar",
    subtotal: 200,
    tax: 32,
    total: 232,
    createdAt: new Date("2026-09-09T15:30:00Z"),
    updatedAt: new Date("2026-09-09T15:30:00Z"),
    orderItems: [],
    payments: [
      {
        id: "pay-3",
        orderId: "ord-3",
        method: PaymentMethod.OTHER,
        amount: 232,
        tipAmount: 20,
        createdAt: new Date("2026-09-09T15:30:00Z"),
      },
    ],
  },
];

const mockCut: DailyCut = {
  id: "cut-hist-1",
  cut_date: "2026-09-05",
  venta_neta: 2500,
  iva_acumulado: 400,
  propinas_efectivo: 120,
  propinas_tarjeta: 80,
  caja_efectivo: 2620,
  caja_tarjeta: 480,
  comision_tarjeta: 19.2,
  utilidad_real: 2700,
  total_gastos: 350,
  utilidad_final: 2330.8,
  total_orders: 18,
  notes: null,
  expenses_detail: [
    { description: "Verduras del mercado", amount: 350, category: "Insumos" },
  ],
  created_at: "2026-09-05T23:00:00Z",
};

describe("DailySummaryTicket Component", () => {
  it("renders with default props and fallback values", () => {
    render(<DailySummaryTicket />);

    expect(screen.getByTestId("daily-summary-ticket")).toBeDefined();
    expect(screen.getByText("KITTN RESTAURANTE")).toBeDefined();
    expect(screen.getByText("*** CORTE / RESUMEN DE CAJA DIARIO ***")).toBeDefined();
    expect(screen.getByText("RESUMEN FINANCIERO")).toBeDefined();
    expect(screen.getByText("ARQUEO DE COBROS")).toBeDefined();
    expect(screen.getByText("KittnOS • Control Operativo")).toBeDefined();
  });

  it("renders live shift data with tenant details, financial kpis, tips and transactions", () => {
    const fixedDate = new Date("2026-09-09T20:00:00Z");

    render(
      <DailySummaryTicket
        todayTotals={mockTotals}
        orders={mockOrders}
        expenses={320}
        expensesDetail={mockExpensesDetail}
        tipBreakdown={mockTipBreakdown}
        tenantContext={mockTenant}
        emissionDate={fixedDate}
      />,
    );

    // Tenant info
    expect(screen.getByText("El Tesorito de Jalisco")).toBeDefined();
    expect(screen.getByText("RFC: XAXX010101000")).toBeDefined();
    expect(screen.getByText("C.P.: 44100")).toBeDefined();
    expect(
      screen.getByText("Régimen: 601 General de Ley Personas Morales"),
    ).toBeDefined();

    // Financial KPIs
    expect(screen.getByText("$1000.00")).toBeDefined(); // Venta Neta
    expect(screen.getByText("$160.00")).toBeDefined(); // IVA
    expect(screen.getByText("$1160.00")).toBeDefined(); // Venta Bruta
    expect(screen.getByText("$1050.00")).toBeDefined(); // Efectivo
    expect(screen.getByText("$300.00")).toBeDefined(); // Tarjeta Bruto
    expect(screen.getByText("-$12.00")).toBeDefined(); // Comisión
    expect(screen.getByText("$288.00")).toBeDefined(); // Tarjeta Neto
    expect(screen.getAllByText("$348.00").length).toBe(2); // Transferencia total and Order #102
    expect(screen.getByText("$252.00")).toBeDefined(); // Otros métodos (232 + 20)

    // Propinas & Gastos
    expect(screen.getByText("$100.00")).toBeDefined(); // Total propinas
    expect(screen.getByText("-$320.00")).toBeDefined(); // Gastos
    expect(screen.getByText("• Hielo y limones:")).toBeDefined();
    expect(screen.getByText("• Gas LP:")).toBeDefined();
    expect(screen.getByText("$888.00")).toBeDefined(); // Utilidad final

    // Tip breakdown
    expect(screen.getByText("María Gómez")).toBeDefined();
    expect(screen.getByText("7.50h")).toBeDefined();
    expect(screen.getByText("$60.00")).toBeDefined();
    expect(screen.getByText("Juan Pérez")).toBeDefined();
    expect(screen.getByText("5.00h")).toBeDefined();
    expect(screen.getByText("$40.00")).toBeDefined();

    // Transactions table
    expect(screen.getByText("DETALLE DE TRANSACCIONES (3)")).toBeDefined();
    expect(screen.getByText("#101")).toBeDefined();
    expect(screen.getByText("#102")).toBeDefined();
    expect(screen.getByText("#103")).toBeDefined();
    expect(screen.getByText("MESA 4")).toBeDefined();
    expect(screen.getByText("A DOMICILIO")).toBeDefined();
    expect(screen.getByText("PARA LLEVAR")).toBeDefined();
    expect(screen.getByText("(+$30.00 prop)")).toBeDefined();
    expect(screen.getByText("(+$20.00 prop)")).toBeDefined();
  });

  it("renders historical cut correctly when cut prop is provided", () => {
    render(
      <DailySummaryTicket
        cut={mockCut}
        tenantContext={mockTenant}
      />,
    );

    expect(screen.getByText("El Tesorito de Jalisco")).toBeDefined();
    expect(screen.getByText("18")).toBeDefined(); // total_orders
    expect(screen.getByText("$2500.00")).toBeDefined(); // venta_neta
    expect(screen.getByText("$400.00")).toBeDefined(); // iva_acumulado
    expect(screen.getByText("$2900.00")).toBeDefined(); // venta_bruta
    expect(screen.getByText("$2620.00")).toBeDefined(); // caja_efectivo
    expect(screen.getByText("$480.00")).toBeDefined(); // caja_tarjeta
    expect(screen.getByText("-$19.20")).toBeDefined(); // comision_tarjeta
    expect(screen.getByText("$460.80")).toBeDefined(); // caja_tarjeta_neta
    expect(screen.getAllByText("-$350.00").length).toBe(2); // total_gastos and expense detail
    expect(screen.getByText("• Verduras del mercado:")).toBeDefined();
    expect(screen.getByText("$2330.80")).toBeDefined(); // utilidad_final
  });
});
