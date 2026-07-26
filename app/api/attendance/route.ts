import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format } from "date-fns-tz";

// Timezone used in the app
const TZ = "America/Mexico_City";

export async function GET(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const todayDate = format(new Date(), "yyyy-MM-dd", { timeZone: TZ });

    // Check profiles table first (used by getProfile() in dashboard)
    const { data: profileData } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .maybeSingle();

    const role = profileData?.role || dbUser?.role || (user.user_metadata?.role as string);
    const isAdmin = role === "ADMIN" || role === "MANAGER";

    if (isAdmin) {
      // If admin, fetch all attendance records for today, and also all users
      // so we can build a list of who hasn't checked in
      const [attendanceRes, usersRes] = await Promise.all([
        supabase
          .from("attendance")
          .select("id, user_id, check_in, check_out, status, date")
          .eq("date", todayDate),
        supabase
          .from("users")
          .select("id, name, role")
          .neq("role", "ADMIN") // Maybe admins don't track attendance? Let's exclude or include depending. Let's include everyone just in case.
      ]);

      return NextResponse.json({
        isAdmin: true,
        attendances: attendanceRes.data || [],
        users: usersRes.data || [],
      });
    } else {
      // Normal employee: fetch only their attendance for today
      const { data: attendances } = await supabase
        .from("attendance")
        .select("id, user_id, check_in, check_out, status, date")
        .eq("user_id", user.id)
        .eq("date", todayDate)
        .order("created_at", { ascending: false });

      return NextResponse.json({
        isAdmin: false,
        attendances: attendances || [],
        users: [],
      });
    }
  } catch (error) {
    console.error("GET /api/attendance error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const { action, targetUserId, timestamp } = await request.json();

    const todayDate = format(new Date(), "yyyy-MM-dd", { timeZone: TZ });

    // Verify admin status if trying to act on someone else
    let actualUserId = user.id;
    if (targetUserId && targetUserId !== user.id) {
      const { data: dbUser } = await supabase
        .from("users")
        .select("role")
        .eq("id", user.id)
        .single();
      if (dbUser?.role !== "ADMIN" && dbUser?.role !== "MANAGER") {
        return NextResponse.json({ error: "No tienes permisos de administrador" }, { status: 403 });
      }
      actualUserId = targetUserId;
    }

    // Determine the timestamp to use
    const actionTime = timestamp ? new Date(timestamp).toISOString() : new Date().toISOString();

    if (action === "CHECK_IN") {
      // Resolve target user ID in `users` table
      let dbUserId = actualUserId;
      const { data: targetDbUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", actualUserId)
        .maybeSingle();

      if (!targetDbUser) {
        // Find by email from auth user if user.id does not match users.id
        const { data: userByEmail, error: emailSearchError } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        if (emailSearchError) {
          console.error("[Attendance API] Error searching user by email:", emailSearchError);
        }

        if (userByEmail) {
          dbUserId = userByEmail.id;
        } else if (user.email) {
          const nowIso = new Date().toISOString();
          // Auto-register user in `users` table if missing
          const { data: newUser, error: autoCreateError } = await supabase
            .from("users")
            .insert({
              id: user.id,
              email: user.email,
              name: user.user_metadata?.name || user.email.split("@")[0],
              role: user.user_metadata?.role || "ADMIN",
              password: "MANAGED_BY_SUPABASE",
              created_at: nowIso,
              updated_at: nowIso,
            })
            .select("id")
            .single();

          if (autoCreateError) {
            console.error("[Attendance API] autoCreateError detail:", autoCreateError);
          }

          if (!autoCreateError && newUser) {
            dbUserId = newUser.id;
          } else {
            return NextResponse.json(
              { error: `No se pudo registrar automáticamente al usuario: ${autoCreateError?.message || 'Error desconocido'}` },
              { status: 500 }
            );
          }
        } else {
          console.error("[Attendance API] User has no email in auth context:", user);
          return NextResponse.json(
            { error: "No se encontró el registro de usuario en la base de datos." },
            { status: 400 }
          );
        }
      }

      // Create a new record
      const { data, error } = await supabase
        .from("attendance")
        .insert({
          user_id: dbUserId,
          date: todayDate,
          check_in: actionTime,
          status: "ACTIVE",
        })
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json(data);
    } else if (action === "CHECK_OUT") {
      // Resolve target user ID in `users` table
      let dbUserId = actualUserId;
      const { data: targetDbUser } = await supabase
        .from("users")
        .select("id")
        .eq("id", actualUserId)
        .maybeSingle();

      if (!targetDbUser) {
        const { data: userByEmail } = await supabase
          .from("users")
          .select("id")
          .eq("email", user.email)
          .maybeSingle();

        if (userByEmail) {
          dbUserId = userByEmail.id;
        }
      }

      // Find active record
      const { data: activeRecords, error: fetchError } = await supabase
        .from("attendance")
        .select("id")
        .eq("user_id", dbUserId)
        .eq("date", todayDate)
        .eq("status", "ACTIVE")
        .order("created_at", { ascending: false })
        .limit(1);

      if (fetchError || !activeRecords || activeRecords.length === 0) {
        return NextResponse.json({ error: "No hay un turno activo para finalizar" }, { status: 400 });
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
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
