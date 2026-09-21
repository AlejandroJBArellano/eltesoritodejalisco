"use server";

import { getProfile } from "@/lib/auth";
import {
  hasPermission,
  type PermissionKey,
  type RoleData,
} from "@/lib/permissions";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

async function verifyAdminAuth() {
  const profile = await getProfile();
  if (!profile) {
    throw new Error("No autenticado");
  }
  const canManage =
    profile.role === "ADMIN" ||
    profile.role === "MANAGER" ||
    hasPermission(profile, "team.manage_roles");

  if (!canManage) {
    throw new Error("No autorizado para gestionar roles");
  }
  return profile;
}

/**
 * Obtiene todos los roles disponibles para el tenant actual, incluyendo conteo de usuarios.
 */
export async function getTenantRoles(): Promise<{
  data?: RoleData[];
  error?: string;
}> {
  try {
    const profile = await getProfile();
    if (!profile) {
      return { error: "No autenticado" };
    }

    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    // 1. Obtener roles
    const { data: roles, error: rolesError } = await adminClient
      .from("roles")
      .select("*")
      .eq("tenant_id", tenant.id);

    if (rolesError) {
      console.error("[getTenantRoles] Error:", rolesError);
      return { error: "Error al cargar los roles" };
    }

    // 2. Obtener perfiles para calcular conteo de colaboradores por rol
    const { data: profiles } = await adminClient
      .from("profiles")
      .select("id, role, role_id")
      .eq("tenant_id", tenant.id);

    const userCountsByRoleId = new Map<string, number>();
    const userCountsByRoleSlug = new Map<string, number>();

    (profiles || []).forEach((p) => {
      if (p.role_id) {
        userCountsByRoleId.set(
          p.role_id,
          (userCountsByRoleId.get(p.role_id) || 0) + 1,
        );
      } else if (p.role) {
        const slug = p.role.toUpperCase();
        userCountsByRoleSlug.set(
          slug,
          (userCountsByRoleSlug.get(slug) || 0) + 1,
        );
      }
    });

    const enrichedRoles: RoleData[] = (roles || []).map((r) => {
      let count = userCountsByRoleId.get(r.id) || 0;
      if (count === 0 && r.system_slug) {
        count = userCountsByRoleSlug.get(r.system_slug.toUpperCase()) || 0;
      }
      return {
        id: r.id,
        tenant_id: r.tenant_id,
        name: r.name,
        description: r.description,
        is_system: r.is_system,
        system_slug: r.system_slug,
        permissions: Array.isArray(r.permissions) ? r.permissions : [],
        created_at: r.created_at,
        updated_at: r.updated_at,
        user_count: count,
      };
    });

    // Ordenar: roles de sistema primero en orden lógico, luego personalizados alfabéticamente
    const systemOrder: Record<string, number> = {
      ADMIN: 1,
      MANAGER: 2,
      WAITER: 3,
      CHEF: 4,
      INVENTORY: 5,
    };

    enrichedRoles.sort((a, b) => {
      if (a.is_system && b.is_system) {
        return (
          (systemOrder[a.system_slug || ""] || 99) -
          (systemOrder[b.system_slug || ""] || 99)
        );
      }
      if (a.is_system) return -1;
      if (b.is_system) return 1;
      return a.name.localeCompare(b.name, "es", { sensitivity: "base" });
    });

    return { data: enrichedRoles };
  } catch (err) {
    console.error("[getTenantRoles] Error:", err);
    return { error: "Ocurrió un error inesperado al consultar roles." };
  }
}

/**
 * Crea un nuevo rol personalizado
 */
export async function createCustomRole(data: {
  name: string;
  description?: string;
  permissions: PermissionKey[] | string[];
}): Promise<{ success?: boolean; role?: RoleData; error?: string }> {
  try {
    await verifyAdminAuth();
    const cleanName = data.name?.trim();

    if (!cleanName) {
      return { error: "El nombre del rol es requerido." };
    }

    if (
      !data.permissions ||
      !Array.isArray(data.permissions) ||
      data.permissions.length === 0
    ) {
      return { error: "Debes seleccionar al menos un permiso para el rol." };
    }

    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    // Validar duplicidad de nombre
    const { data: existing } = await adminClient
      .from("roles")
      .select("id")
      .eq("tenant_id", tenant.id)
      .ilike("name", cleanName)
      .maybeSingle();

    if (existing) {
      return { error: `Ya existe un rol llamado '${cleanName}'.` };
    }

    const { data: newRole, error: insertError } = await adminClient
      .from("roles")
      .insert({
        tenant_id: tenant.id,
        name: cleanName,
        description: data.description?.trim() || null,
        is_system: false,
        system_slug: null,
        permissions: data.permissions,
      })
      .select()
      .single();

    if (insertError || !newRole) {
      console.error("[createCustomRole] Error:", insertError);
      return { error: "Error al registrar el rol en la base de datos." };
    }

    revalidatePath("/admin/users");
    return { success: true, role: newRole as RoleData };
  } catch (err: unknown) {
    console.error("[createCustomRole] Error:", err);
    return {
      error: err instanceof Error ? err.message : "Error al crear el rol.",
    };
  }
}

/**
 * Actualiza un rol personalizado existente
 */
export async function updateCustomRole(
  id: string,
  data: {
    name: string;
    description?: string;
    permissions: PermissionKey[] | string[];
  },
): Promise<{ success?: boolean; error?: string }> {
  try {
    await verifyAdminAuth();
    const cleanName = data.name?.trim();

    if (!cleanName) {
      return { error: "El nombre del rol es requerido." };
    }

    if (
      !data.permissions ||
      !Array.isArray(data.permissions) ||
      data.permissions.length === 0
    ) {
      return { error: "Debes seleccionar al menos un permiso para el rol." };
    }

    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    // 1. Obtener rol actual y validar que no sea rol del sistema
    const { data: currentRole, error: fetchError } = await adminClient
      .from("roles")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .single();

    if (fetchError || !currentRole) {
      return { error: "El rol especificado no existe." };
    }

    if (currentRole.is_system) {
      return {
        error:
          "Los roles predeterminados del sistema no pueden modificarse. Puedes duplicarlo para crear un rol personalizado.",
      };
    }

    // 2. Validar que no exista otro rol con el mismo nombre
    const { data: existingName } = await adminClient
      .from("roles")
      .select("id")
      .eq("tenant_id", tenant.id)
      .ilike("name", cleanName)
      .neq("id", id)
      .maybeSingle();

    if (existingName) {
      return { error: `Ya existe otro rol con el nombre '${cleanName}'.` };
    }

    // 3. Actualizar
    const { error: updateError } = await adminClient
      .from("roles")
      .update({
        name: cleanName,
        description: data.description?.trim() || null,
        permissions: data.permissions,
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (updateError) {
      console.error("[updateCustomRole] Error:", updateError);
      return { error: "Error al actualizar el rol." };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    console.error("[updateCustomRole] Error:", err);
    return {
      error: err instanceof Error ? err.message : "Error al actualizar el rol.",
    };
  }
}

/**
 * Duplica cualquier rol (de sistema o personalizado) como un nuevo rol editable
 */
export async function duplicateRole(
  sourceRoleId: string,
  customName?: string,
): Promise<{ success?: boolean; role?: RoleData; error?: string }> {
  try {
    await verifyAdminAuth();
    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    const { data: sourceRole, error: fetchError } = await adminClient
      .from("roles")
      .select("*")
      .eq("id", sourceRoleId)
      .eq("tenant_id", tenant.id)
      .single();

    if (fetchError || !sourceRole) {
      return { error: "No se encontró el rol de origen." };
    }

    const newName = customName?.trim() || `${sourceRole.name} (Copia)`;

    return await createCustomRole({
      name: newName,
      description: sourceRole.description
        ? `Copia basada en ${sourceRole.name}. ${sourceRole.description}`
        : `Copia personalizada de ${sourceRole.name}`,
      permissions: Array.isArray(sourceRole.permissions)
        ? sourceRole.permissions
        : [],
    });
  } catch (err: unknown) {
    console.error("[duplicateRole] Error:", err);
    return {
      error: err instanceof Error ? err.message : "Error al duplicar el rol.",
    };
  }
}

/**
 * Elimina un rol personalizado (impidiendo borrar roles de sistema o con usuarios no reasignados)
 */
export async function deleteCustomRole(
  id: string,
  reassignRoleId?: string,
): Promise<{ success?: boolean; error?: string }> {
  try {
    await verifyAdminAuth();
    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    const { data: role, error: fetchError } = await adminClient
      .from("roles")
      .select("*")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .single();

    if (fetchError || !role) {
      return { error: "El rol no existe." };
    }

    if (role.is_system) {
      return {
        error:
          "Los roles predeterminados del sistema no pueden ser eliminados.",
      };
    }

    // Verificar usuarios asignados a este rol
    const { data: assignedProfiles } = await adminClient
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenant.id)
      .eq("role_id", id);

    const assignedCount = assignedProfiles?.length || 0;

    if (assignedCount > 0) {
      if (!reassignRoleId) {
        return {
          error: `Este rol tiene ${assignedCount} colaborador(es) asignado(s). Selecciona un nuevo rol para reasignarlos antes de eliminar.`,
        };
      }

      // Reasignar usuarios al rol de destino
      const { data: targetRole } = await adminClient
        .from("roles")
        .select("id, name, system_slug")
        .eq("id", reassignRoleId)
        .eq("tenant_id", tenant.id)
        .single();

      if (!targetRole) {
        return { error: "El rol de reasignación seleccionado no es válido." };
      }

      const { error: reassignError } = await adminClient
        .from("profiles")
        .update({
          role_id: targetRole.id,
          role: targetRole.system_slug || targetRole.name,
        })
        .eq("tenant_id", tenant.id)
        .eq("role_id", id);

      if (reassignError) {
        return { error: "Error al reasignar colaboradores al nuevo rol." };
      }
    }

    // Eliminar el rol
    const { error: deleteError } = await adminClient
      .from("roles")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (deleteError) {
      console.error("[deleteCustomRole] Error:", deleteError);
      return { error: "Error al eliminar el rol." };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: unknown) {
    console.error("[deleteCustomRole] Error:", err);
    return {
      error: err instanceof Error ? err.message : "Error al eliminar el rol.",
    };
  }
}
