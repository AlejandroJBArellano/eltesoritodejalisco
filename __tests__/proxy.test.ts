import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest, NextResponse } from "next/server";
import { proxy, config } from "../proxy";
import { updateSession } from "@/lib/supabase/middleware";

vi.mock("@/lib/supabase/middleware", () => ({
  updateSession: vi.fn(),
}));

describe("proxy", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(updateSession).mockImplementation(async () => NextResponse.next());
  });

  it("marks public pickup GET /api/menu route as isPublic=true and propagates tenant header and CORS", async () => {
    const req = new NextRequest("http://tesorito.trykittn.com/api/menu", {
      method: "GET",
      headers: {
        origin: "https://tesorito.trykittn.com",
        host: "tesorito.trykittn.com",
        "x-forwarded-for": "10.0.0.1",
      },
    });

    const res = await proxy(req);
    expect(updateSession).toHaveBeenCalledWith(expect.any(NextRequest), true);
    expect(res.headers.get("x-tenant-slug")).toBe("tesorito");
    expect(res.headers.get("Access-Control-Allow-Origin")).toBe(
      "https://tesorito.trykittn.com",
    );
  });

  it("marks protected routes as isPublic=false and handles CORS preflight", async () => {
    const preflight = new NextRequest("http://localhost:3000/api/orders", {
      method: "OPTIONS",
      headers: {
        origin: "http://localhost:5173",
        "x-forwarded-for": "10.0.0.2",
      },
    });
    const preRes = await proxy(preflight);
    expect(preRes.status).toBe(204);
    expect(updateSession).not.toHaveBeenCalled();

    const privReq = new NextRequest("http://tesorito.admin.trykittn.com/pos", {
      method: "GET",
      headers: { host: "tesorito.admin.trykittn.com" },
    });
    await proxy(privReq);
    expect(updateSession).toHaveBeenCalledWith(expect.any(NextRequest), false);
  });

  it("identifies additional public routes, deletes spoofed header without slug, and enforces rate limit", async () => {
    const publicOrdersReq = new NextRequest(
      "http://localhost:3000/api/orders/order-1",
      {
        method: "GET",
        headers: { "x-tenant-slug": "", host: "trykittn.com", "x-forwarded-for": "10.0.0.99" },
      },
    );
    const res = await proxy(publicOrdersReq);
    expect(updateSession).toHaveBeenCalledWith(expect.any(NextRequest), true);
    expect(res.headers.get("x-tenant-slug")).toBeNull();

    // Exceed 60 req/min rate limit for IP 10.0.0.77
    for (let i = 0; i < 60; i++) {
      await proxy(
        new NextRequest("http://localhost:3000/api/tenant", {
          method: "GET",
          headers: { "x-forwarded-for": "10.0.0.77", origin: "https://trykittn.com" },
        }),
      );
    }
    const limitedRes = await proxy(
      new NextRequest("http://localhost:3000/api/tenant", {
        method: "GET",
        headers: { "x-forwarded-for": "10.0.0.77", origin: "https://trykittn.com" },
      }),
    );
    expect(limitedRes.status).toBe(429);
  });

  it("excludes sw.js, manifest.json, and static extensions in matcher", () => {
    const pattern = config.matcher[0];
    expect(pattern).toContain("sw\\.js");
    expect(pattern).toContain("manifest\\.json");
    expect(pattern).toContain("mp3");
    expect(pattern).toContain("woff2");
  });
});
