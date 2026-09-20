import { createAdminClient } from "@/lib/supabase/admin";
import type { Database } from "@/types/supabase";
import type { ShiftUserOption } from "@/components/admin/shifts/ShiftModal";

export type UserRole = Database["public"]["Enums"]["UserRole"];

const VALID_ROLES = new Set<string>(["ADMIN", "MANAGER", "WAITER", "CHEF", "INVENTORY"]);

export function sanitizeRole(role?: string | null): UserRole {
  if (!role) return "WAITER";
  const upper = role.toUpperCase().trim();
  if (VALID_ROLES.has(upper)) {
    return upper as UserRole;
  }
  return "WAITER";
}

interface CollaboratorEntry extends ShiftUserOption {
  rawRole?: string;
}

/**
 * Obtiene todos los colaboradores registrados para un tenant específico
 * combinando las tablas 'profiles', 'users' y Supabase Auth,
 * y sincroniza automáticamente la tabla 'users' para garantizar las FK de turnos y asistencias.
 */
export async function getTenantCollaborators(tenantId: string): Promise<ShiftUserOption[]> {
  const adminClient = createAdminClient();

  // 1. Obtener perfiles registrados para este tenant
  const { data: profiles, error: profilesError } = await adminClient
    .from("profiles")
    .select("id, full_name, email, role, pin")
    .eq("tenant_id", tenantId);

  if (profilesError) {
    console.error("[getTenantCollaborators] Error fetching profiles:", profilesError);
  }

  // 2. Obtener usuarios existentes en la tabla public.users
  const { data: dbUsers, error: dbUsersError } = await adminClient
    .from("users")
    .select("id, name, email, role")
    .eq("tenant_id", tenantId);

  if (dbUsersError) {
    console.error("[getTenantCollaborators] Error fetching users:", dbUsersError);
  }

  // 3. Obtener usuarios de Auth para resolver nombres o emails si faltan
  let authUsers: Array<{
    id: string;
    email?: string;
    user_metadata?: { name?: string; full_name?: string; role?: string; tenant_id?: string };
  }> = [];

  try {
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();
    if (!authError && authData?.users) {
      authUsers = authData.users;
    }
  } catch (err) {
    console.warn("[getTenantCollaborators] Could not list auth users:", err);
  }

  const authMap = new Map(authUsers.map((u) => [u.id, u]));
  const collaboratorsMap = new Map<string, CollaboratorEntry>();

  // Procesar perfiles (fuente principal de pertenencia al tenant)
  for (const p of profiles || []) {
    const authU = authMap.get(p.id);
    const dbU = dbUsers?.find((u) => u.id === p.id);

    const name =
      p.full_name?.trim() ||
      authU?.user_metadata?.full_name?.trim() ||
      authU?.user_metadata?.name?.trim() ||
      dbU?.name?.trim() ||
      p.email?.split("@")[0] ||
      authU?.email?.split("@")[0] ||
      "Colaborador";

    const role = p.role || authU?.user_metadata?.role || dbU?.role || "WAITER";
    const email = p.email || authU?.email || dbU?.email || "";

    collaboratorsMap.set(p.id, {
      id: p.id,
      name,
      role,
      email,
      rawRole: role,
    });
  }

  // Procesar usuarios en tabla users que pertenezcan a este tenant
  for (const dbU of dbUsers || []) {
    if (!collaboratorsMap.has(dbU.id)) {
      const authU = authMap.get(dbU.id);
      const name =
        dbU.name?.trim() ||
        authU?.user_metadata?.full_name?.trim() ||
        authU?.user_metadata?.name?.trim() ||
        dbU.email?.split("@")[0] ||
        "Colaborador";

      collaboratorsMap.set(dbU.id, {
        id: dbU.id,
        name,
        role: dbU.role || "WAITER",
        email: dbU.email || "",
        rawRole: dbU.role,
      });
    }
  }

  const list = Array.from(collaboratorsMap.values());

  // 4. Sincronizar en public.users para satisfacer las FKs (fk_employee_shifts_users, fk_attendance_users)
  if (list.length > 0) {
    const syncRecords = list.map((c) => ({
      id: c.id,
      tenant_id: tenantId,
      name: c.name,
      email: c.email || `${c.id}@birria.local`,
      role: sanitizeRole(c.rawRole),
      password: "MANAGED_BY_SUPABASE",
    }));

    try {
      await adminClient.from("users").upsert(syncRecords, { onConflict: "id,tenant_id" });
    } catch (upsertErr) {
      console.error("[getTenantCollaborators] Error auto-syncing to public.users:", upsertErr);
    }
  }

  // Ordenar alfabéticamente por nombre
  list.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

  return list.map(({ id, name, role, email }) => ({ id, name, role, email }));
}
