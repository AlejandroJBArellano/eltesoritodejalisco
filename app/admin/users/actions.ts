"use server";

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
      let roleRecord: any = null;
      if (rawRoleId) {
        const res = await adminClient
          .from("roles")
          .select("id, name, system_slug")
          .eq("id", rawRoleId)
          .eq("tenant_id", tenant.id)
          .maybeSingle();
        if (res?.error) console.error("[createUser] Error buscando rol por ID:", res.error);
        roleRecord = res?.data;
      } else if (rawRole) {
        const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(rawRole);
        if (isUUID) {
          const res = await adminClient
            .from("roles")
            .select("id, name, system_slug")
            .eq("id", rawRole)
            .eq("tenant_id", tenant.id)
            .maybeSingle();
          roleRecord = res?.data;
        } else {
          const res = await adminClient
            .from("roles")
            .select("id, name, system_slug")
            .eq("tenant_id", tenant.id)
            .or(`system_slug.eq.${rawRole.toUpperCase()},name.ilike.${rawRole}`)
            .maybeSingle();
          roleRecord = res?.data;
        }
      }

      if (roleRecord) {
        resolvedRoleId = roleRecord.id;
        resolvedRole = roleRecord.system_slug || roleRecord.name;
      }
    } catch (rErr) {
      console.error("[createUser] Error resolviendo rol:", rErr);
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
      console.error("[createUser] Error al registrar perfil:", upsertError);
      return { error: "Error al crear el perfil en la base de datos" };
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

    const rawInput = (newRole || "").trim();
    if (!rawInput) {
      return { error: "El rol es requerido" };
    }

    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    const isUUID =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(
        rawInput,
      );

    // 1. Resolver role_id y nombre de rol
    let resolvedRole = rawInput;
    let resolvedRoleId: string | null = null;

    try {
      let roleRecord: any = null;
      if (isUUID) {
        const res = await adminClient
          .from("roles")
          .select("id, name, system_slug")
          .eq("tenant_id", tenant.id)
          .eq("id", rawInput)
          .maybeSingle();
        if (res?.error) console.error("[updateUserRole] Error buscando rol por ID:", res.error);
        roleRecord = res?.data;
      } else {
        const res = await adminClient
          .from("roles")
          .select("id, name, system_slug")
          .eq("tenant_id", tenant.id)
          .or(`system_slug.eq.${rawInput.toUpperCase()},name.ilike.${rawInput}`)
          .maybeSingle();
        if (res?.error) console.error("[updateUserRole] Error buscando rol por slug/name:", res.error);
        roleRecord = res?.data;
      }

      if (roleRecord) {
        resolvedRoleId = roleRecord.id;
        resolvedRole = roleRecord.system_slug || roleRecord.name;
      }
    } catch (roleErr) {
      console.error("[updateUserRole] Error resolviendo rol:", roleErr);
    }

    // 2. Actualizamos perfil
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
      console.error("[updateUserRole] Error al actualizar perfil:", updateError);
      return { error: "Error al actualizar el rol" };
    }

    // 3. Actualizar user_metadata en Auth
    try {
      await adminClient.auth.admin.updateUserById(id, {
        user_metadata: { role: resolvedRole, role_id: resolvedRoleId },
      });
    } catch (authErr) {
      console.warn("[updateUserRole] Error actualizando user_metadata en auth:", authErr);
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error("[updateUserRole] Error inesperado:", err);
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

    // 2. Opcional: verificar si el usuario pertenece a otros tenants antes de borrarlo de Auth global
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
