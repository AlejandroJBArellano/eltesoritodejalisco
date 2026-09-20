import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  getTenantRoles,
  createCustomRole,
  updateCustomRole,
  duplicateRole,
  deleteCustomRole,
} from "../roles-actions";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { createAdminClient } from "@/lib/supabase/admin";

vi.mock("@/lib/auth", () => ({
  getProfile: vi.fn(),
}));

vi.mock("@/lib/tenant", () => ({
  getTenantContext: vi.fn(),
}));

vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: vi.fn(),
}));

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
}));

describe("Roles Server Actions", () => {
  const mockTenant = { id: "tenant-test-123" };
  const mockAdminProfile = {
    id: "admin-id-1",
    role: "ADMIN",
    tenant_id: "tenant-test-123",
  };

  const mockRolesData = [
    {
      id: "role-1",
      tenant_id: "tenant-test-123",
      name: "Administrador",
      is_system: true,
      system_slug: "ADMIN",
      permissions: ["*"],
    },
    {
      id: "role-2",
      tenant_id: "tenant-test-123",
      name: "Capitán",
      is_system: false,
      system_slug: null,
      permissions: ["pos.view", "pos.apply_discount"],
    },
  ];

  let mockAdminClient: any;

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProfile).mockResolvedValue(mockAdminProfile as any);
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);

    mockAdminClient = {
      from: vi.fn(),
    };
    vi.mocked(createAdminClient).mockReturnValue(mockAdminClient);
  });

  describe("getTenantRoles", () => {
    it("debe retornar la lista de roles enriquecida con user_count", async () => {
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === "roles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({ data: mockRolesData, error: null }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockResolvedValue({
                data: [
                  { id: "u-1", role: "ADMIN", role_id: "role-1" },
                  { id: "u-2", role: "Capitán", role_id: "role-2" },
                ],
              }),
            }),
          };
        }
        return {};
      });

      const res = await getTenantRoles();
      expect(res.data).toBeDefined();
      expect(res.data?.length).toBe(2);
      expect(res.data?.[0].user_count).toBe(1);
    });

    it("debe retornar error si no está autenticado", async () => {
      vi.mocked(getProfile).mockResolvedValue(null);
      const res = await getTenantRoles();
      expect(res.error).toBe("No autenticado");
    });
  });

  describe("createCustomRole", () => {
    it("debe crear un rol personalizado correctamente", async () => {
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === "roles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                ilike: vi.fn().mockReturnValue({
                  maybeSingle: vi.fn().mockResolvedValue({ data: null }),
                }),
              }),
            }),
            insert: vi.fn().mockReturnValue({
              select: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({
                  data: {
                    id: "new-role-id",
                    name: "Sommelier",
                    permissions: ["menu.view"],
                    is_system: false,
                  },
                  error: null,
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await createCustomRole({
        name: "Sommelier",
        permissions: ["menu.view"],
      });

      expect(res.success).toBe(true);
      expect(res.role?.name).toBe("Sommelier");
    });

    it("debe fallar si el nombre está vacío o no tiene permisos", async () => {
      const res1 = await createCustomRole({ name: "", permissions: ["menu.view"] });
      expect(res1.error).toContain("El nombre del rol es requerido");

      const res2 = await createCustomRole({ name: "Cajero", permissions: [] });
      expect(res2.error).toContain("Debes seleccionar al menos un permiso");
    });

    it("debe fallar si ya existe un rol con el mismo nombre", async () => {
      mockAdminClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: { id: "existing-id" } }),
            }),
          }),
        }),
      }));

      const res = await createCustomRole({
        name: "Administrador",
        permissions: ["*"],
      });
      expect(res.error).toContain("Ya existe un rol llamado");
    });
  });

  describe("updateCustomRole", () => {
    it("debe actualizar un rol personalizado existente", async () => {
      mockAdminClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "role-2", name: "Capitán", is_system: false },
                error: null,
              }),
            }),
            ilike: vi.fn().mockReturnValue({
              neq: vi.fn().mockReturnValue({
                maybeSingle: vi.fn().mockResolvedValue({ data: null }),
              }),
            }),
          }),
        }),
        update: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({ error: null }),
          }),
        }),
      }));

      const res = await updateCustomRole("role-2", {
        name: "Capitán General",
        permissions: ["pos.view", "pos.apply_discount"],
      });

      expect(res.success).toBe(true);
    });

    it("debe rechazar actualizar roles del sistema", async () => {
      mockAdminClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "role-1", name: "Administrador", is_system: true },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const res = await updateCustomRole("role-1", {
        name: "Admin Modificado",
        permissions: ["*"],
      });

      expect(res.error).toContain("Los roles predeterminados del sistema no pueden modificarse");
    });
  });

  describe("duplicateRole", () => {
    it("debe clonar los permisos de un rol base y crear uno nuevo", async () => {
      mockAdminClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: {
                  id: "role-waiter",
                  name: "Mesero",
                  permissions: ["pos.view", "pos.create_order"],
                  is_system: true,
                },
                error: null,
              }),
            }),
            ilike: vi.fn().mockReturnValue({
              maybeSingle: vi.fn().mockResolvedValue({ data: null }),
            }),
          }),
        }),
        insert: vi.fn().mockReturnValue({
          select: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({
              data: {
                id: "new-copy-id",
                name: "Mesero VIP",
                permissions: ["pos.view", "pos.create_order"],
                is_system: false,
              },
              error: null,
            }),
          }),
        }),
      }));

      const res = await duplicateRole("role-waiter", "Mesero VIP");
      expect(res.success).toBe(true);
      expect(res.role?.name).toBe("Mesero VIP");
    });
  });

  describe("deleteCustomRole", () => {
    it("debe rechazar eliminar un rol del sistema", async () => {
      mockAdminClient.from.mockImplementation(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            eq: vi.fn().mockReturnValue({
              single: vi.fn().mockResolvedValue({
                data: { id: "role-1", is_system: true },
                error: null,
              }),
            }),
          }),
        }),
      }));

      const res = await deleteCustomRole("role-1");
      expect(res.error).toContain("Los roles predeterminados del sistema no pueden ser eliminados");
    });

    it("debe solicitar reasignación si el rol tiene usuarios asignados", async () => {
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === "roles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "role-custom", is_system: false },
                    error: null,
                  }),
                }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [{ id: "u-1" }, { id: "u-2" }],
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await deleteCustomRole("role-custom");
      expect(res.error).toContain("tiene 2 colaborador(es) asignado(s)");
    });

    it("debe eliminar el rol exitosamente si no tiene usuarios asignados", async () => {
      mockAdminClient.from.mockImplementation((table: string) => {
        if (table === "roles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockReturnValue({
                  single: vi.fn().mockResolvedValue({
                    data: { id: "role-custom", is_system: false },
                    error: null,
                  }),
                }),
              }),
            }),
            delete: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({ error: null }),
              }),
            }),
          };
        }
        if (table === "profiles") {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                eq: vi.fn().mockResolvedValue({
                  data: [],
                }),
              }),
            }),
          };
        }
        return {};
      });

      const res = await deleteCustomRole("role-custom");
      expect(res.success).toBe(true);
    });
  });
});
