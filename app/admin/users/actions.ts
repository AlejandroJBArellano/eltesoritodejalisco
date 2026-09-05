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
    const role = formData.get("role") as string;

    if (!email || !fullName || !role) {
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

    // 2. Si no se especificó contraseña, generamos una clave temporal segura (útil si iniciará con Google)
    const password = rawPassword?.trim() || crypto.randomUUID();
    let userId: string | null = null;

    // 3. Crear el usuario en auth o vincular si ya existe
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email: cleanEmail,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: role,
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

    // 4. Crear o actualizar perfil en profiles para este tenant
    const { error: upsertError } = await adminClient.from("profiles").upsert({
      id: userId,
      email: cleanEmail,
      full_name: fullName,
      role: role,
      tenant_id: tenant.id,
    });

    if (upsertError) {
      console.error("Error al registrar perfil:", upsertError);
      return { error: "Error al crear el perfil en la base de datos" };
    }

    // 5. Sincronizar en la tabla users local
    try {
      await adminClient.from("users").upsert({
        id: userId,
        email: cleanEmail,
        name: fullName,
        role: role as any,
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

    // Actualizamos perfil
    const { error: updateError } = await adminClient
      .from("profiles")
      .update({ role: newRole })
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (updateError) {
      return { error: "Error al actualizar el rol" };
    }

    // Actualizamos tabla users si existe
    await adminClient
      .from("users")
      .update({ role: newRole })
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    // Opcional: actualizar user_metadata
    await adminClient.auth.admin.updateUserById(id, {
      user_metadata: { role: newRole },
    });

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Ocurrió un error inesperado." };
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

    // En lugar de borrar la identidad global de Auth, simplemente removemos sus perfiles en este tenant
    const { error: deleteProfileError } = await adminClient
      .from("profiles")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (deleteProfileError) {
      return { error: "Error al eliminar el perfil del usuario" };
    }

    // Eliminar también de la tabla public.users
    await adminClient
      .from("users")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Ocurrió un error inesperado." };
  }
}
