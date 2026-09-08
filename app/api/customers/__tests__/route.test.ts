import { describe, it, expect, vi, beforeEach } from "vitest";
import { DELETE } from "../route";
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

describe("DELETE /api/customers", () => {
  const mockTenant = { id: "tenant-123" };

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);
  });

  it("returns 403 with permission error when user is WAITER", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "WAITER",
      tenant_id: "tenant-123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/customers", {
      method: "DELETE",
      body: JSON.stringify({ id: "cust-123" }),
    });

    const response = await DELETE(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("No tienes permisos para eliminar clientes");
  });

  it("returns 403 No autorizado when user has an unauthorized role (e.g. CHEF)", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "CHEF",
      tenant_id: "tenant-123",
    } as any);

    const request = new NextRequest("http://localhost:3000/api/customers", {
      method: "DELETE",
      body: JSON.stringify({ id: "cust-123" }),
    });

    const response = await DELETE(request);
    const body = await response.json();

    expect(response.status).toBe(403);
    expect(body.error).toBe("No autorizado");
  });

  it("allows ADMIN to delete a customer", async () => {
    vi.mocked(getProfile).mockResolvedValue({
      role: "ADMIN",
      tenant_id: "tenant-123",
    } as any);

    const mockDeleteBuilder = {
      delete: vi.fn().mockReturnThis(),
      eq: vi.fn().mockReturnThis(),
    };
    // Second eq call returns promise { error: null }
    mockDeleteBuilder.eq.mockReturnValueOnce(mockDeleteBuilder).mockResolvedValueOnce({ error: null });

    vi.mocked(createClient).mockResolvedValue({
      from: vi.fn().mockReturnValue(mockDeleteBuilder),
    } as any);

    const request = new NextRequest("http://localhost:3000/api/customers", {
      method: "DELETE",
      body: JSON.stringify({ id: "cust-123" }),
    });

    const response = await DELETE(request);
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(body.success).toBe(true);
  });
});
