import { describe, it, expect, vi, beforeEach } from "vitest";
import { getUser, getProfile, verifyManagerPin } from "../auth";
import { createClient } from "../supabase/server";
import { getTenantContext } from "../tenant";

const mockAdminClient = {
  from: vi.fn(),
};

vi.mock("../supabase/server", () => ({
  createClient: vi.fn(),
}));

vi.mock("../supabase/admin", () => ({
  createAdminClient: () => mockAdminClient,
}));

vi.mock("../tenant", () => ({
  getTenantContext: vi.fn(),
}));

describe("lib/auth", () => {
  const getUserMock = vi.fn();
  const maybeSingleProfileMock = vi.fn();
  const maybeSingleRoleMock = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getTenantContext).mockResolvedValue({ id: "tenant-1" } as any);

    vi.mocked(createClient).mockResolvedValue({
      auth: { getUser: getUserMock },
      from: (table: string) => {
        if (table === "profiles") {
          return {
            select: () => ({
              eq: () => ({
                eq: () => ({
                  maybeSingle: maybeSingleProfileMock,
                }),
              }),
            }),
          };
        }
        return {
          select: () => ({
            eq: () => ({
              maybeSingle: maybeSingleRoleMock,
            }),
          }),
        };
      },
    } as any);
  });

  it("getUser returns user when present and null on error or missing user", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "u1" } },
      error: null,
    });
    expect(await getUser()).toEqual({ id: "u1" });

    getUserMock.mockResolvedValueOnce({
      data: { user: null },
      error: new Error("auth error"),
    });
    expect(await getUser()).toBeNull();
  });

  it("getProfile resolves profile and role_data fallback", async () => {
    getUserMock.mockResolvedValue({
      data: { user: { id: "u1" } },
      error: null,
    });
    maybeSingleProfileMock.mockResolvedValueOnce({
      data: { id: "u1", role_id: "role-1", role_data: null },
    });
    maybeSingleRoleMock.mockResolvedValueOnce({
      data: { id: "role-1", permissions: ["*"] },
    });

    const profile = await getProfile();
    expect(profile).toEqual({
      id: "u1",
      role_id: "role-1",
      role_data: { id: "role-1", permissions: ["*"] },
    });

    getUserMock.mockResolvedValueOnce({ data: { user: null }, error: null });
    expect(await getProfile()).toBeNull();

    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "u1" } },
      error: null,
    });
    maybeSingleProfileMock.mockResolvedValueOnce({ data: null });
    expect(await getProfile()).toBeNull();
  });

  it("verifyManagerPin validates blank pin, role, and permissions", async () => {
    expect(await verifyManagerPin("tenant-1", "   ")).toBeNull();

    const maybeSinglePin = vi.fn();
    mockAdminClient.from.mockReturnValue({
      select: () => ({
        eq: () => ({
          eq: () => ({
            limit: () => ({
              maybeSingle: maybeSinglePin,
            }),
          }),
        }),
      }),
    });

    maybeSinglePin.mockResolvedValueOnce({ data: null, error: null });
    expect(await verifyManagerPin("tenant-1", "1234")).toBeNull();

    maybeSinglePin.mockResolvedValueOnce({
      data: { id: "w1", role: "WAITER", role_data: { permissions: [] } },
      error: null,
    });
    expect(await verifyManagerPin("tenant-1", "1234")).toBeNull();

    maybeSinglePin.mockResolvedValueOnce({
      data: {
        id: "m1",
        role: "WAITER",
        role_data: { permissions: ["pos.cancel_order"] },
      },
      error: null,
    });
    expect(await verifyManagerPin("tenant-1", "9999")).toMatchObject({
      id: "m1",
    });
  });
});
