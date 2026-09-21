import { describe, it, expect, vi, beforeEach } from "vitest";
import { createKittnMcpServer, KITTN_TOOLS_SCHEMAS } from "../server";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from "@modelcontextprotocol/sdk/types.js";

// Mock global fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe("mcp/server", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.KITTN_API_KEY;
  });

  it("should define exactly 10 schemas for MCP tools", () => {
    expect(KITTN_TOOLS_SCHEMAS.length).toBe(10);
    const names = KITTN_TOOLS_SCHEMAS.map((t) => t.name);
    expect(names).toContain("get_dashboard_metrics");
    expect(names).toContain("get_active_orders");
    expect(names).toContain("get_order_details");
    expect(names).toContain("get_sales_report");
    expect(names).toContain("get_popular_items");
    expect(names).toContain("get_inventory_status");
    expect(names).toContain("get_recipe_details");
    expect(names).toContain("get_daily_cuts");
    expect(names).toContain("get_expenses_summary");
    expect(names).toContain("get_menu_catalog");
  });

  it("should return list of tools on ListToolsRequest", async () => {
    const server = createKittnMcpServer({ apiKey: "kt_live_test_123" });
    const handler = (server as any)._requestHandlers.get(ListToolsRequestSchema.shape.method.value);
    expect(handler).toBeDefined();

    const res = await handler({
      method: "tools/list",
      params: {},
    });
    expect(res.tools.length).toBe(10);
  });

  it("should throw error if apiKey is not configured on tool call", async () => {
    const server = createKittnMcpServer();
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    await expect(
      handler({
        method: "tools/call",
        params: {
          name: "get_dashboard_metrics",
          arguments: {},
        },
      }),
    ).rejects.toThrow("KITTN_API_KEY no configurada");
  });

  it("should throw error if called tool is not recognized", async () => {
    const server = createKittnMcpServer({ apiKey: "kt_live_valid123" });
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    await expect(
      handler({
        method: "tools/call",
        params: {
          name: "unknown_tool",
          arguments: {},
        },
      }),
    ).rejects.toThrow("Herramienta no encontrada");
  });

  it("should call Gateway API and return result successfully", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        success: true,
        result: { total_sales: 1500 },
      }),
    });

    const server = createKittnMcpServer({ apiKey: "kt_live_valid123" });
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const res = await handler({
      method: "tools/call",
      params: {
        name: "get_dashboard_metrics",
        arguments: { date: "2026-09-21" },
      },
    });

    expect(mockFetch).toHaveBeenCalledWith(
      "https://admin.trykittn.com/api/mcp/v1/query",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer kt_live_valid123",
        }),
      }),
    );
    expect(res.content[0].text).toContain("1500");
  });

  it("should handle error response from API Gateway", async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      statusText: "Unauthorized",
      json: async () => ({ error: "Invalid tenant" }),
    });

    const server = createKittnMcpServer({ apiKey: "kt_live_valid123" });
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const res = await handler({
      method: "tools/call",
      params: {
        name: "get_dashboard_metrics",
        arguments: {},
      },
    });

    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("Invalid tenant");
  });

  it("should handle network connection errors gracefully", async () => {
    mockFetch.mockRejectedValueOnce(new Error("ECONNREFUSED"));

    const server = createKittnMcpServer({ apiKey: "kt_live_valid123" });
    const handler = (server as any)._requestHandlers.get(CallToolRequestSchema.shape.method.value);

    const res = await handler({
      method: "tools/call",
      params: {
        name: "get_dashboard_metrics",
        arguments: {},
      },
    });

    expect(res.isError).toBe(true);
    expect(res.content[0].text).toContain("ECONNREFUSED");
  });
});
