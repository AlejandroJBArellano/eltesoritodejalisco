import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";

vi.mock("@/lib/auth", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

describe("GET /api/orders", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  it("returns 403 Forbidden when user is WAITER and posParam is not 'true'", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/orders");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("No autorizado para consultar el historial general de órdenes");
  });

  it("allows WAITER when posParam is 'true'", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);

    const mockOrders = [{ id: "order-pos-1", total: 100 }];
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      or: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/orders?pos=true");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toEqual(mockOrders);
  });

  it("allows ADMIN to query general orders history without posParam", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const mockOrders = [{ id: "order-hist-1", total: 250 }];
    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/orders");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toEqual(mockOrders);
  });
});
