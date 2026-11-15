import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTenantSlugFromHost,
  getTenantBySlug,
  getTenantContext,
  invalidateTenantCache,
} from "../tenant";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

const singleMock = vi.fn();

vi.mock("../supabase/admin", () => ({
  createAdminClient: () => ({
    from: () => ({
      select: () => ({
        eq: () => ({
          single: singleMock,
        }),
      }),
    }),
  }),
}));

vi.mock("next/headers", () => ({
  headers: vi.fn(),
}));

vi.mock("next/navigation", () => ({
  redirect: vi.fn(() => {
    throw new Error("NEXT_REDIRECT");
  }),
}));

describe("lib/tenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    invalidateTenantCache();
  });

  it("parses tenant slug from localhost, admin, and pickup hosts", () => {
    expect(getTenantSlugFromHost(null)).toBeNull();
    expect(getTenantSlugFromHost("tesorito.localhost:3000")).toBe("tesorito");
    expect(getTenantSlugFromHost("tesorito.admin.trykittn.com")).toBe(
      "tesorito",
    );
    expect(getTenantSlugFromHost("tesorito.trykittn.com")).toBe("tesorito");
    expect(getTenantSlugFromHost("trykittn.com")).toBeNull();
  });

  it("caches getTenantBySlug across calls and invalidates cleanly", async () => {
    singleMock.mockResolvedValueOnce({
      data: { id: "t-1", slug: "tesorito", name: "Tesorito" },
      error: null,
    });

    const first = await getTenantBySlug("tesorito");
    const second = await getTenantBySlug("tesorito");

    expect(first).toEqual({ id: "t-1", slug: "tesorito", name: "Tesorito" });
    expect(second).toEqual(first);
    expect(singleMock).toHaveBeenCalledTimes(1);

    invalidateTenantCache("tesorito");
    singleMock.mockResolvedValueOnce({ data: null, error: new Error("missing") });
    expect(await getTenantBySlug("tesorito")).toBeNull();
  });

  it("getTenantContext resolves from header or host and redirects when missing", async () => {
    singleMock.mockResolvedValueOnce({
      data: { id: "t-2", slug: "prueba", name: "Prueba" },
      error: null,
    });
    vi.mocked(headers).mockResolvedValueOnce(
      new Headers({ "x-tenant-slug": "prueba" }) as any,
    );

    const ctx = await getTenantContext();
    expect(ctx.slug).toBe("prueba");

    // Host fallback
    vi.mocked(headers).mockResolvedValueOnce(
      new Headers({ host: "prueba.admin.trykittn.com" }) as any,
    );
    const ctxFromHost = await getTenantContext();
    expect(ctxFromHost.id).toBe("t-2");

    // Missing slug redirects
    vi.mocked(headers).mockResolvedValueOnce(new Headers({}) as any);
    await expect(getTenantContext()).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("https://trykittn.com");

    // Non-existent tenant slug redirects and catches DB throw
    invalidateTenantCache("missing");
    singleMock.mockRejectedValueOnce(new Error("db down"));
    vi.mocked(headers).mockResolvedValueOnce(
      new Headers({ "x-tenant-slug": "missing" }) as any,
    );
    await expect(getTenantContext()).rejects.toThrow("NEXT_REDIRECT");
  });
});
