import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import { getProfile, verifyManagerPin } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/auth", () => ({
  getProfile: vi.fn(),
  verifyManagerPin: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/services/orderAudit", () => ({
  logOrderAction: vi.fn().mockResolvedValue({ success: true }),
}));

describe("POST /api/payments", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  const setupSupabaseMock = (orderToCheck = { corte_id: null, estado_cierre: null }) => {
    const mockOrderSelect = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: orderToCheck, error: null }),
    };

    const mockPaymentsInsert = {
      insert: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "payment-1", amount: 0, method: "OTHER" },
        error: null,
      }),
    };

    const mockOrderUpdate = {
      update: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      select: vi.fn().mockReturnThis(),
      single: vi.fn().mockResolvedValue({
        data: { id: "order-1", status: "PAID" },
        error: null,
      }),
    };

    const mockFrom = vi.fn((table: string) => {
      if (table === "orders") {
        return {
          ...mockOrderSelect,
          ...mockOrderUpdate,
        };
      }
      if (table === "payments") {
        return mockPaymentsInsert;
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
    } as any);
  };

  it("returns 403 when WAITER attempts courtesy payment ($0.00) without PIN", async () => {
    setupSupabaseMock();
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({
        orderId: "order-1",
        method: "OTHER",
        amount: 0,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Se requiere PIN de Gerencia para registrar cortesías");
  });

  it("returns 403 when WAITER attempts courtesy payment ($0.00) with invalid PIN", async () => {
    setupSupabaseMock();
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);
    vi.mocked(verifyManagerPin).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({
        orderId: "order-1",
        method: "OTHER",
        amount: 0,
        pin: "0000",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("PIN de autorización incorrecto");
    expect(verifyManagerPin).toHaveBeenCalledWith("tenant-123", "0000");
  });

  it("succeeds when WAITER attempts courtesy payment ($0.00) with valid PIN", async () => {
    setupSupabaseMock();
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);
    vi.mocked(verifyManagerPin).mockResolvedValue({
      id: "manager-1",
      name: "Gerente Juan",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({
        orderId: "order-1",
        method: "OTHER",
        amount: 0,
        pin: "1234",
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(body.payment).toBeDefined();
    expect(body.order.status).toBe("PAID");
  });

  it("allows ADMIN to process courtesy payment ($0.00) without requiring PIN", async () => {
    setupSupabaseMock();
    vi.mocked(getProfile).mockResolvedValue({
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/payments", {
      method: "POST",
      body: JSON.stringify({
        orderId: "order-1",
        method: "OTHER",
        amount: 0,
      }),
    });

    const response = await POST(request);
    const body = await response.json();

    expect(response.status).toBe(201);
    expect(verifyManagerPin).not.toHaveBeenCalled();
    expect(body.payment).toBeDefined();
  });
});
