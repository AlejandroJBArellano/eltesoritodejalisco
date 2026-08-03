import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");

  // if "next" is in param, use it as the redirect URL
  const next = searchParams.get("next") ?? "/";

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      try {
        const tenant = await getTenantContext();
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          // Check if profile exists for this tenant
          const { data: profile } = await supabase
            .from("profiles")
            .select("role")
            .eq("id", user.id)
            .eq("tenant_id", tenant.id)
            .maybeSingle();

          if (!profile) {
            const email = user.email || "";
            const fullName = user.user_metadata?.full_name || user.user_metadata?.name || "Sin nombre";
            const role = user.user_metadata?.role || "WAITER";

            // Insert into public.profiles
            await supabase.from("profiles").insert({
              id: user.id,
              email,
              full_name: fullName,
              role,
              tenant_id: tenant.id,
            });

            // Insert into public.users if exists
            try {
              await supabase.from("users").insert({
                id: user.id,
                email,
                full_name: fullName,
                role,
                tenant_id: tenant.id,
              });
            } catch (err) {
              console.error("Error inserting into local users table:", err);
            }
          }
        }
      } catch (err) {
        console.error("Error during profile tenant mapping in callback:", err);
      }

      const forwardedHost = request.headers.get("x-forwarded-host");
      const isLocalEnv = process.env.NODE_ENV === "development";
      if (isLocalEnv) {
        // we can be sure that there is no load balancer in between, so no need to watch for X-Forwarded-Host
        return NextResponse.redirect(`${origin}${next}`);
      } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
      } else {
        return NextResponse.redirect(`${origin}${next}`);
      }
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(
    `${origin}/login?error=No_se_pudo_completar_el_login`,
  );
}
