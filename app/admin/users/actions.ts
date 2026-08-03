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
    const password = formData.get("password") as string;
    const fullName = formData.get("fullName") as string;
    const role = formData.get("role") as string;

    if (!email || !password || !fullName || !role) {
      return { error: "Faltan datos requeridos" };
    }

    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    // Crear el usuario en auth
    const { data: newUser, error: createError } =
      await adminClient.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          full_name: fullName,
          role: role,
          tenant_id: tenant.id, // pass tenant_id so handle_new_user trigger knows where to assign them
        },
      });

    if (createError) {
      if (createError.message.includes("already existing")) {
        return { error: "El correo ya está registrado" };
      }
      console.error(createError);
      return { error: createError.message };
    }

    // El trigger en la BD podría estar creando el profile vacío. Nosotros lo actualizamos.
    // O si no hay trigger, lo insertamos. Primero intentamos update, si no afecta, insert.
    if (newUser.user) {
      const { error: upsertError } = await adminClient.from("profiles").upsert({
        id: newUser.user.id,
        email: email,
        full_name: fullName,
        role: role,
        tenant_id: tenant.id,
      });

      if (upsertError) {
        console.error("Error upserting profile:", upsertError);
        // Si hay error al crear el perfil, borramos el usuario por seguridad
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        return { error: "Error al crear el perfil en la base de datos" };
      }

      // Also create/upsert in the users table to keep it in sync
      await adminClient.from("users").upsert({
        id: newUser.user.id,
        email: email,
        name: fullName,
        role: role,
        tenant_id: tenant.id,
        password: "MANAGED_BY_SUPABASE",
      });
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
