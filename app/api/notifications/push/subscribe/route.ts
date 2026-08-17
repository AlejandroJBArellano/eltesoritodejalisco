import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTenantContext } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();
    const adminSupabase = createAdminClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    const body = await request.json();
    const { subscription, role, userAgent } = body;

    if (
      !subscription ||
      !subscription.endpoint ||
      !subscription.keys?.p256dh ||
      !subscription.keys?.auth
    ) {
      return NextResponse.json(
        { error: "Suscripción Push inválida o incompleta." },
        { status: 400 },
      );
    }

    let detectedRole = role || null;
    if (!detectedRole && user) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .maybeSingle();

      detectedRole = profile?.role || "ADMIN";
    }

    const { data, error } = await adminSupabase
      .from("push_subscriptions")
      .upsert(
        {
          tenant_id: tenant.id,
          user_id: user?.id || null,
          endpoint: subscription.endpoint,
          p256dh: subscription.keys.p256dh,
          auth: subscription.keys.auth,
          role: detectedRole || "ADMIN",
          user_agent: userAgent || request.headers.get("user-agent") || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "endpoint" },
      )
      .select()
      .single();

    if (error) {
      console.error("[Push Subscribe API Error]", error);
      return NextResponse.json(
        { error: "Error al guardar la suscripción push." },
        { status: 500 },
      );
    }

    return NextResponse.json({ success: true, subscriptionId: data?.id });
  } catch (error) {
    console.error("[Push Subscribe Exception]", error);
    return NextResponse.json(
      { error: "Error interno del servidor." },
      { status: 500 },
    );
  }
}
