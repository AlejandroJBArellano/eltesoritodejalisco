"use server";

import { type UserRole } from "@/types";
import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant";
import { revalidatePath } from "next/cache";

export async function createUser(formData: FormData) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return { error: "No autorizado" };
    }

    const email = formData.get("email") as string;
    const rawPassword = formData.get("password") as string;
    const fullName = (formData.get("full_name") ||
      formData.get("fullName") ||
      "") as string;
    const rawRole = (formData.get("role") as string)?.trim() || "";
    const rawRoleId = (formData.get("role_id") as string)?.trim() || "";

    if (!email || !fullName || (!rawRole && !rawRoleId)) {
      return { error: "Faltan datos requeridos" };
    }

    const cleanEmail = email.trim().toLowerCase();
    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    // 1. Verificar si ya existe perfil para este correo en este restaurante
    const { data: existingProfile } = await adminClient
      .from("profiles")
      .select("id")
      .eq("tenant_id", tenant.id)
      .ilike("email", cleanEmail)
      .maybeSingle();

    if (existingProfile) {
      return { error: "El correo ya está registrado en este restaurante" };
    }

    // 2. Resolver role_id y nombre de rol si existe en tabla roles
    let resolvedRole = rawRole;
    let resolvedRoleId: string | null = rawRoleId || null;

    try {
      if (rawRoleId) {
        const { data: r } = await adminClient
          .from("roles")
          .select("id, name, system_slug")
          .eq("id", rawRoleId)
          .eq("tenant_id", tenant.id)
          .maybeSingle();
        if (r) {
          resolvedRoleId = r.id;
          resolvedRole = r.system_slug || r.name;
        }
      } else if (rawRole) {
        const { data: r } = await adminClient
          .from("roles")
          .select("id, name, system_slug")
          .eq("tenant_id", tenant.id)
          .ilike("name", rawRole)
          .maybeSingle();
        if (r) {
          resolvedRoleId = r.id;
          resolvedRole = r.system_slug || r.name;
        }
      }
    } catch {
      // Continuar con valores por defecto
    }

    // 3. Si no se especificó contraseña, generamos una clave temporal segura
    const password = rawPassword?.trim() || crypto.randomUUID();
    let userId: string | null = null;

    // 4. Crear el usuario en auth o vincular si ya existe
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: resolvedRole,
          role_id: resolvedRoleId,
          tenant_id: tenant.id,
        },
      });

    if (createError) {
      const isAlreadyRegistered =
        createError.message.toLowerCase().includes("already existing") ||
        createError.message.toLowerCase().includes("already been registered") ||
        createError.status === 422;

      if (isAlreadyRegistered) {
        // El usuario ya existe en Supabase Auth a nivel global
        const { data: authData } = await adminClient.auth.admin.listUsers();
        const existingAuthUser = authData?.users?.find(
          (u) => u.email?.toLowerCase() === cleanEmail,
        );

        if (existingAuthUser) {
          userId = existingAuthUser.id;
        } else {
          return { error: "El correo ya está registrado en la plataforma" };
        }
      } else {
        console.error("Error al crear usuario en Auth:", createError);
        return { error: createError.message };
      }
    } else if (newUser?.user) {
      userId = newUser.user.id;
    }

    if (!userId) {
      return { error: "No se pudo registrar el usuario" };
    }

    // 5. Crear o actualizar perfil en profiles para este tenant
    const rawPin = (formData.get("pin") as string)?.trim();
    const pin =
      rawPin || (resolvedRole === "ADMIN" || resolvedRole === "MANAGER" ? "1234" : null);

    const profileUpsert: any = {
      id: userId,
      email: cleanEmail,
      full_name: fullName,
      role: resolvedRole,
      pin: pin,
      tenant_id: tenant.id,
    };
    if (resolvedRoleId) {
      profileUpsert.role_id = resolvedRoleId;
    }

    const { error: upsertError } = await adminClient.from("profiles").upsert(profileUpsert);

    if (upsertError) {
      console.error("Error al registrar perfil:", upsertError);
      return { error: "Error al crear el perfil en la base de datos" };
    }

    // 6. Sincronizar en la tabla users local
    try {
      await adminClient.from("users").upsert({
        id: userId,
        email: cleanEmail,
        name: fullName,
        role: resolvedRole as UserRole,
        pin: pin,
        tenant_id: tenant.id,
        password: "MANAGED_BY_SUPABASE",
      });
    } catch (usersErr) {
      console.error("Error al sincronizar tabla users:", usersErr);
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Ocurrió un error inesperado." };
  }
}

export async function updateUserRole(id: string, newRole: string) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return { error: "No autorizado" };
    }

    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    // Resolver role_id si coincide con algún rol registrado
    let resolvedRole = newRole;
    let resolvedRoleId: string | null = null;

    try {
      const { data: roleRecord } = await adminClient
        .from("roles")
        .select("id, name, system_slug")
        .eq("tenant_id", tenant.id)
        .ilike("name", newRole)
        .maybeSingle();

      if (roleRecord) {
        resolvedRoleId = roleRecord.id;
        resolvedRole = roleRecord.system_slug || roleRecord.name;
      }
    } catch {
      // Continuar
    }

    // Actualizamos perfil
    const updatePayload: any = { role: resolvedRole };
    if (resolvedRoleId) {
      updatePayload.role_id = resolvedRoleId;
    }

    const { error: updateError } = await adminClient
      .from("profiles")
      .update(updatePayload)
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (updateError) {
      return { error: "Error al actualizar el rol" };
    }

    // Actualizamos tabla users si existe
    await adminClient
      .from("users")
      .update({ role: resolvedRole })
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    // Opcional: actualizar user_metadata
    try {
      await adminClient.auth.admin.updateUserById(id, {
        user_metadata: { role: resolvedRole, role_id: resolvedRoleId },
      });
    } catch {
      // Ignorar si auth admin falla
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Ocurrió un error inesperado." };
  }
}

export async function updateUserPin(id: string, pin: string) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return { error: "No autorizado" };
    }

    const trimmed = pin?.trim();
    if (!trimmed || !/^\d{4,6}$/.test(trimmed)) {
      return { error: "El PIN debe contener entre 4 y 6 dígitos numéricos" };
    }

    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    const { error: profileError } = await adminClient
      .from("profiles")
      .update({ pin: trimmed })
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (profileError) {
      return { error: "Error al actualizar el PIN en el perfil" };
    }

    try {
      await adminClient
        .from("users")
        .update({ pin: trimmed })
        .eq("id", id)
        .eq("tenant_id", tenant.id);
    } catch {
      // Ignorar si tabla users no existe o no tiene el registro
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Ocurrió un error inesperado al actualizar el PIN." };
  }
}

export async function deleteUser(id: string) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return { error: "No autorizado" };
    }

    if (profile.id === id) {
      return { error: "No te puedes borrar a ti mismo" };
    }

    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    // 1. Eliminar perfil de profiles
    const { error: deleteProfileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (deleteProfileError) {
      console.error("Error al eliminar perfil:", deleteProfileError);
      return { error: "Error al eliminar el perfil del restaurante." };
    }

    // 2. Eliminar de la tabla users local si existe
    try {
      await adminClient
        .from("users")
        .delete()
        .eq("id", id)
        .eq("tenant_id", tenant.id);
    } catch (usersErr) {
      console.error("Error al eliminar de tabla users:", usersErr);
    }

    // 3. Opcional: verificar si el usuario pertenece a otros tenants antes de borrarlo de Auth global
    const { data: otherProfiles } = await adminClient
      .from("profiles")
      .select("id")
      .eq("id", id);

    if (!otherProfiles || otherProfiles.length === 0) {
      try {
        await adminClient.auth.admin.deleteUser(id);
      } catch (authErr) {
        console.warn("No se pudo eliminar de Auth global:", authErr);
      }
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Ocurrió un error inesperado al eliminar el usuario." };
  }
}
