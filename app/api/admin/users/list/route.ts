import { getProfile } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const profile = await getProfile();

    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }

    const tenant = await getTenantContext();
    const adminClient = createAdminClient();

    // Obtenemos los usuarios y sus metadatos desde Supabase Auth (donde viven los correos y full_name verídicos)
    const { data: authData, error: authError } =
      await adminClient.auth.admin.listUsers();

    if (authError) {
      console.error(authError);
      return NextResponse.json(
        { error: "Error al obtener usuarios de Auth" },
        { status: 500 },
      );
    }

    // Y obtenemos los roles registrados en la tabla 'profiles' para este tenant
    const { data: profiles, error: profilesError } = await adminClient
      .from("profiles")
      .select("*")
      .eq("tenant_id", tenant.id);

    if (profilesError) {
      console.error(profilesError);
    }

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) || []);

    // Combinamos la información de ambas tablas (filtrando solo los que pertenecen a este tenant)
    const combinedUsers = authData.users
      .filter((authUser) => profileMap.has(authUser.id))
      .map((authUser) => {
        const dbProfile = profileMap.get(authUser.id)!;
        return {
          id: authUser.id,
          email: authUser.email,
          full_name:
            authUser.user_metadata?.name || dbProfile?.full_name || "Sin nombre",
          role: dbProfile?.role || "WAITER",
          created_at: authUser.created_at,
        };
      });

    // Los ordenamos de más reciente a más antiguo
    combinedUsers.sort(
      (a, b) =>
        new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
    );

    return NextResponse.json(combinedUsers);
  } catch (err) {
    console.error(err);
    return NextResponse.json({ error: "Error inesperado" }, { status: 500 });
  }
}
