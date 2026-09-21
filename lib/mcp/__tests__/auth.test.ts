import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  extractRawKey,
  validateMcpApiKey,
} from "../auth";

// Mocks
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();

const chain: any = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  single: mockSingle,
};

mockSelect.mockReturnValue(chain);
mockInsert.mockReturnValue(chain);
mockUpdate.mockReturnValue(chain);
mockDelete.mockReturnValue(chain);
mockEq.mockReturnValue(chain);

const mockFrom = vi.fn((table: string) => chain);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

describe("lib/mcp/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockEq.mockReturnValue(chain);
  });

  describe("generateApiKey & hashApiKey & extractRawKey", () => {
    it("should generate a valid key format kt_live_ with prefix and sha256 hash", () => {
      const { rawKey, keyPrefix, keyHash } = generateApiKey();

      expect(rawKey.startsWith("kt_live_")).toBe(true);
      expect(rawKey.length).toBeGreaterThan(32);
      expect(keyPrefix.startsWith("kt_live_")).toBe(true);
      expect(keyPrefix.endsWith("...")).toBe(true);
      expect(keyHash).toBe(hashApiKey(rawKey));
    });

    it("should extract raw key from string or Bearer header", () => {
      expect(extractRawKey("Bearer kt_live_123")).toBe("kt_live_123");
      expect(extractRawKey("  kt_live_456  ")).toBe("kt_live_456");
      expect(extractRawKey(null as any)).toBeNull();
      expect(extractRawKey("")).toBeNull();
    });
  });

  describe("validateMcpApiKey", () => {
    it("should fail if no key provided", async () => {
      const res = await validateMcpApiKey(null);
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toBe("API Key requerida");
      }
    });

    it("should fail if key format is invalid", async () => {
      const res = await validateMcpApiKey("invalid_prefix_123");
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toBe("Formato de API Key inválido");
      }
    });

    it("should fail if key not found in database", async () => {
      mockSingle.mockResolvedValueOnce({
        data: null,
        error: { message: "Not found" },
      });

      const res = await validateMcpApiKey("kt_live_1234567890abcdef12345678");
      expect(res.valid).toBe(false);
      if (!res.valid) {
        expect(res.error).toBe("API Key no válida o revocada");
      }
    });

    it("should succeed and return tenant context when key is valid", async () => {
      const key = "kt_live_abcdef1234567890abcdef12345678";
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "key-123",
          tenant_id: "tenant-999",
          name: "Test MCP",
          scopes: ["analytics:read", "orders:read"],
        },
        error: null,
      });

      const res = await validateMcpApiKey(`Bearer ${key}`);
      expect(res.valid).toBe(true);
      if (res.valid) {
        expect(res.tenantId).toBe("tenant-999");
        expect(res.keyId).toBe("key-123");
        expect(res.scopes).toEqual(["analytics:read", "orders:read"]);
        expect(res.name).toBe("Test MCP");
      }
    });
  });
});
