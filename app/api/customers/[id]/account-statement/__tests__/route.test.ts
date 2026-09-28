import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET, POST } from "../route";
import { NextRequest } from "next/server";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { logOrderAction } from "@/lib/services/orderAudit";
import { PaymentMethod } from "@/types";

vi.mock("@/lib/auth", () => ({
  getProfile: vi.fn(),
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

describe("API /api/customers/[id]/account-statement", () => {
  const mockTenant = { id: "tenant-123" };
  const mockProfile = { id: "user-1", name: "Admin", role: "ADMIN", tenant_id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  describe("GET", () => {
    it("returns 401 when user is not authenticated", async () => {
      vi.mocked(getProfile).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/customers/cust-1/account-statement");
      const response = await GET(request, { params: Promise.resolve({ id: "cust-1" }) });

      expect(response.status).toBe(401);
      const json = await response.json();
      expect(json.error).toBe("No autorizado");
    });

    it("returns 404 when customer does not exist", async () => {
      vi.mocked(getProfile).mockResolvedValue(mockProfile as any);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: null, error: new Error("Not found") }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = new NextRequest("http://localhost:3000/api/customers/cust-1/account-statement");
      const response = await GET(request, { params: Promise.resolve({ id: "cust-1" }) });

      expect(response.status).toBe(404);
      const json = await response.json();
      expect(json.error).toBe("Cliente no encontrado");
    });

    it("returns account statement with pending notes and total debt", async () => {
      vi.mocked(getProfile).mockResolvedValue(mockProfile as any);

      const mockCustomer = { id: "cust-1", name: "Cliente VIP", tenant_id: "tenant-123" };
      const mockOrders = [
        {
          id: "order-1",
          order_number: "ORD-001",
          created_at: "2026-09-01T10:00:00Z",
          operational_date: "2026-09-01",
          status: "UNCOLLECTED",
          total: 500,
          notes: "Nota 1",
          table: "Mesa 1",
          order_items: [
            {
              id: "item-1",
              quantity: 2,
              unit_price: 250,
              menu_items: { id: "menu-1", name: "Cerveza Artesanal" },
            },
          ],
          payments: [
            {
              id: "pay-1",
              amount: 100,
              method: "CASH",
              created_at: "2026-09-01T10:30:00Z",
              tip_amount: 0,
            },
          ],
        },
      ];

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "customers") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              single: vi.fn().mockResolvedValue({ data: mockCustomer, error: null }),
            };
          }
          if (table === "orders") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = new NextRequest("http://localhost:3000/api/customers/cust-1/account-statement");
      const response = await GET(request, { params: Promise.resolve({ id: "cust-1" }) });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.customer.id).toBe("cust-1");
      expect(json.pendingNotes).toHaveLength(1);
      expect(json.pendingNotes[0].remainingBalance).toBe(400); // 500 - 100
      expect(json.totalDebt).toBe(400);
    });
  });

  describe("POST", () => {
    it("returns 401 when not authorized", async () => {
      vi.mocked(getProfile).mockResolvedValue(null);

      const request = new NextRequest("http://localhost:3000/api/customers/cust-1/account-statement", {
        method: "POST",
        body: JSON.stringify({ amount: 100, method: "CASH" }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: "cust-1" }) });

      expect(response.status).toBe(401);
    });

    it("validates payment amount > 0", async () => {
      vi.mocked(getProfile).mockResolvedValue(mockProfile as any);

      const request = new NextRequest("http://localhost:3000/api/customers/cust-1/account-statement", {
        method: "POST",
        body: JSON.stringify({ amount: 0, method: "CASH" }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: "cust-1" }) });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("El monto debe ser mayor a 0");
    });

    it("validates valid payment method", async () => {
      vi.mocked(getProfile).mockResolvedValue(mockProfile as any);

      const request = new NextRequest("http://localhost:3000/api/customers/cust-1/account-statement", {
        method: "POST",
        body: JSON.stringify({ amount: 100, method: "INVALID_METHOD" }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: "cust-1" }) });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("Método de pago no válido");
    });

    it("returns 400 when customer has no uncollected orders", async () => {
      vi.mocked(getProfile).mockResolvedValue(mockProfile as any);

      const mockSupabase = {
        from: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: [], error: null }),
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = new NextRequest("http://localhost:3000/api/customers/cust-1/account-statement", {
        method: "POST",
        body: JSON.stringify({ amount: 100, method: PaymentMethod.CASH }),
      });
      const response = await POST(request, { params: Promise.resolve({ id: "cust-1" }) });

      expect(response.status).toBe(400);
      const json = await response.json();
      expect(json.error).toBe("No hay notas pendientes para este cliente");
    });

    it("successfully applies payment FIFO with valid UUID id and updates paid orders", async () => {
      vi.mocked(getProfile).mockResolvedValue(mockProfile as any);

      const mockOrders = [
        {
          id: "order-1",
          total: 200,
          status: "UNCOLLECTED",
          payments: [],
        },
        {
          id: "order-2",
          total: 300,
          status: "UNCOLLECTED",
          payments: [{ amount: 100 }],
        },
      ];

      const mockInsertPayments = vi.fn().mockResolvedValue({ error: null });
      const mockUpdateOrders = vi.fn().mockReturnValue({
        in: vi.fn().mockResolvedValue({ error: null }),
      });

      const mockSupabase = {
        from: vi.fn((table: string) => {
          if (table === "orders") {
            return {
              select: vi.fn().mockReturnThis(),
              eq: vi.fn().mockReturnThis(),
              order: vi.fn().mockResolvedValue({ data: mockOrders, error: null }),
              update: mockUpdateOrders,
            };
          }
          if (table === "payments") {
            return {
              insert: mockInsertPayments,
            };
          }
          return {};
        }),
      };
      vi.mocked(createClient).mockResolvedValue(mockSupabase as any);

      const request = new NextRequest("http://localhost:3000/api/customers/cust-1/account-statement", {
        method: "POST",
        body: JSON.stringify({
          amount: 350,
          method: PaymentMethod.CASH,
          receivedAmount: 400,
          change: 50,
        }),
      });

      const response = await POST(request, { params: Promise.resolve({ id: "cust-1" }) });

      expect(response.status).toBe(200);
      const json = await response.json();
      expect(json.success).toBe(true);
      expect(json.appliedAmount).toBe(350);
      expect(json.fullyPaidCount).toBe(1); // order-1 is 200 (fully paid), order-2 gets 150 (balance was 200, so not fully paid)
      expect(json.notesApplied).toBe(2);

      // Verify payment records contain valid string id (UUID)
      expect(mockInsertPayments).toHaveBeenCalledTimes(1);
      const insertedRecords = mockInsertPayments.mock.calls[0][0];
      expect(insertedRecords).toHaveLength(2);
      expect(insertedRecords[0]).toMatchObject({
        order_id: "order-1",
        tenant_id: "tenant-123",
        amount: 200,
        method: "CASH",
        received_amount: 400,
        change: 50,
      });
      expect(typeof insertedRecords[0].id).toBe("string");
      expect(insertedRecords[0].id.length).toBeGreaterThan(0);

      expect(insertedRecords[1]).toMatchObject({
        order_id: "order-2",
        tenant_id: "tenant-123",
        amount: 150,
        method: "CASH",
      });
      expect(typeof insertedRecords[1].id).toBe("string");
      expect(insertedRecords[1].id.length).toBeGreaterThan(0);

      // Verify logOrderAction called for fully paid order
      expect(logOrderAction).toHaveBeenCalledWith({
        orderId: "order-1",
        tenantId: "tenant-123",
        user: mockProfile,
        actionType: "PAID",
        details: {
          reason: "Liquidación por abono a cuenta",
        },
      });
    });
  });
});
