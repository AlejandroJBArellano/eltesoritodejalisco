import { createClient } from "@/lib/supabase/server";
import { getTenantCollaborators } from "@/lib/users";
import { getTenantContext } from "@/lib/tenant";
import { NextResponse } from "next/server";
import { format } from "date-fns-tz";

// Timezone used in the app
const TZ = "America/Mexico_City";

export async function GET() {
  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const todayDate = format(new Date(), "yyyy-MM-dd", { timeZone: TZ });

    // Check profiles table for user role
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const role = profileData?.role || (user.user_metadata?.role as string);
    const isAdmin = role === "ADMIN" || role === "MANAGER";

    if (isAdmin) {
      // If admin, fetch all attendance records for today, non-admin collaborators, and today's shifts
      const [attendanceRes, collaborators, shiftsRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("id, user_id, check_in, check_out, status, date")
          .eq("tenant_id", tenant.id)
          .eq("date", todayDate),
        getTenantCollaborators(tenant.id),
        supabase
          .from("employee_shifts")
          .select("*")
          .eq("tenant_id", tenant.id)
          .eq("date", todayDate)
          .order("start_time", { ascending: true }),
      ]);

      const formattedUsers = collaborators
        .filter((c) => c.role !== "ADMIN")
        .map((c) => ({
          id: c.id,
          name: c.name,
          role: c.role || "WAITER",
        }));

      return NextResponse.json({
        isAdmin: true,
        attendances: attendanceRes.data || [],
        users: formattedUsers,
        shifts: shiftsRes.data || [],
        toleranceMinutes: tenant.attendance_tolerance_minutes ?? 10,
      });
    } else {
      // Normal employee: fetch only their attendance and their shift for today
      const [attendanceRes, shiftsRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("id, user_id, check_in, check_out, status, date")
          .eq("user_id", user.id)
          .eq("tenant_id", tenant.id)
          .eq("date", todayDate)
          .order("created_at", { ascending: false }),
        supabase
          .from("employee_shifts")
          .select("*")
          .eq("user_id", user.id)
          .eq("tenant_id", tenant.id)
          .eq("date", todayDate)
          .order("start_time", { ascending: true }),
      ]);

      return NextResponse.json({
        isAdmin: false,
        attendances: attendanceRes.data || [],
        users: [],
        shifts: shiftsRes.data || [],
        toleranceMinutes: tenant.attendance_tolerance_minutes ?? 10,
      });
    }
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}

export async function POST(request: Request) {
  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { action, targetUserId, timestamp } = await request.json();
    const todayDate = format(new Date(), "yyyy-MM-dd", { timeZone: TZ });

    // Verify admin status if trying to act on someone else
    let actualUserId = user.id;
    if (targetUserId && targetUserId !== user.id) {
      const { data: profile } = await supabase
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .eq("tenant_id", tenant.id)
        .maybeSingle();

      const role = profile?.role || (user.user_metadata?.role as string);
      if (role !== "ADMIN" && role !== "MANAGER") {
        return NextResponse.json(
          { error: "No tienes permisos de administrador" },
          { status: 403 },
        );
      }
      actualUserId = targetUserId;
    }

    // Determine the timestamp to use
    const actionTime = timestamp
      ? new Date(timestamp).toISOString()
      : new Date().toISOString();

    // Verify target profile exists in profiles table
    let profileId = actualUserId;
    const { data: targetProfile } = await supabase
      .from("profiles")
      .select("id")
      .eq("id", actualUserId)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (!targetProfile) {
      // Try to find by email if user.id does not directly match
      if (user.email) {
        const { data: profileByEmail } = await supabase
          .from("profiles")
          .select("id")
          .ilike("email", user.email)
          .eq("tenant_id", tenant.id)
          .maybeSingle();

        if (profileByEmail) {
          profileId = profileByEmail.id;
        } else {
          return NextResponse.json(
            {
              error:
                "No se encontró el perfil del colaborador en este restaurante.",
            },
            { status: 400 },
          );
        }
      } else {
        return NextResponse.json(
          { error: "No se encontró el perfil del colaborador." },
          { status: 400 },
        );
      }
    }

    if (action === "CHECK_IN") {
      const { data, error } = await supabase
        .from("attendance")
        .insert({
          user_id: profileId,
          tenant_id: tenant.id,
          date: todayDate,
          check_in: actionTime,
          status: "ACTIVE",
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else if (action === "CHECK_OUT") {
      // Find active record
      const { data: activeRecords, error: fetchError } = await supabase
        .from("attendance")
        .select("id")
        .eq("user_id", profileId)
        .eq("tenant_id", tenant.id)
        .eq("date", todayDate)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError || !activeRecords || activeRecords.length === 0) {
        return NextResponse.json(
          { error: "No hay un turno activo para finalizar" },
          { status: 400 },
        );
      }

      const activeRecordId = activeRecords[0].id;

      const { data, error } = await supabase
        .from("attendance")
        .update({
          check_out: actionTime,
          status: "FINISHED",
          updated_at: new Date().toISOString(),
        })
        .eq("id", activeRecordId)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else {
      return NextResponse.json({ error: "Acción no válida" }, { status: 400 });
    }
  } catch (error) {
    console.error("POST /api/attendance error:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 },
    );
  }
}
