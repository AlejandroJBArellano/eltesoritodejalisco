import { describe, it, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useDailyCutManager } from "../useDailyCutManager";
import { OrderStatus, PaymentMethod, type OrderWithDetails } from "@/types";

vi.mock("@/hooks/usePendingCut", () => ({
  usePendingCut: () => ({
    loading: false,
    hasPendingCut: true,
    pendingDate: "2026-09-02",
    pendingOrders: 5,
    refresh: vi.fn().mockResolvedValue(undefined),
  }),
}));

const mockInsert = vi.fn().mockResolvedValue({ error: null });
const mockSelect = vi.fn().mockReturnValue({
  eq: vi.fn().mockReturnValue({
    eq: vi.fn().mockResolvedValue({
      data: [{ amount: 150, expense_categories: { tipo_gasto: "variable", name: "Insumos" } }],
    }),
  }),
});

vi.mock("@/lib/supabase/client", () => ({
  createClient: () => ({
    from: (table: string) => {
      if (table === "expenses") {
        return { select: mockSelect };
      }
      if (table === "daily_tips") {
        return { insert: mockInsert };
      }
      return { select: vi.fn(), insert: vi.fn() };
    },
  }),
}));

const mxToday = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Mexico_City",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const mockTodayOrders: OrderWithDetails[] = [
  {
    id: "ord-1",
    orderNumber: "101",
    source: "POS",
    status: OrderStatus.PAID,
    table: "Mesa 1",
    notes: "",
    subtotal: 100,
    tax: 16,
    total: 116,
    createdAt: new Date(`${mxToday}T12:00:00`),
    updatedAt: new Date(),
    orderItems: [],
    payments: [
      {
        id: "p-1",
        orderId: "ord-1",
        method: PaymentMethod.CASH,
        amount: 116,
        tipAmount: 20,
        createdAt: new Date(),
      },
    ],
  },
  {
    id: "ord-2",
    orderNumber: "102",
    source: "POS",
    status: OrderStatus.PAID,
    table: "Domicilio",
    notes: "",
    subtotal: 200,
    tax: 32,
    total: 232,
    createdAt: new Date(`${mxToday}T13:00:00`),
    updatedAt: new Date(),
    orderItems: [],
    payments: [
      {
        id: "p-2",
        orderId: "ord-2",
        method: PaymentMethod.CARD,
        amount: 232,
        tipAmount: 30,
        createdAt: new Date(),
      },
    ],
  },
];

describe("useDailyCutManager", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/tenant") {
        return { ok: true, json: async () => ({ tenant: { id: "tenant-123" } }) };
      }
      if (url === "/api/daily-cuts") {
        return { ok: true, json: async () => ({ success: true }) };
      }
      if (url === "/api/tips/calculate") {
        return {
          ok: true,
          json: async () => ({
            breakdown: [{ employee_name: "Juan", hours_worked: 8, tip_amount: 50 }],
            total_hours: 8,
          }),
        };
      }
      if (url === "/api/cortes/extemporaneo") {
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: false };
    });
  });

  it("calculates todayTotals accurately", () => {
    const { result } = renderHook(() =>
      useDailyCutManager({ orders: mockTodayOrders }),
    );

    expect(result.current.todayOrders).toHaveLength(2);
    expect(result.current.openOrders).toHaveLength(0);

    const totals = result.current.todayTotals;
    expect(totals.ordersAtTable).toBe(1);
    expect(totals.ordersDelivery).toBe(1);
    expect(totals.propinasEfectivo).toBe(20);
    expect(totals.propinasTarjeta).toBe(30);
    expect(totals.cajaEfectivo).toBe(136); // 116 + 20
    expect(totals.cajaTarjeta).toBe(262); // 232 + 30
  });

  it("blocks opening finalize modal when there are open orders", () => {
    const uncollectedOrders: OrderWithDetails[] = [
      ...mockTodayOrders,
      {
        id: "ord-open",
        orderNumber: "103",
        source: "POS",
        status: OrderStatus.PREPARING,
        table: "Mesa 2",
        notes: "",
        subtotal: 50,
        tax: 8,
        total: 58,
        createdAt: new Date(`${mxToday}T14:00:00`),
        updatedAt: new Date(),
        orderItems: [],
        payments: [],
      },
    ];

    const { result } = renderHook(() =>
      useDailyCutManager({ orders: uncollectedOrders }),
    );

    expect(result.current.openOrders).toHaveLength(1);

    act(() => {
      result.current.openFinalizeModal();
    });

    expect(result.current.showFinalizeModal).toBe(false);
    expect(result.current.historyError).toContain("orden pendiente de pago");
  });

  it("opens finalize modal and pre-fills manual fields when no open orders", () => {
    const { result } = renderHook(() =>
      useDailyCutManager({ orders: mockTodayOrders }),
    );

    act(() => {
      result.current.openFinalizeModal();
    });

    expect(result.current.showFinalizeModal).toBe(true);
    expect(result.current.manualCash).toBe("136");
    expect(result.current.manualCard).toBe("262");
  });

  it("handles arming and generating pending cut", async () => {
    const onCutFinalized = vi.fn();
    const { result } = renderHook(() =>
      useDailyCutManager({ orders: mockTodayOrders, onCutFinalized }),
    );

    // First click: arms the button
    await act(async () => {
      await result.current.handleGeneratePendingCut();
    });
    expect(result.current.pendingCutArmed).toBe(true);

    // Second click: dispatches extemporaneous cut request
    await act(async () => {
      await result.current.handleGeneratePendingCut();
    });

    expect(result.current.pendingCutArmed).toBe(false);
    expect(result.current.historySuccess).toContain("Corte extemporáneo generado");
    expect(onCutFinalized).toHaveBeenCalled();
  });

  it("finalizes day and records daily cut and tips", async () => {
    const onCutFinalized = vi.fn();
    const { result } = renderHook(() =>
      useDailyCutManager({ orders: mockTodayOrders, onCutFinalized }),
    );

    await act(async () => {
      await result.current.handleFinalizarDia();
    });

    expect(result.current.finalizeSuccess).toBe(true);
    expect(result.current.showFinalizeModal).toBe(false);
    expect(result.current.historySuccess).toContain("Corte de día finalizado con éxito");
    expect(onCutFinalized).toHaveBeenCalled();
  });

  it("calculates terminal commission and deducts it from utilidadFinal when tenant has terminal_commission_rate", async () => {
    global.fetch = vi.fn().mockImplementation(async (url: string) => {
      if (url === "/api/tenant") {
        return {
          ok: true,
          json: async () => ({
            tenant: { id: "tenant-123", terminal_commission_rate: 5 },
          }),
        };
      }
      return { ok: false };
    });

    const { result } = renderHook(() =>
      useDailyCutManager({ orders: mockTodayOrders }),
    );

    await act(async () => {
      await result.current.refetchExpenses();
    });

    expect(result.current.terminalCommissionRate).toBe(5);
    // Caja Tarjeta = 262. 5% commission = 13.1
    expect(result.current.todayTotals.comisionTarjeta).toBeCloseTo(13.1, 1);
    expect(result.current.todayTotals.cajaTarjetaNeta).toBeCloseTo(248.9, 1);
  });

  it("excludes uncollected credit orders from caja and ventaNeta, tracking them in creditoOtorgadoHoy", () => {
    const ordersWithCredit: OrderWithDetails[] = [
      ...mockTodayOrders,
      {
        id: "ord-credit-1",
        orderNumber: "104",
        source: "POS",
        status: OrderStatus.UNCOLLECTED,
        table: "Mesa 3",
        notes: "[CRÉDITO: Carlos Gomez]",
        subtotal: 500,
        tax: 80,
        total: 580,
        createdAt: new Date(`${mxToday}T14:30:00`),
        updatedAt: new Date(),
        orderItems: [],
        payments: [],
      },
    ];

    const { result } = renderHook(() =>
      useDailyCutManager({ orders: ordersWithCredit }),
    );

    // Venta Neta should only come from ord-1 ($100) and ord-2 ($200) = $300
    // Credit order ($580) should NOT be added to caja or ventaNeta
    const totals = result.current.todayTotals;
    expect(totals.cajaEfectivo).toBe(136); // only ord-1
    expect(totals.cajaTarjeta).toBe(262); // only ord-2
    expect(totals.ventaNeta).toBeCloseTo(300, 1);
    expect(totals.ivaAcumulado).toBeCloseTo(48, 1);
    expect(totals.creditoOtorgadoHoy).toBe(580);
  });

  it("includes abonos made today for orders created on a previous day into today's caja and ventaNeta", () => {
    const yesterdayDate = "2026-09-01";
    const ordersWithPreviousAbono: OrderWithDetails[] = [
      ...mockTodayOrders,
      {
        id: "ord-old-credit",
        orderNumber: "099",
        source: "POS",
        status: OrderStatus.UNCOLLECTED,
        table: "Mesa 1",
        notes: "[CRÉDITO: Ana Lopez]",
        subtotal: 400,
        tax: 64,
        total: 464,
        createdAt: new Date(`${yesterdayDate}T10:00:00`),
        updatedAt: new Date(),
        orderItems: [],
        payments: [
          {
            id: "p-abono-today",
            orderId: "ord-old-credit",
            method: PaymentMethod.CASH,
            amount: 232, // $200 neta + $32 iva
            tipAmount: 0,
            createdAt: new Date(`${mxToday}T11:00:00`),
          },
        ],
      },
    ];

    const { result } = renderHook(() =>
      useDailyCutManager({ orders: ordersWithPreviousAbono }),
    );

    const totals = result.current.todayTotals;
    // Caja efectivo was 136 + 232 = 368
    expect(totals.cajaEfectivo).toBe(368);
    // Venta Neta was 300 + 200 = 500
    expect(totals.ventaNeta).toBeCloseTo(500, 1);
    expect(totals.ivaAcumulado).toBeCloseTo(80, 1);
    // Older order credit was NOT granted today, so creditoOtorgadoHoy remains 0
    expect(totals.creditoOtorgadoHoy).toBe(0);
  });

  it("includes credit granted note in daily cut payload when creditoOtorgadoHoy > 0", async () => {
    let capturedBody: Record<string, unknown> | null = null;
    global.fetch = vi.fn().mockImplementation(async (url: string, init?: RequestInit) => {
      if (url === "/api/tenant") {
        return { ok: true, json: async () => ({ tenant: { id: "tenant-123" } }) };
      }
      if (url === "/api/daily-cuts") {
        if (init?.body) {
          capturedBody = JSON.parse(init.body as string);
        }
        return { ok: true, json: async () => ({ success: true }) };
      }
      return { ok: false };
    });

    const ordersWithCredit: OrderWithDetails[] = [
      ...mockTodayOrders,
      {
        id: "ord-credit-2",
        orderNumber: "105",
        source: "POS",
        status: OrderStatus.UNCOLLECTED,
        table: "Barra",
        notes: "[CRÉDITO: Mario Bros]",
        subtotal: 200,
        tax: 32,
        total: 232,
        createdAt: new Date(`${mxToday}T15:00:00`),
        updatedAt: new Date(),
        orderItems: [],
        payments: [],
      },
    ];

    const { result } = renderHook(() =>
      useDailyCutManager({ orders: ordersWithCredit }),
    );

    await act(async () => {
      await result.current.handleFinalizarDia();
    });

    expect(capturedBody).not.toBeNull();
    expect((capturedBody as unknown as { notes?: string })?.notes).toContain("[Crédito otorgado hoy: $232.00]");
  });
});
