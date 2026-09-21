import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTenantCollaborators, sanitizeRole } from "../users";

const mockProfilesSelect = vi.fn();
const mockListUsers = vi.fn();

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => ({
    from: (table: string) => {
      if (table === "profiles") {
        return {
          select: () => ({
            eq: () => mockProfilesSelect(),
          }),
        };
      }
      return {
        select: () => ({
          eq: () => Promise.resolve({ data: [], error: null }),
        }),
      };
    },
    auth: {
      admin: {
        listUsers: mockListUsers,
      },
    },
  }),
}));

describe("lib/users.ts", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("sanitizeRole", () => {
    it("returns WAITER if undefined or null", () => {
      expect(sanitizeRole(undefined)).toBe("WAITER");
      expect(sanitizeRole(null)).toBe("WAITER");
    });

    it("returns valid upper roles", () => {
      expect(sanitizeRole("ADMIN")).toBe("ADMIN");
      expect(sanitizeRole("manager")).toBe("MANAGER");
      expect(sanitizeRole("CHEF")).toBe("CHEF");
      expect(sanitizeRole("inventory")).toBe("INVENTORY");
      expect(sanitizeRole("waiter")).toBe("WAITER");
    });

    it("preserves custom role names trimmed", () => {
      expect(sanitizeRole("Encargado de Barra")).toBe("Encargado de Barra");
      expect(sanitizeRole("Carlos")).toBe("Carlos");
    });
  });

  describe("getTenantCollaborators", () => {
    it("merges profiles and auth metadata into a sorted list", async () => {
      mockProfilesSelect.mockResolvedValueOnce({
        data: [
          {
            id: "user-1",
            full_name: "Beto Cocinero",
            email: "beto@birria.com",
            role: "CHEF",
            pin: "1234",
          },
          {
            id: "user-2",
            full_name: null, // to be resolved from auth metadata
            email: "ana@birria.com",
            role: "WAITER",
            pin: null,
          },
        ],
        error: null,
      });

      mockListUsers.mockResolvedValueOnce({
        data: {
          users: [
            {
              id: "user-2",
              email: "ana@birria.com",
              user_metadata: { name: "Ana Mesera", role: "WAITER" },
            },
          ],
        },
        error: null,
      });

      const collaborators = await getTenantCollaborators("tenant-birria-1");

      expect(collaborators).toHaveLength(2);
      // Alphabetical order: Ana, Beto
      expect(collaborators[0].name).toBe("Ana Mesera");
      expect(collaborators[1].name).toBe("Beto Cocinero");
    });

    it("handles empty profiles gracefully", async () => {
      mockProfilesSelect.mockResolvedValueOnce({ data: [], error: null });
      mockListUsers.mockResolvedValueOnce({ data: { users: [] }, error: null });

      const collaborators = await getTenantCollaborators("tenant-empty");
      expect(collaborators).toEqual([]);
    });
  });
});
