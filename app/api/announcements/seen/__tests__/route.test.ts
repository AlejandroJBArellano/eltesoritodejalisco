import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

const rpc = vi.hoisted(() => vi.fn());
vi.mock("@/lib/auth", () => ({ getUser: vi.fn() }));
vi.mock("@/lib/supabase/server", () => ({
  createClient: vi.fn(async () => ({ rpc })),
}));

import { POST } from "../route";
import { getUser } from "@/lib/auth";

const post = (body: unknown) =>
  POST(
    new NextRequest("http://localhost/api/announcements/seen", {
      method: "POST",
      body: JSON.stringify(body),
    }),
  );

describe("POST /api/announcements/seen", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getUser).mockResolvedValue({ id: "user-1" } as never);
    rpc.mockResolvedValue({
      data: { "customization-v1": "2026-11-14T00:00:00Z" },
      error: null,
    });
  });

  it("marks a known announcement for the signed-in user", async () => {
    const res = await post({ key: "customization-v1" });
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("mark_announcement_seen", { p_key: "customization-v1" });
    expect((await res.json()).seen).toEqual({ "customization-v1": "2026-11-14T00:00:00Z" });
  });

  it("requires a session", async () => {
    vi.mocked(getUser).mockResolvedValue(null);
    expect((await post({ key: "customization-v1" })).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("rejects unknown or malformed keys", async () => {
    expect((await post({ key: "no-existe" })).status).toBe(400);
    expect((await post({ key: "Bad Key!" })).status).toBe(400);
    expect((await post({})).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("returns 500 when the database call fails", async () => {
    rpc.mockResolvedValue({ data: null, error: { message: "boom" } });
    expect((await post({ key: "customization-v1" })).status).toBe(500);
  });
});
