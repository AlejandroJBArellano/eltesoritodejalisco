import { describe, it, expect, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";
import { updateSession } from "../middleware";

const getUserMock = vi.fn();
const createServerClientMock = vi.fn();

vi.mock("@supabase/ssr", () => ({
  createServerClient: (...args: unknown[]) => createServerClientMock(...args),
}));

describe("lib/supabase/middleware updateSession", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_SUPABASE_URL = "https://example.supabase.co";
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = "anon-key";

    createServerClientMock.mockImplementation((_url, _key, options: any) => {
      options.cookies.getAll();
      options.cookies.setAll([
        { name: "sb-test", value: "new-token", options: { path: "/" } },
      ]);
      return {
        auth: {
          getUser: getUserMock,
        },
      };
    });
  });

  it("skips createServerClient and auth.getUser on public routes", async () => {
    const req = new NextRequest("http://localhost:3000/api/menu", {
      headers: { cookie: "sb-proj-auth-token=abc" },
    });

    const res = await updateSession(req, true);
    expect(res.status).toBe(200);
    expect(createServerClientMock).not.toHaveBeenCalled();
    expect(getUserMock).not.toHaveBeenCalled();
  });

  it("short-circuits without sb-* cookie: returns 401 on protected /api and redirects to /login on pages", async () => {
    const apiReq = new NextRequest("http://localhost:3000/api/orders");
    const apiRes = await updateSession(apiReq, false);
    expect(apiRes.status).toBe(401);
    expect(createServerClientMock).not.toHaveBeenCalled();

    const pageReq = new NextRequest("http://localhost:3000/pos");
    const pageRes = await updateSession(pageReq, false);
    expect(pageRes.status).toBe(307);
    expect(pageRes.headers.get("location")).toBe("http://localhost:3000/login");
  });

  it("allows /login without sb-* cookie without calling Supabase Auth", async () => {
    const loginReq = new NextRequest("http://localhost:3000/login");
    const loginRes = await updateSession(loginReq, false);
    expect(loginRes.status).toBe(200);
    expect(createServerClientMock).not.toHaveBeenCalled();
  });

  it("calls supabase.auth.getUser when sb-* cookie is present and propagates cookies", async () => {
    getUserMock.mockResolvedValueOnce({
      data: { user: { id: "user-1" } },
    });

    const req = new NextRequest("http://localhost:3000/pos", {
      headers: { cookie: "sb-proj-auth-token=valid" },
    });
    const res = await updateSession(req, false);

    expect(res.status).toBe(200);
    expect(createServerClientMock).toHaveBeenCalledTimes(1);
    expect(getUserMock).toHaveBeenCalledTimes(1);
    expect(res.cookies.get("sb-test")?.value).toBe("new-token");
  });

  it("redirects when sb-* cookie exists but getUser returns null", async () => {
    getUserMock.mockResolvedValueOnce({ data: { user: null } });

    const req = new NextRequest("http://localhost:3000/kitchen", {
      headers: { cookie: "sb-proj-auth-token=expired" },
    });
    const res = await updateSession(req, false);

    expect(res.status).toBe(307);
    expect(res.headers.get("location")).toBe("http://localhost:3000/login");
  });
});
