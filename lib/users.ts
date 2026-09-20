import { createAdminClient } from "@/lib/supabase/admin";
import type { ShiftUserOption } from "@/components/admin/shifts/ShiftModal";

export type UserRole = "ADMIN" | "MANAGER" | "WAITER" | "CHEF" | "INVENTORY" | string;

const VALID_SYSTEM_ROLES = new Set<string>(["ADMIN", "MANAGER", "WAITER", "CHEF", "INVENTORY"]);

export function sanitizeRole(role?: string | null): string {
  if (!role) return "WAITER";
  const upper = role.toUpperCase().trim();
  if (VALID_SYSTEM_ROLES.has(upper)) {
    return upper;
  }
  return role.trim();
}

/**
 * Obtiene todos los colaboradores registrados para un tenant específico
 * consultando la tabla 'profiles' (y metadata de auth si fuera necesario).
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

  // 2. Obtener usuarios de Auth para resolver nombres o emails si faltan en perfiles
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
  const collaboratorsMap = new Map<string, ShiftUserOption>();

  // Procesar perfiles (fuente de verdad de pertenencia al tenant)
  for (const p of profiles || []) {
    const authU = authMap.get(p.id);

    const name =
      p.full_name?.trim() ||
      authU?.user_metadata?.full_name?.trim() ||
      authU?.user_metadata?.name?.trim() ||
      p.email?.split("@")[0] ||
      authU?.email?.split("@")[0] ||
      "Colaborador";

    const role = p.role || authU?.user_metadata?.role || "WAITER";
    const email = p.email || authU?.email || "";

    collaboratorsMap.set(p.id, {
      id: p.id,
      name,
      role,
      email,
    });
  }

  const list = Array.from(collaboratorsMap.values());

  // Ordenar alfabéticamente por nombre
  list.sort((a, b) => a.name.localeCompare(b.name, "es", { sensitivity: "base" }));

  return list;
}
