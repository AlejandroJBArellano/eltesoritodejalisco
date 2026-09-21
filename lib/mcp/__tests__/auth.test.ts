import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  generateApiKey,
  hashApiKey,
  extractRawKey,
  validateMcpApiKey,
  createTenantApiKeyAction,
  listTenantApiKeysAction,
  revokeTenantApiKeyAction,
} from "../auth";

// Mocks
const mockSingle = vi.fn();
const mockSelect = vi.fn();
const mockInsert = vi.fn();
const mockUpdate = vi.fn();
const mockDelete = vi.fn();
const mockEq = vi.fn();
const mockOrder = vi.fn();

const chain: any = {
  select: mockSelect,
  insert: mockInsert,
  update: mockUpdate,
  delete: mockDelete,
  eq: mockEq,
  order: mockOrder,
  single: mockSingle,
};

mockSelect.mockReturnValue(chain);
mockInsert.mockReturnValue(chain);
mockUpdate.mockReturnValue(chain);
mockDelete.mockReturnValue(chain);
mockEq.mockReturnValue(chain);
mockOrder.mockReturnValue(chain);

const mockFrom = vi.fn((table: string) => chain);

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: mockFrom,
  }),
}));

const mockGetProfile = vi.fn();
vi.mock("@/lib/auth", () => ({
  getProfile: () => mockGetProfile(),
}));

const mockGetTenantContext = vi.fn();
vi.mock("@/lib/tenant", () => ({
  getTenantContext: () => mockGetTenantContext(),
}));

const mockHasPermission = vi.fn();
vi.mock("@/lib/permissions", () => ({
  hasPermission: (p: any, perm: string) => mockHasPermission(p, perm),
}));

describe("lib/mcp/auth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockSingle.mockResolvedValue({ data: null, error: null });
    mockOrder.mockResolvedValue({ data: [], error: null });
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
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: "Not found" } });

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

  describe("createTenantApiKeyAction", () => {
    it("should reject unauthorized users", async () => {
      mockGetProfile.mockResolvedValueOnce(null);
      const res = await createTenantApiKeyAction();
      expect(res.error).toBe("No autorizado");
    });

    it("should reject users without admin/manager role or permission", async () => {
      mockGetProfile.mockResolvedValueOnce({ id: "u-1", role: "WAITER" });
      mockHasPermission.mockReturnValueOnce(false);

      const res = await createTenantApiKeyAction();
      expect(res.error).toBe("No autorizado");
    });

    it("should create key successfully for authorized admin", async () => {
      mockGetProfile.mockResolvedValueOnce({ id: "u-1", role: "ADMIN" });
      mockGetTenantContext.mockResolvedValueOnce({ id: "tenant-1" });
      mockSingle.mockResolvedValueOnce({
        data: {
          id: "key-1",
          name: "Claude Assistant",
          key_prefix: "kt_live_123...",
          created_at: "2026-09-21T00:00:00.000Z",
        },
        error: null,
      });

      const res = await createTenantApiKeyAction("Claude Assistant");
      expect(res.success).toBe(true);
      expect(res.key?.rawKey.startsWith("kt_live_")).toBe(true);
      expect(res.key?.id).toBe("key-1");
    });

    it("should handle database insert errors", async () => {
      mockGetProfile.mockResolvedValueOnce({ id: "u-1", role: "ADMIN" });
      mockGetTenantContext.mockResolvedValueOnce({ id: "tenant-1" });
      mockSingle.mockResolvedValueOnce({ data: null, error: { message: "DB Error" } });

      const res = await createTenantApiKeyAction();
      expect(res.error).toBe("Error al generar la API key");
    });
  });

  describe("listTenantApiKeysAction", () => {
    it("should reject unauthorized users", async () => {
      mockGetProfile.mockResolvedValueOnce(null);
      const res = await listTenantApiKeysAction();
      expect(res.error).toBe("No autorizado");
    });

    it("should return keys for authorized manager", async () => {
      mockGetProfile.mockResolvedValueOnce({ id: "u-1", role: "MANAGER" });
      mockGetTenantContext.mockResolvedValueOnce({ id: "tenant-1" });
      mockOrder.mockResolvedValueOnce({
        data: [{ id: "key-1", name: "MCP", key_prefix: "kt_live_...", scopes: [], last_used_at: null, created_at: "2026-09-21" }],
        error: null,
      });

      const res = await listTenantApiKeysAction();
      expect(res.success).toBe(true);
      expect(res.keys.length).toBe(1);
    });

    it("should handle error when querying keys", async () => {
      mockGetProfile.mockResolvedValueOnce({ id: "u-1", role: "ADMIN" });
      mockGetTenantContext.mockResolvedValueOnce({ id: "tenant-1" });
      mockOrder.mockResolvedValueOnce({ data: null, error: { message: "Query error" } });

      const res = await listTenantApiKeysAction();
      expect(res.error).toBe("Error al listar las claves");
    });
  });

  describe("revokeTenantApiKeyAction", () => {
    it("should reject unauthorized users", async () => {
      mockGetProfile.mockResolvedValueOnce(null);
      const res = await revokeTenantApiKeyAction("k-1");
      expect(res.error).toBe("No autorizado");
    });

    it("should revoke key successfully for admin", async () => {
      mockGetProfile.mockResolvedValueOnce({ id: "u-1", role: "ADMIN" });
      mockGetTenantContext.mockResolvedValueOnce({ id: "tenant-1" });
      mockEq.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: null }) });

      const res = await revokeTenantApiKeyAction("k-1");
      expect(res.success).toBe(true);
    });

    it("should handle db error on revoke", async () => {
      mockGetProfile.mockResolvedValueOnce({ id: "u-1", role: "ADMIN" });
      mockGetTenantContext.mockResolvedValueOnce({ id: "tenant-1" });
      mockEq.mockReturnValueOnce({ eq: vi.fn().mockResolvedValueOnce({ error: { message: "Delete err" } }) });

      const res = await revokeTenantApiKeyAction("k-1");
      expect(res.error).toBe("Error al revocar la API key");
    });
  });
});
