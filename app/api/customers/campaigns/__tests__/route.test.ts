import { describe, it, expect, vi, beforeEach } from "vitest";
import { filterCampaignAudience, GET, POST } from "../route";
import { NextRequest } from "next/server";
import type { Tables } from "@/types/supabase";

const { mockSupabaseFrom, mockSendLoyaltyCampaignEmail, mockGetProfile, mockGetTenantContext } = vi.hoisted(() => {
  const mockFrom = vi.fn();
  const mockSendLoyaltyCampaignEmail = vi.fn();
  const mockGetProfile = vi.fn();
  const mockGetTenantContext = vi.fn();
  return {
    mockSupabaseFrom: mockFrom,
    mockSendLoyaltyCampaignEmail,
    mockGetProfile,
    mockGetTenantContext,
  };
});

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn().mockResolvedValue({
    from: mockSupabaseFrom,
  }),
}));

vi.mock("@/lib/auth", () => ({
  getProfile: mockGetProfile,
}));

vi.mock("@/lib/tenant", () => ({
  getTenantContext: mockGetTenantContext,
}));

vi.mock("@/lib/services/email", () => ({
  sendLoyaltyCampaignEmail: mockSendLoyaltyCampaignEmail,
}));

describe("app/api/customers/campaigns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockGetTenantContext.mockResolvedValue({
      id: "tenant-1",
      name: "Tacos Central",
      slug: "tacos-central",
      system_name: "Tacos Central",
      primary_color: "#10B981",
    });
    mockGetProfile.mockResolvedValue({
      id: "user-1",
      role: "ADMIN",
    });
  });

  describe("filterCampaignAudience", () => {
    const fixedNow = new Date("2026-09-20T12:00:00Z");

    const sampleCustomers: Tables<"customers">[] = [
      {
        id: "c1",
        name: "Ana Inactiva",
        email: "ana@example.com",
        phone: "123",
        birthday: null,
        loyalty_points: 150,
        total_spend: 500,
        tenant_id: "tenant-1",
        created_at: "2026-06-01T12:00:00Z",
        updated_at: "2026-06-01T12:00:00Z",
      },
      {
        id: "c2",
        name: "Beto Frecuente",
        email: "beto@example.com",
        phone: "456",
        birthday: null,
        loyalty_points: 30,
        total_spend: 300,
        tenant_id: "tenant-1",
        created_at: "2026-08-01T12:00:00Z",
        updated_at: "2026-08-01T12:00:00Z",
      },
      {
        id: "c3",
        name: "Carlos Sin Email",
        email: null,
        phone: "789",
        birthday: null,
        loyalty_points: 200,
        total_spend: 1000,
        tenant_id: "tenant-1",
        created_at: "2026-01-01T12:00:00Z",
        updated_at: "2026-01-01T12:00:00Z",
      },
      {
        id: "c4",
        name: "Diana Saturated",
        email: "diana@example.com",
        phone: "111",
        birthday: null,
        loyalty_points: 100,
        total_spend: 400,
        tenant_id: "tenant-1",
        created_at: "2026-05-01T12:00:00Z",
        updated_at: "2026-05-01T12:00:00Z",
      },
    ];

    const sampleOrders = [
      // c1 last ordered 40 days ago
      { customer_id: "c1", created_at: "2026-08-10T12:00:00Z" },
      // c2 has 3 orders, last ordered 2 days ago
      { customer_id: "c2", created_at: "2026-08-01T12:00:00Z" },
      { customer_id: "c2", created_at: "2026-08-15T12:00:00Z" },
      { customer_id: "c2", created_at: "2026-09-18T12:00:00Z" },
      // c4 last ordered 50 days ago
      { customer_id: "c4", created_at: "2026-07-30T12:00:00Z" },
    ];

    const sampleRecentRecipients = [
      // c4 was sent an email 3 days ago
      { customer_id: "c4", sent_at: "2026-09-17T12:00:00Z" },
    ];

    it("should exclude customers without valid email", () => {
      const audience = filterCampaignAudience(
        sampleCustomers,
        sampleOrders,
        sampleRecentRecipients,
        {},
        fixedNow,
      );
      expect(audience.map((c) => c.id)).not.toContain("c3");
      expect(audience.map((c) => c.id)).toContain("c1");
      expect(audience.map((c) => c.id)).toContain("c2");
      expect(audience.map((c) => c.id)).toContain("c4");
    });

    it("should filter by minimum points", () => {
      const audience = filterCampaignAudience(
        sampleCustomers,
        sampleOrders,
        sampleRecentRecipients,
        { minPoints: 100 },
        fixedNow,
      );
      expect(audience.map((c) => c.id)).toEqual(["c1", "c4"]);
    });

    it("should filter by inactive days", () => {
      const audience = filterCampaignAudience(
        sampleCustomers,
        sampleOrders,
        sampleRecentRecipients,
        { inactiveDays: 30 },
        fixedNow,
      );
      // c1 is 41 days inactive, c4 is 52 days inactive
      expect(audience.map((c) => c.id)).toEqual(["c1", "c4"]);
    });

    it("should filter by recurrent frequency", () => {
      const audience = filterCampaignAudience(
        sampleCustomers,
        sampleOrders,
        sampleRecentRecipients,
        { frequency: "recurrent" },
        fixedNow,
      );
      // Only c2 has >= 3 orders
      expect(audience.map((c) => c.id)).toEqual(["c2"]);
    });

    it("should apply anti-saturation rule", () => {
      const audience = filterCampaignAudience(
        sampleCustomers,
        sampleOrders,
        sampleRecentRecipients,
        { antiSaturationDays: 7 },
        fixedNow,
      );
      // c4 was contacted 3 days ago, so c4 is excluded
      expect(audience.map((c) => c.id)).toEqual(["c1", "c2"]);
    });
  });

  describe("POST /api/customers/campaigns", () => {
    it("should block non-admin and non-manager users", async () => {
      mockGetProfile.mockResolvedValueOnce({
        id: "user-waiter",
        role: "WAITER",
      });

      const req = new NextRequest("http://localhost:3000/api/customers/campaigns", {
        method: "POST",
        body: JSON.stringify({ name: "Campaña" }),
      });

      const res = await POST(req);
      expect(res.status).toBe(403);
    });

    it("should return preview audience when previewOnly is true", async () => {
      const mockSelectCustomers = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [
            { id: "c1", name: "Ana", email: "ana@example.com", loyalty_points: 50 },
          ],
        }),
      });
      const mockSelectOrders = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          not: vi.fn().mockResolvedValue({ data: [] }),
        }),
      });
      const mockSelectRecipients = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ data: [] }),
        }),
      });

      mockSupabaseFrom.mockImplementation((table: string) => {
        if (table === "customers") return { select: mockSelectCustomers };
        if (table === "orders") return { select: mockSelectOrders };
        if (table === "loyalty_campaign_recipients") return { select: mockSelectRecipients };
        return { select: vi.fn() };
      });

      const req = new NextRequest("http://localhost:3000/api/customers/campaigns", {
        method: "POST",
        body: JSON.stringify({
          name: "Prueba Preview",
          subject: "Asunto",
          messageContent: "Mensaje",
          previewOnly: true,
        }),
      });

      const res = await POST(req);
      const json = await res.json();
      expect(res.status).toBe(200);
      expect(json.totalAudienceCount).toBe(1);
      expect(json.audience[0].name).toBe("Ana");
    });
  });
});
