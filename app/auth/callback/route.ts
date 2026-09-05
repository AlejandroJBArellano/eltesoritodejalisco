import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

function getBaseUrl(request: Request, origin: string): string {
  const forwardedHost = request.headers.get("x-forwarded-host");
  const isLocalEnv = process.env.NODE_ENV === "development";
  if (!isLocalEnv && forwardedHost) {
    const protocol = request.headers.get("x-forwarded-proto") || "https";
    return `${protocol}://${forwardedHost}`;
  }
  return origin;
}

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = searchParams.get("next") ?? "/";
  const baseUrl = getBaseUrl(request, origin);

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (!error) {
      try {
        const tenant = await getTenantContext();
        const {
          data: { user },
        } = await supabase.auth.getUser();

        if (!user || !user.email) {
          await supabase.auth.signOut();
          const errorMsg = encodeURIComponent(
            "No se pudo obtener la información de la cuenta",
          );
          return NextResponse.redirect(`${baseUrl}/login?error=${errorMsg}`);
        }

        const email = user.email.trim().toLowerCase();

        // 1. Verificar si existe perfil para este usuario e ID en este restaurante
        let { data: profile } = await supabase
          .from("profiles")
          .select("id, role, full_name, email")
          .eq("id", user.id)
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        // 2. Si no se encontró por ID, verificar si el administrador lo pre-registró por correo
        if (!profile) {
          const { data: profileByEmail } = await supabase
            .from("profiles")
            .select("id, role, full_name, email")
            .ilike("email", email)
            .eq("tenant_id", tenant.id)
            .maybeSingle();

          if (profileByEmail) {
            // El administrador registró este correo previamente.
            // Si el ID en profiles difiere del user.id de Google Auth, sincronizamos el ID.
            if (profileByEmail.id !== user.id) {
              const adminClient = createAdminClient();

              await adminClient
                .from("profiles")
                .update({ id: user.id })
                .eq("id", profileByEmail.id)
                .eq("tenant_id", tenant.id);

              try {
                await adminClient
                  .from("users")
                  .update({ id: user.id })
                  .eq("id", profileByEmail.id)
                  .eq("tenant_id", tenant.id);
              } catch (syncErr) {
                console.error(
                  "Error al sincronizar id en tabla users:",
                  syncErr,
                );
              }
            }
            profile = { ...profileByEmail, id: user.id };
          }
        }

        // 3. Si no existe ningún perfil registrado para este restaurante, denegar acceso
        if (!profile) {
          await supabase.auth.signOut();
          const errorMsg = encodeURIComponent(
            "Este correo no está registrado en este restaurante. Contacta a un administrador.",
          );
          return NextResponse.redirect(`${baseUrl}/login?error=${errorMsg}`);
        }

        // 4. Si el perfil no tiene nombre y Google lo provee, sincronizar nombre
        const googleName =
          user.user_metadata?.full_name || user.user_metadata?.name;
        if (!profile.full_name && googleName) {
          const adminClient = createAdminClient();
          await adminClient
            .from("profiles")
            .update({ full_name: googleName })
            .eq("id", user.id)
            .eq("tenant_id", tenant.id);

          try {
            await adminClient
              .from("users")
              .update({ name: googleName })
              .eq("id", user.id)
              .eq("tenant_id", tenant.id);
          } catch {}
        }

        return NextResponse.redirect(`${baseUrl}${next}`);
      } catch (err) {
        console.error("Error en validación de perfil en callback:", err);
      }
    }
  }

  // Si falló el código o hubo un error general
  const errorMsg = encodeURIComponent("No se pudo iniciar sesión con Google");
  return NextResponse.redirect(`${baseUrl}/login?error=${errorMsg}`);
}

