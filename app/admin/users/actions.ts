"use server";

import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
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

    const adminClient = createAdminClient();

    // Crear el usuario en auth
    const { data: newUser, error: createError } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: {
        full_name: fullName,
        role: role,
      }
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
      const { error: upsertError } = await adminClient
        .from("profiles")
        .upsert({
          id: newUser.user.id,
          email: email,
          full_name: fullName,
          role: role,
        });

      if (upsertError) {
        console.error("Error upserting profile:", upsertError);
        // Si hay error al crear el perfil, borramos el usuario por seguridad
        await adminClient.auth.admin.deleteUser(newUser.user.id);
        return { error: "Error al crear el perfil en la base de datos" };
      }
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err: any) {
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

    const adminClient = createAdminClient();

    // Actualizamos perfil
    const { error: updateError } = await adminClient
        .from("profiles")
        .update({ role: newRole })
        .eq("id", id);
    
    if (updateError) {
        return { error: "Error al actualizar el rol" };
    }

    // Opcional: actualizar user_metadata
    await adminClient.auth.admin.updateUserById(id, {
        user_metadata: { role: newRole }
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

    const adminClient = createAdminClient();

    // Borrar de auth (el cascade en Supabase normalmente borra el profile)
    const { error: deleteError } = await adminClient.auth.admin.deleteUser(id);

    if (deleteError) {
        return { error: "Error al eliminar usuario de Auth" };
    }

    revalidatePath("/admin/users");
    return { success: true };
  } catch (err) {
    console.error(err);
    return { error: "Ocurrió un error inesperado." };
  }
}
