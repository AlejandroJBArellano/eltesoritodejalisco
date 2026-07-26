import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();


    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const adminSupabase = createAdminClient();

    // 1. Primary check: profiles table (used by getProfile() in dashboard)
    const { data: profileData } = await adminSupabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .maybeSingle();


    // 2. Secondary check: users table
    const { data: dbUserById } = await adminSupabase
      .from("users")
      .select("id, name, email, role")
      .eq("id", user.id)
      .maybeSingle();


    let dbUserByEmail = null;
    if (!dbUserById && user.email) {
      const { data: byEmail } = await adminSupabase
        .from("users")
        .select("id, name, email, role")
        .eq("email", user.email)
        .maybeSingle();
      dbUserByEmail = byEmail;
    }

    // Prioritize profileData.role (from profiles table)
    let role =
      profileData?.role ||
      dbUserById?.role ||
      dbUserByEmail?.role ||
      (user.user_metadata?.role as string);


    const isAdmin = role === "ADMIN" || role === "MANAGER" || !role;


    // Sync users table role if profileData has ADMIN but users table has obsolete role
    if (profileData?.role === "ADMIN" && dbUserById && dbUserById.role !== "ADMIN") {
      await adminSupabase
        .from("users")
        .update({ role: "ADMIN" })
        .eq("id", user.id);
    }

    if (!isAdmin) {
      console.warn("[ATTENDANCE_HISTORY] Permission DENIED for role:", role);
      return NextResponse.json(
        { error: `No tienes permisos para ver el historial completo de asistencias (Rol actual: ${role}).` },
        { status: 403 }
      );
    }

    // Parse filters
    const { searchParams } = new URL(request.url);
    const filterUserId = searchParams.get("userId");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");

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


    return NextResponse.json({ attendances: enrichedAttendances });
  } catch (error: any) {
    console.error("[ATTENDANCE_HISTORY] GET internal error:", error);
    return NextResponse.json(
      { error: error?.message || "Error al obtener el historial de asistencias" },
      { status: 500 }
    );
  }
}
