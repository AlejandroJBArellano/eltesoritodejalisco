import { describe, it, expect, vi, beforeEach } from "vitest";
import { createUser, updateUserRole, deleteUser } from "../actions";
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

describe("Admin Users Server Actions", () => {
  const mockTenant = { id: "tenant-test-123" };
  const mockAdminProfile = {
    id: "admin-id-1",
    role: "ADMIN",
    tenant_id: "tenant-test-123",
  };

  const mockCreateUser = vi.fn();
  const mockListUsers = vi.fn();
  const mockFromSelect = vi.fn();
  const mockFromUpsert = vi.fn();
  const mockFromUpdate = vi.fn();
  const mockFromDelete = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getProfile).mockResolvedValue(mockAdminProfile as any);
    vi.mocked(getTenantContext).mockResolvedValue(mockTenant as any);

    const mockAdminClient = {
      auth: {
        admin: {
          createUser: mockCreateUser,
          listUsers: mockListUsers,
          updateUserById: vi.fn().mockResolvedValue({ data: {}, error: null }),
          deleteUser: vi.fn().mockResolvedValue({ data: {}, error: null }),
        },
      },
      from: vi.fn().mockImplementation((_table: string) => {
        const queryBuilder: any = {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          or: vi.fn().mockReturnThis(),
          ilike: vi.fn().mockReturnThis(),
          maybeSingle: mockFromSelect,
          single: mockFromSelect,
          upsert: mockFromUpsert.mockResolvedValue({ error: null }),
          update: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              eq: mockFromUpdate.mockResolvedValue({ error: null }),
            })),
          })),
          delete: vi.fn().mockImplementation(() => ({
            eq: vi.fn().mockImplementation(() => ({
              eq: mockFromDelete.mockResolvedValue({ error: null }),
            })),
          })),
        };
        return queryBuilder;
      }),
    };

    vi.mocked(createAdminClient).mockReturnValue(mockAdminClient as any);
  });

  it("returns unauthorized when profile is not admin or manager", async () => {
    vi.mocked(getProfile).mockResolvedValueOnce({
      id: "waiter-1",
      role: "WAITER",
      tenant_id: "tenant-test-123",
    } as any);

    const formData = new FormData();
    formData.append("email", "nuevo@gmail.com");
    formData.append("full_name", "Nuevo Empleado");
    formData.append("role", "WAITER");

    const res = await createUser(formData);
    expect(res).toEqual({ error: "No autorizado" });
  });

  it("returns error when required fields are missing", async () => {
    const formData = new FormData();
    formData.append("email", "incompleto@gmail.com");
    // missing full_name and role

    const res = await createUser(formData);
    expect(res).toEqual({ error: "Faltan datos requeridos" });
  });

  it("returns error when email is already registered in this tenant", async () => {
    mockFromSelect.mockResolvedValueOnce({
      data: { id: "existing-profile-id" },
      error: null,
    });

    const formData = new FormData();
    formData.append("email", "existente@eltesorito.com");
    formData.append("full_name", "Ya Registrado");
    formData.append("role", "WAITER");

    const res = await createUser(formData);
    expect(res).toEqual({
      error: "El correo ya está registrado en este restaurante",
    });
  });

  it("creates user successfully with auto-generated password if omitted (for Google OAuth)", async () => {
    mockFromSelect.mockResolvedValueOnce({ data: null, error: null });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: { id: "new-auth-user-id" } },
      error: null,
    });

    const formData = new FormData();
    formData.append("email", "googleuser@gmail.com");
    formData.append("full_name", "Usuario Google");
    formData.append("role", "WAITER");
    // password is intentionally omitted

    const res = await createUser(formData);
    expect(res).toEqual({ success: true });
    expect(mockCreateUser).toHaveBeenCalledWith(
      expect.objectContaining({
        email: "googleuser@gmail.com",
        password: expect.any(String),
      }),
    );
    expect(mockFromUpsert).toHaveBeenCalled();
  });

  it("links existing global Supabase Auth user to this restaurant when email exists in auth", async () => {
    mockFromSelect.mockResolvedValueOnce({ data: null, error: null });
    mockCreateUser.mockResolvedValueOnce({
      data: { user: null },
      error: { message: "A user with this email address has already been registered" },
    });
    mockListUsers.mockResolvedValueOnce({
      data: {
        users: [
          { id: "global-user-123", email: "existingglobal@gmail.com" },
        ],
      },
      error: null,
    });

    const formData = new FormData();
    formData.append("email", "existingglobal@gmail.com");
    formData.append("full_name", "Global User");
    formData.append("role", "CHEF");

    const res = await createUser(formData);
    expect(res).toEqual({ success: true });
    expect(mockFromUpsert).toHaveBeenCalled();
  });

  it("updates user role with system role slug", async () => {
    mockFromSelect.mockResolvedValueOnce({
      data: { id: "role-manager-id", name: "Gerente", system_slug: "MANAGER" },
      error: null,
    });

    const res = await updateUserRole("user-1", "MANAGER");
    expect(res).toEqual({ success: true });
    expect(mockFromUpdate).toHaveBeenCalled();
  });

  it("updates user role with custom role UUID and persists role_id", async () => {
    const customRoleId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
    mockFromSelect.mockResolvedValueOnce({
      data: { id: customRoleId, name: "Carlos", system_slug: null },
      error: null,
    });

    const res = await updateUserRole("user-1", customRoleId);
    expect(res).toEqual({ success: true });
    expect(mockFromUpdate).toHaveBeenCalled();
  });

  it("applies safe fallback when direct role name update fails on profiles", async () => {
    const customRoleId = "a1b2c3d4-e5f6-7a8b-9c0d-1e2f3a4b5c6d";
    mockFromSelect.mockResolvedValueOnce({
      data: { id: customRoleId, name: "Carlos", system_slug: null },
      error: null,
    });

    // First update on profiles fails (e.g. enum constraint), second update on profiles (fallback) succeeds, third update on users table succeeds
    mockFromUpdate
      .mockResolvedValueOnce({ error: { message: 'invalid input value for enum UserRole: "Carlos"' } })
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: null });

    const res = await updateUserRole("user-1", customRoleId);
    expect(res).toEqual({ success: true });
    expect(mockFromUpdate).toHaveBeenCalledTimes(3);
  });

  it("prevents self-deletion in deleteUser", async () => {
    const res = await deleteUser("admin-id-1");
    expect(res).toEqual({ error: "No te puedes borrar a ti mismo" });
  });

  it("deletes user profile successfully for another user", async () => {
    mockFromSelect.mockResolvedValueOnce({ data: [], error: null });
    const res = await deleteUser("other-user-id");
    expect(res).toEqual({ success: true });
    expect(mockFromDelete).toHaveBeenCalled();
  });
});
