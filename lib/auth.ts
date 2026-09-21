import { createClient } from "./supabase/server";
import { getTenantContext } from "./tenant";

export async function getUser() {
  const supabase = await createClient();
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser();
  if (error || !user) return null;
  return user;
}

export async function getProfile() {
  const user = await getUser();
  if (!user) return null;

  const tenant = await getTenantContext();
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("*, role_data:roles(*)")
    .eq("id", user.id)
    .eq("tenant_id", tenant.id)
    .maybeSingle();

  if (!profile) return null;

  // Fallback si la relación de foreign key no se resolvió automáticamente
  const profileRecord = profile as Record<string, unknown>;
  if (!profile.role_data && profileRecord.role_id) {
    const { data: roleData } = await supabase
      .from("roles")
      .select("*")
      .eq("id", profileRecord.role_id as string)
      .maybeSingle();
    if (roleData) {
      profileRecord.role_data = roleData;
    }
  }

  return profile;
}

export type UserRole = "ADMIN" | "MANAGER" | "WAITER" | "CHEF" | "INVENTORY";

export async function verifyManagerPin(tenantId: string, pin: string) {
  if (!pin || !pin.trim()) return null;
  const { createAdminClient } = await import("./supabase/admin");
  const adminClient = createAdminClient();
  const { data: manager, error } = await adminClient
    .from("profiles")
    .select("id, full_name, role, role_id, role_data:roles(*)")
    .eq("tenant_id", tenantId)
    .eq("pin", pin.trim())
    .limit(1)
    .maybeSingle();

  if (error || !manager) return null;

  // Validar autorización de manager por rol tradicional o por permisos granulares
  const roleSlug = (manager.role || "").toUpperCase();
  const perms =
    (manager.role_data as { permissions?: string[] } | null)?.permissions || [];
  const isManagerOrAdmin =
    roleSlug === "ADMIN" ||
    roleSlug === "MANAGER" ||
    perms.includes("*") ||
    perms.includes("pos.cancel_order") ||
    perms.includes("pos.apply_discount");

  if (!isManagerOrAdmin) return null;
  return manager;
}
