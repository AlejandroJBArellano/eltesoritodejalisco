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

describe("GET /api/pos/orders", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  it("returns 401 Unauthorized when profile is not found", async () => {
    vi.mocked(getProfile).mockResolvedValue(null);

    const request = new NextRequest("http://localhost:3000/api/pos/orders");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(401);
    expect(body.error).toBe("No autorizado");
  });

  it("filters orders strictly after latest daily cut timestamp and computes shift statistics", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const mockShiftSummary = [
      { id: "ord-1", status: "PENDING", source: "POS", total: 150 },
      { id: "ord-2", status: "PAID", source: "PICKUP_APP", total: 250 },
      { id: "ord-3", status: "PAID", source: "POS", total: 350 },
    ];

    const mockPagedOrders = [
      { id: "ord-3", order_number: "003", total: 350, status: "PAID" },
      { id: "ord-2", order_number: "002", total: 250, status: "PAID" },
    ];

    const mockCutsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "cut-latest", created_at: "2026-09-24T19:00:00Z" },
      }),
    };

    const summaryQueryBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockResolvedValue({ data: mockShiftSummary, error: null }),
    };

    const pagedQueryBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: mockPagedOrders,
        count: 3,
        error: null,
      }),
    };

    let orderQueryCallCount = 0;
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "daily_cuts") return mockCutsBuilder;
        if (table === "orders") {
          orderQueryCallCount++;
          if (orderQueryCallCount === 1) return summaryQueryBuilder;
          return pagedQueryBuilder;
        }
        return {};
      }),
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/pos/orders?page=1&pageSize=10",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toHaveLength(2);
    expect(body.counts).toEqual({
      total: 3,
      pending: 1,
      paid: 2,
      pos: 2,
      pickup: 1,
    });
    expect(body.stats).toEqual({
      count: 3,
      sales: 600,
      avgTicket: 300,
    });
    expect(body.pagination).toEqual({
      page: 1,
      pageSize: 10,
      total: 3,
      totalPages: 1,
    });
    expect(summaryQueryBuilder.gt).toHaveBeenCalledWith(
      "created_at",
      "2026-09-24T19:00:00Z",
    );
  });

  it("filters by operational_date when no cuts exist", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);

    const mockCutsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({ data: null }),
    };

    const summaryQueryBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockImplementation((col: string) => {
        if (col === "operational_date") {
          return Promise.resolve({ data: [], error: null });
        }
        return summaryQueryBuilder;
      }),
    };

    const pagedQueryBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [],
        count: 0,
        error: null,
      }),
    };

    let orderQueryCallCount = 0;
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "daily_cuts") return mockCutsBuilder;
        if (table === "orders") {
          orderQueryCallCount++;
          if (orderQueryCallCount === 1) return summaryQueryBuilder;
          return pagedQueryBuilder;
        }
        return {};
      }),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/pos/orders");
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.orders).toEqual([]);
    expect(body.counts.total).toBe(0);
  });

  it("applies status=PENDING and source=POS query filters", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const mockCutsBuilder = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      limit: vi.fn().mockReturnThis(),
      maybeSingle: vi.fn().mockResolvedValue({
        data: { id: "cut-1", created_at: "2026-09-25T10:00:00Z" },
      }),
    };

    const summaryQueryBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      gt: vi.fn().mockResolvedValue({ data: [], error: null }),
    };

    const pagedQueryBuilder: any = {
      select: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
      order: vi.fn().mockReturnThis(),
      gt: vi.fn().mockReturnThis(),
      neq: vi.fn().mockReturnThis(),
      range: vi.fn().mockResolvedValue({
        data: [{ id: "ord-1" }],
        count: 1,
        error: null,
      }),
    };

    let orderQueryCallCount = 0;
    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn((table: string) => {
        if (table === "daily_cuts") return mockCutsBuilder;
        if (table === "orders") {
          orderQueryCallCount++;
          if (orderQueryCallCount === 1) return summaryQueryBuilder;
          return pagedQueryBuilder;
        }
        return {};
      }),
    } as any);

    const request = new NextRequest(
      "http://localhost:3000/api/pos/orders?status=PENDING&source=POS&page=2&pageSize=5",
    );
    const response = await GET(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(pagedQueryBuilder.neq).toHaveBeenCalledWith("status", "PAID");
    expect(pagedQueryBuilder.neq).toHaveBeenCalledWith("source", "PICKUP_APP");
    expect(pagedQueryBuilder.range).toHaveBeenCalledWith(5, 9);
    expect(body.pagination.page).toBe(2);
    expect(body.pagination.pageSize).toBe(5);
  });
});
