import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("GET /api/orders/[id]/audit", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  it("returns audit logs for the given order id ordered chronologically", async () => {
    const mockLogs = [
      { id: "log-1", order_id: "order-abc", action_type: "CREATED", created_at: "2026-09-08T10:00:00Z" },
      { id: "log-2", order_id: "order-abc", action_type: "ITEMS_ADDED", created_at: "2026-09-08T10:15:00Z" },
    ];

    const mockOrderFn = vi.fn().mockResolvedValue({ data: mockLogs, error: null });
    const mockTenantEq = vi.fn().mockReturnValue({ order: mockOrderFn });
    const mockOrderEq = vi.fn().mockReturnValue({ eq: mockTenantEq });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockOrderEq });

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/orders/order-abc/audit");
    const response = await GET(request, { params: Promise.resolve({ id: "order-abc" }) });
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.logs).toEqual(mockLogs);
    expect(mockOrderEq).toHaveBeenCalledWith("order_id", "order-abc");
    expect(mockTenantEq).toHaveBeenCalledWith("tenant_id", "tenant-123");
    expect(mockOrderFn).toHaveBeenCalledWith("created_at", { ascending: true });
  });

  it("returns 500 if database query errors", async () => {
    const mockOrderFn = vi.fn().mockResolvedValue({ data: null, error: new Error("DB Error") });
    const mockTenantEq = vi.fn().mockReturnValue({ order: mockOrderFn });
    const mockOrderEq = vi.fn().mockReturnValue({ eq: mockTenantEq });
    const mockSelect = vi.fn().mockReturnValue({ eq: mockOrderEq });

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue({
        select: mockSelect,
      }),
    } as any);

    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:3000/api/orders/order-abc/audit");
    const response = await GET(request, { params: Promise.resolve({ id: "order-abc" }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Error al obtener el historial de modificaciones");

    consoleErrorSpy.mockRestore();
  });

  it("returns 500 when exception is thrown", async () => {
    vi.mocked(getTenantContext).mockRejectedValueOnce(new Error("Tenant error"));
    const consoleErrorSpy = vi.spyOn(console, "error").mockImplementation(() => {});

    const request = new NextRequest("http://localhost:3000/api/orders/order-abc/audit");
    const response = await GET(request, { params: Promise.resolve({ id: "order-abc" }) });
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("Error al obtener el historial de modificaciones");

    consoleErrorSpy.mockRestore();
  });
});
