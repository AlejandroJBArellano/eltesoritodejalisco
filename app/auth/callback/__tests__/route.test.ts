import { describe, it, expect, vi, beforeEach } from "vitest";
import { GET } from "../route";
import { getTenantContext } from "@/lib/tenant";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

describe("GET /auth/callback", () => {
  const mockTenant = { id: "tenant-demo-123" };
  const mockSignOut = vi.fn();
  const mockExchangeCode = vi.fn();
  const mockGetUser = vi.fn();
  const mockSelectFromProfiles = vi.fn();

  const mockAdminUpdateProfiles = vi.fn();
  const mockAdminUpdateUsers = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);

    // Setup client Supabase mock
    vi.mocked(createClient).mockResolvedValue({
      auth: {
        exchangeCodeForSession: mockExchangeCode,
        getUser: mockGetUser,
        signOut: mockSignOut,
      },
      from: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockImplementation((col, val) => ({
            eq: vi.fn().mockImplementation((col2, val2) => ({
              maybeSingle: mockSelectFromProfiles,
            })),
          })),
          ilike: vi.fn().mockImplementation((col, val) => ({
            eq: vi.fn().mockImplementation((col2, val2) => ({
              maybeSingle: mockSelectFromProfiles,
            })),
          })),
        }),
      }),
    } as any);

    // Setup admin Supabase mock
    const adminProfilesBuilder = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockAdminUpdateProfiles.mockResolvedValue({ error: null }),
        }),
      }),
    };

    const adminUsersBuilder = {
      update: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: mockAdminUpdateUsers.mockResolvedValue({ error: null }),
        }),
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue({
      from: vi.fn().mockImplementation((table: string) => {
        if (table === "profiles") return adminProfilesBuilder;
        if (table === "users") return adminUsersBuilder;
        return { update: vi.fn() };
      }),
    } as any);
  });

  it("redirects to login error when no code is provided", async () => {
    const request = new Request("http://localhost:3000/auth/callback");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login?error=");
    expect(location).toContain(encodeURIComponent("No se pudo iniciar sesión con Google"));
  });

  it("redirects to login error when code exchange fails", async () => {
    mockExchangeCode.mockResolvedValue({ error: { message: "Invalid code" } });

    const request = new Request("http://localhost:3000/auth/callback?code=bad-code");
    const response = await GET(request);

    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login?error=");
  });

  it("rejects unauthorized Google users, signs them out and redirects to login", async () => {
    mockExchangeCode.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "google-stranger-id",
          email: "stranger@gmail.com",
          user_metadata: { full_name: "Desconocido" },
        },
      },
    });

    // Profile does not exist for this tenant (neither by id nor by email)
    mockSelectFromProfiles.mockResolvedValue({ data: null, error: null });

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code");
    const response = await GET(request);

    expect(mockSignOut).toHaveBeenCalledTimes(1);
    expect(response.status).toBe(307);
    const location = response.headers.get("location");
    expect(location).toContain("/login?error=");
    expect(location).toContain(
      encodeURIComponent("Este correo no está registrado en este restaurante. Contacta a un administrador.")
    );
  });

  it("allows existing authorized user with matching id to proceed to next destination", async () => {
    mockExchangeCode.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "user-auth-id-1",
          email: "mesero@eltesoritodejalisco.com",
          user_metadata: { full_name: "Mesero Registrado" },
        },
      },
    });

    // Profile exists with matching id
    mockSelectFromProfiles.mockResolvedValueOnce({
      data: {
        id: "user-auth-id-1",
        email: "mesero@eltesoritodejalisco.com",
        role: "WAITER",
        full_name: "Mesero Registrado",
      },
      error: null,
    });

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code&next=/pos");
    const response = await GET(request);

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/pos");
  });

  it("links and syncs user ID when user was pre-registered by email with provisional id", async () => {
    mockExchangeCode.mockResolvedValue({ error: null });
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: "google-auth-user-id",
          email: "cocinero@eltesoritodejalisco.com",
          user_metadata: { full_name: "Chef Juan" },
        },
      },
    });

    // First lookup by ID returns null, second lookup by email returns the pre-registered profile
    mockSelectFromProfiles
      .mockResolvedValueOnce({ data: null, error: null })
      .mockResolvedValueOnce({
        data: {
          id: "provisional-admin-id",
          email: "cocinero@eltesoritodejalisco.com",
          role: "CHEF",
          full_name: "Chef Juan",
        },
        error: null,
      });

    const request = new Request("http://localhost:3000/auth/callback?code=valid-code");
    const response = await GET(request);

    expect(mockSignOut).not.toHaveBeenCalled();
    expect(mockAdminUpdateProfiles).toHaveBeenCalled();
    expect(mockAdminUpdateUsers).toHaveBeenCalled();
    expect(response.status).toBe(307);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
  });
});
