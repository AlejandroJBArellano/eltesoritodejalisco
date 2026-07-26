import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    console.log("[ATTENDANCE_HISTORY] GET request received.");
    console.log("[ATTENDANCE_HISTORY] Auth User:", user ? { id: user.id, email: user.email, metadata: user.user_metadata } : null);

    if (authError || !user) {
      console.warn("[ATTENDANCE_HISTORY] Unauthorized access attempt:", authError?.message);
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // 1. Check role in users table by ID
    const { data: dbUserById, error: userByIdError } = await adminSupabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", user.id)
      .maybeSingle();

    console.log("[ATTENDANCE_HISTORY] dbUserById:", dbUserById, "Error:", userByIdError?.message);

    // 2. Check role in users table by Email
    let dbUserByEmail = null;
    if (!dbUserById && user.email) {
      const { data: byEmail, error: emailErr } = await adminSupabase
        .from("users")
        .select("id, name, email, role")
        .eq("email", user.email)
        .maybeSingle();
      dbUserByEmail = byEmail;
      console.log("[ATTENDANCE_HISTORY] dbUserByEmail:", dbUserByEmail, "Error:", emailErr?.message);
    }

    // 3. Check profiles table by ID
    const { data: profileData, error: profileErr } = await adminSupabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();

    console.log("[ATTENDANCE_HISTORY] profileData:", profileData, "Error:", profileErr?.message);

    // Determine resolved role
    const resolvedRole =
      dbUserById?.role ||
      dbUserByEmail?.role ||
      profileData?.role ||
      (user.user_metadata?.role as string) ||
      "ADMIN"; // Default to ADMIN if logged in user is managing

    console.log("[ATTENDANCE_HISTORY] Resolved Role:", resolvedRole);

    const isEmployee = resolvedRole === "WAITER" || resolvedRole === "CHEF";
    const isAdmin = !isEmployee;

    console.log("[ATTENDANCE_HISTORY] Is Admin Permission Allowed:", isAdmin);

    if (!isAdmin) {
      console.warn("[ATTENDANCE_HISTORY] Permission DENIED for role:", resolvedRole);
      return NextResponse.json(
        { error: `No tienes permisos para ver el historial completo de asistencias (Rol actual: ${resolvedRole}).` },
        { status: 403 }
      );
    }

    // Parse filters
    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

    console.log("[ATTENDANCE_HISTORY] Applied filters:", { filterUserId, startDate, endDate });

    // Fetch attendances using Admin Client
    let attendanceQuery = adminSupabase
      .from("attendance")
      .select("*")
      .order("created_at", { ascending: false });

    if (filterUserId && filterUserId !== "ALL") {
      attendanceQuery = attendanceQuery.eq("user_id", filterUserId);
    }
    if (startDate) {
      attendanceQuery = attendanceQuery.gte("date", startDate);
    }
    if (endDate) {
      attendanceQuery = attendanceQuery.lte("date", endDate);
    }

    const { data: attendanceList, error: attError } = await attendanceQuery;

    if (attError) {
      console.error("[ATTENDANCE_HISTORY] Error fetching attendance list:", attError);
      throw attError;
    }

    // Fetch all users to map user info reliably
    const { data: allUsers } = await adminSupabase
      .from("users")
      .select("id, name, email, role");

    const usersMap = new Map((allUsers || []).map((u) => [u.id, u]));

    // Combine attendance records with user info
    const enrichedAttendances = (attendanceList || []).map((att) => {
      const u = usersMap.get(att.user_id);
      return {
        ...att,
        users: u ? { id: u.id, name: u.name, email: u.email, role: u.role } : { id: att.user_id, name: "Empleado", email: "", role: "STAFF" },
      };
    });

    console.log("[ATTENDANCE_HISTORY] Successfully fetched records count:", enrichedAttendances.length);

    return NextResponse.json({ attendances: enrichedAttendances });
  } catch (error: any) {
    console.error("[ATTENDANCE_HISTORY] GET internal error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al obtener el historial de asistencias" },
      { status: 500 }
    );
  }
}
