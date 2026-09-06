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

describe("GET /api/analytics/performance", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  it("returns 403 when user is not authorized or role is WAITER", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/analytics/performance");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("No autorizado");
  });

  it("returns 200 with aggregated performance data when user is ADMIN", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const mockOrders = [
      {
        id: "order-1",
        total: 350,
        created_at: "2026-09-01T10:00:00-06:00",
        completed_at: "2026-09-01T10:20:00-06:00",
        source: "POS",
        status: "DELIVERED",
      },
    ];

    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/performance?period=7days",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.period).toBe("7days");
    expect(body.kpis.periodAverageTicket).toBe(350);
    expect(body.kpis.totalPeriodSales).toBe(350);
    expect(body.dailyTickets).toHaveLength(1);
    expect(body.weekdaySales).toHaveLength(7);
    expect(body.monthlySales).toHaveLength(12);
  });

  it("returns 500 when database throws an error", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "MANAGER",
      tenant_id: "tenant-123",
    } as any);

    const mockQueryBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      in: vi.fn().mockReturnThis(),
      gte: vi.fn().mockReturnThis(),
      lte: vi.fn().mockReturnThis(),
      order: vi.fn().mockResolvedValue({ data: null, error: new Error("DB Query Error") }),
    };

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(mockQueryBuilder),
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/analytics/performance?period=custom&startDate=2026-09-01&endDate=2026-09-05",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(500);
    expect(body.error).toBe("DB Query Error");
  });
});
