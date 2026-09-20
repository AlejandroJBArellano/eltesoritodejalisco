import { describe, it, expect, vi, beforeEach } from "vitest";
import { getTenantCollaborators, sanitizeRole } from "../users";

const mockUpsert = vi.fn().mockResolvedValue({ error: null });
const mockProfilesSelect = vi.fn();
const mockUsersSelect = vi.fn();
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
      if (table === "users") {
        return {
          select: () => ({
            eq: () => mockUsersSelect(),
          }),
          upsert: mockUpsert,
        };
      }
      return {
        select: () => ({ eq: () => Promise.resolve({ data: [], error: null }) }),
        upsert: mockUpsert,
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

    it("falls back to WAITER for unrecognized roles", () => {
      expect(sanitizeRole("SUPERADMIN")).toBe("WAITER");
      expect(sanitizeRole("OTHER")).toBe("WAITER");
    });
  });

  describe("getTenantCollaborators", () => {
    it("merges profiles, db users, and auth users into a sorted list", async () => {
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

      mockUsersSelect.mockResolvedValueOnce({
        data: [
          {
            id: "user-3",
            name: "Carlos Repartidor",
            email: "carlos@birria.com",
            role: "WAITER",
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

      expect(collaborators).toHaveLength(3);
      // Alphabetical order: Ana, Beto, Carlos
      expect(collaborators[0].name).toBe("Ana Mesera");
      expect(collaborators[1].name).toBe("Beto Cocinero");
      expect(collaborators[2].name).toBe("Carlos Repartidor");

      // Verifies auto-sync upsert was invoked for public.users
      expect(mockUpsert).toHaveBeenCalled();
    });

    it("handles empty profiles and users gracefully", async () => {
      mockProfilesSelect.mockResolvedValueOnce({ data: [], error: null });
      mockUsersSelect.mockResolvedValueOnce({ data: [], error: null });
      mockListUsers.mockResolvedValueOnce({ data: { users: [] }, error: null });

      const collaborators = await getTenantCollaborators("tenant-empty");
      expect(collaborators).toEqual([]);
      expect(mockUpsert).not.toHaveBeenCalled();
    });
  });
});
