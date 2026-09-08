import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST } from "../route";
import { NextRequest } from "next/server";
import { getProfile, verifyManagerPin } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { logOrderAction } from "@/lib/services/orderAudit";

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

describe("POST /api/orders/[id]/undo-payment", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  it("returns 401 if user is not authenticated", async () => {
    vi.mocked(getProfile).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/orders/ord-1/undo-payment", {
      method: "POST",
    });

    const response = await POST(request, { params: Promise.resolve({ id: "ord-1" }) });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("No autorizado");
  });

  it("returns 403 if WAITER does not provide PIN", async () => {
    vi.mocked(getProfile).mockResolvedValue({ role: "WAITER", tenant_id: "tenant-123" } as any);

    const request = new NextRequest("http://localhost:3000/api/orders/ord-1/undo-payment", {
      method: "POST",
      body: JSON.stringify({}),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "ord-1" }) });
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("Se requiere PIN de Gerencia para autorizar la reapertura");
  });

  it("returns 401 if WAITER provides invalid PIN", async () => {
    vi.mocked(getProfile).mockResolvedValue({ role: "WAITER", tenant_id: "tenant-123" } as any);
    vi.mocked(verifyManagerPin).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/orders/ord-1/undo-payment", {
      method: "POST",
      body: JSON.stringify({ pin: "0000" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "ord-1" }) });
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("PIN de autorización incorrecto");
  });

  it("successfully undoes payment and logs REOPENED audit action", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      id: "u-admin",
      full_name: "Admin Principal",
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const mockOrder = { id: "ord-1", status: "PAID", tenant_id: "tenant-123" };
    const mockUpdatedOrder = { id: "ord-1", status: "PENDING", tenant_id: "tenant-123" };

    const mockDelete = vi.fn().mockReturnValue({
      eq: vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      }),
    });

    const mockInsert = vi.fn().mockResolvedValue({ error: null });

    const mockFrom = vi.fn((table: string) => {
      if (table === "orders") {
        return {
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockOrder, error: null }),
              }),
            }),
          }),
          update: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                select: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({ data: mockUpdatedOrder, error: null }),
                }),
              }),
            }),
          }),
        };
      }
      if (table === "payments") {
        return { delete: mockDelete };
      }
      if (table === "order_adjustments") {
        return { insert: mockInsert };
      }
      return {};
    });

    vi.mocked(createClient).mockResolvedValue({
      from: mockFrom,
    } as any);

    const request = new NextRequest("http://localhost:3000/api/orders/ord-1/undo-payment", {
      method: "POST",
      body: JSON.stringify({ reason: "Platillo equivocado" }),
    });

    const response = await POST(request, { params: Promise.resolve({ id: "ord-1" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.order).toEqual(mockUpdatedOrder);

    expect(logOrderAction).toHaveBeenCalledWith(
      expect.objectContaining({
        orderId: "ord-1",
        actionType: "REOPENED",
        notifyCritical: true,
        details: expect.objectContaining({
          reason: "Platillo equivocado (Autorizado por Admin Principal)",
          authorizedBy: "Admin Principal",
          previousStatus: "PAID",
        }),
      }),
    );
  });
});
