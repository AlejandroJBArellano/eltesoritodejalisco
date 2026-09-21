import { describe, it, expect, vi, beforeEach } from "vitest";
import { POST, GET } from "../route";
import { NextRequest } from "next/server";
import * as authModule from "@/lib/mcp/auth";
import { MCP_TOOLS } from "@/lib/mcp/tools";

vi.mock("@/lib/mcp/auth", () => ({
  validateMcpApiKey: vi.fn(),
}));

describe("app/api/mcp/v1/query/route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET handler", () => {
    it("should return 401 if API key is invalid", async () => {
      vi.mocked(authModule.validateMcpApiKey).mockResolvedValueOnce({
        valid: false,
        error: "API Key requerida",
      });

      const req = new NextRequest("http://localhost:3000/api/mcp/v1/query");
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(401);
      expect(json.error).toBe("API Key requerida");
    });

    it("should return catalog of tools when key is valid", async () => {
      vi.mocked(authModule.validateMcpApiKey).mockResolvedValueOnce({
        valid: true,
        tenantId: "t-1",
        scopes: [],
        keyId: "k-1",
        name: "Key",
      });

      const req = new NextRequest("http://localhost:3000/api/mcp/v1/query", {
        headers: { authorization: "Bearer kt_live_valid123" },
      });
      const res = await GET(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.tools.length).toBe(10);
      expect(json.tenantId).toBe("t-1");
    });
  });

  describe("POST handler", () => {
    it("should return 401 on missing or invalid auth", async () => {
      vi.mocked(authModule.validateMcpApiKey).mockResolvedValueOnce({
        valid: false,
        error: "API Key inválida",
      });

      const req = new NextRequest("http://localhost:3000/api/mcp/v1/query", {
        method: "POST",
        body: JSON.stringify({ tool: "get_dashboard_metrics" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(401);
    });

    it("should return 400 if tool name is missing", async () => {
      vi.mocked(authModule.validateMcpApiKey).mockResolvedValueOnce({
        valid: true,
        tenantId: "t-1",
        scopes: [],
        keyId: "k-1",
        name: "Key",
      });

      const req = new NextRequest("http://localhost:3000/api/mcp/v1/query", {
        method: "POST",
        body: JSON.stringify({}),
      });
      const res = await POST(req);
      expect(res.status).toBe(400);
    });

    it("should return 404 for unrecognized tool", async () => {
      vi.mocked(authModule.validateMcpApiKey).mockResolvedValueOnce({
        valid: true,
        tenantId: "t-1",
        scopes: [],
        keyId: "k-1",
        name: "Key",
      });

      const req = new NextRequest("http://localhost:3000/api/mcp/v1/query", {
        method: "POST",
        body: JSON.stringify({ tool: "non_existent_tool" }),
      });
      const res = await POST(req);
      expect(res.status).toBe(404);
    });

    it("should execute tool and return 200 on success", async () => {
      vi.mocked(authModule.validateMcpApiKey).mockResolvedValueOnce({
        valid: true,
        tenantId: "t-1",
        scopes: [],
        keyId: "k-1",
        name: "Key",
      });

      const spyExecute = vi.spyOn(MCP_TOOLS.get_dashboard_metrics, "execute").mockResolvedValueOnce({
        total_sales: 1000,
      } as any);

      const req = new NextRequest("http://localhost:3000/api/mcp/v1/query", {
        method: "POST",
        body: JSON.stringify({ tool: "get_dashboard_metrics", arguments: { date: "2026-09-21" } }),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(json.result.total_sales).toBe(1000);
      expect(spyExecute).toHaveBeenCalledWith({ date: "2026-09-21" }, { tenantId: "t-1", scopes: [] });
    });

    it("should handle execution errors with 500 status", async () => {
      vi.mocked(authModule.validateMcpApiKey).mockResolvedValueOnce({
        valid: true,
        tenantId: "t-1",
        scopes: [],
        keyId: "k-1",
        name: "Key",
      });

      vi.spyOn(MCP_TOOLS.get_dashboard_metrics, "execute").mockRejectedValueOnce(
        new Error("Database connection lost"),
      );

      const req = new NextRequest("http://localhost:3000/api/mcp/v1/query", {
        method: "POST",
        body: JSON.stringify({ tool: "get_dashboard_metrics" }),
      });
      const res = await POST(req);
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Database connection lost");
    });
  });
});
