import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const profile = await getProfile();

    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const adminClient = createAdminClient();

    // Obtenemos los usuarios y sus metadatos desde Supabase Auth (donde viven los correos y full_name verídicos)
    const { data: authData, error: authError } = await adminClient.auth.admin.listUsers();

    console.log(authData.users.map(e => e.user_metadata));

    if (authError) {
      console.error(authError);
      return NextResponse.json(
        { error: "Error al obtener usuarios de Auth" },
        { status: 500 }
      );
    }

    // Y obtenemos los roles registrados en la tabla 'profiles'
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("*");

    if (profilesError) {
      console.error(profilesError);
    }

    // Combinamos la información de ambas tablas (por su ID)
    const combinedUsers = authData.users.map((authUser) => {
      const dbProfile = profiles?.find((p) => p.id === authUser.id);
      return {
        id: authUser.id,
        email: authUser.email,
        full_name: authUser.user_metadata?.name || dbProfile?.full_name || "Sin nombre",
        role: dbProfile?.role || authUser.user_metadata?.role || "WAITER",
        created_at: authUser.created_at,
      };
    });

    // Los ordenamos de más reciente a más antiguo
    combinedUsers.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());

    return NextResponse.json(combinedUsers);
  } catch (err) {
    console.error(err);
    return NextResponse.json(
      { error: "Error inesperado" },
      { status: 500 }
    );
  }
}
