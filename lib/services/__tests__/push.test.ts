import { describe, it, expect, vi, beforeEach } from "vitest";
import { sendTenantPushNotification } from "../push";

const { mockSendNotification, mockSetVapidDetails, mockSupabaseFrom } = vi.hoisted(() => {
  const mockSendNotification = vi.fn().mockResolvedValue({});
  const mockSetVapidDetails = vi.fn();

  const mockDeleteIn = vi.fn().mockResolvedValue({ error: null });
  const mockDeleteEq = vi.fn().mockReturnValue({ in: mockDeleteIn });
  const mockDelete = vi.fn().mockReturnValue({ eq: mockDeleteEq, in: mockDeleteIn });

  const mockSelectIn = vi.fn();
  const mockSelectEq = vi.fn().mockReturnValue({ in: mockSelectIn });
  const mockSelect = vi.fn().mockReturnValue({ eq: mockSelectEq, in: mockSelectIn });

  const mockSupabaseFrom = vi.fn().mockReturnValue({
    select: mockSelect,
    delete: mockDelete,
  });

  return {
    mockSendNotification,
    mockSetVapidDetails,
    mockSupabaseFrom,
    mockSelect,
    mockSelectEq,
    mockSelectIn,
    mockDelete,
    mockDeleteIn,
  };
});

vi.mock("web-push", () => ({
  default: {
    setVapidDetails: mockSetVapidDetails,
    sendNotification: mockSendNotification,
  },
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn().mockReturnValue({
    from: mockSupabaseFrom,
  }),
}));

describe("lib/services/push", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY = "test-public-key";
    process.env.VAPID_PRIVATE_KEY = "test-private-key";
    process.env.VAPID_SUBJECT = "mailto:test@trykittn.com";
  });

  it("should return early if VAPID keys are not configured", async () => {
    delete process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PUBLIC_KEY;
    delete process.env.VAPID_PRIVATE_KEY;

    const result = await sendTenantPushNotification("tenant-123", {
      title: "Test Alert",
      body: "Test Body",
    });

    expect(result).toEqual({
      success: false,
      reason: "vapid_not_configured",
    });
  });

  it("should return no_subscribers if tenant has no active push subscriptions", async () => {
    mockSupabaseFrom().select().eq.mockResolvedValueOnce({
      data: [],
      error: null,
    });

    const result = await sendTenantPushNotification("tenant-123", {
      title: "Test Alert",
      body: "Test Body",
    });

    expect(result).toEqual({
      success: true,
      sentCount: 0,
      reason: "no_subscribers",
    });
    expect(mockSendNotification).not.toHaveBeenCalled();
  });

  it("should dispatch push notification to subscribed endpoints", async () => {
    mockSupabaseFrom().select().eq.mockResolvedValueOnce({
      data: [
        {
          id: "sub-1",
          tenant_id: "tenant-123",
          endpoint: "https://push.example.com/sub-1",
          p256dh: "key-1",
          auth: "auth-1",
          role: "ADMIN",
        },
      ],
      error: null,
    });

    const result = await sendTenantPushNotification("tenant-123", {
      title: "🛍️ Nuevo Pedido #001",
      body: "2x Tacos · $70.00 MXN",
      url: "/kitchen",
    });

    expect(result.success).toBe(true);
    expect(result.sentCount).toBe(1);
    expect(mockSendNotification).toHaveBeenCalledWith(
      expect.objectContaining({
        endpoint: "https://push.example.com/sub-1",
        keys: { p256dh: "key-1", auth: "auth-1" },
      }),
      expect.stringContaining("🛍️ Nuevo Pedido #001"),
    );
  });

  it("should filter subscriptions by target roles when specified", async () => {
    const mockRoleIn = vi.fn().mockResolvedValueOnce({
      data: [
        {
          id: "sub-kitchen",
          tenant_id: "tenant-123",
          endpoint: "https://push.example.com/sub-kitchen",
          p256dh: "key-k",
          auth: "auth-k",
          role: "KITCHEN",
        },
      ],
      error: null,
    });

    mockSupabaseFrom().select().eq.mockReturnValueOnce({
      in: mockRoleIn,
    });

    const result = await sendTenantPushNotification(
      "tenant-123",
      { title: "Nueva comanda", body: "En preparación" },
      ["KITCHEN"],
    );

    expect(result.success).toBe(true);
    expect(mockRoleIn).toHaveBeenCalledWith("role", ["KITCHEN"]);
  });
});
