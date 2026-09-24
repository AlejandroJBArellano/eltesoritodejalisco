import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getTenantCollaborators } from "@/lib/users";

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenant = await getTenantContext();
    const adminSupabase = createAdminClient();

    // 1. Check profile role
    const { data: profileData } = await adminSupabase
      .from("profiles")
      .select("id, role")
      .eq("id", user.id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const role = profileData?.role || (user.user_metadata?.role as string);
    const isAdmin = role === "ADMIN" || role === "MANAGER" || !role;

    if (!isAdmin) {
      console.warn("[ATTENDANCE_HISTORY] Permission DENIED for role:", role);
      return NextResponse.json(
        {
          error: `No tienes permisos para ver el historial completo de asistencias (Rol actual: ${role}).`,
        },
        { status: 403 },
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
      .eq("tenant_id", tenant.id)
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
      console.error(
        "[ATTENDANCE_HISTORY] Error fetching attendance list:",
        attError,
      );
      throw attError;
    }

    // Fetch all collaborators to map user info reliably
    const allCollaborators = await getTenantCollaborators(tenant.id);

    const profilesMap = new Map(
      allCollaborators.map((c) => [
        c.id,
        {
          id: c.id,
          name: c.name,
          email: c.email || "",
          role: c.role || "WAITER",
        },
      ]),
    );

    // Combine attendance records with user info (attached as .users for frontend compatibility)
    const enrichedAttendances = (attendanceList || []).map((att) => {
      const u = profilesMap.get(att.user_id);
      return {
        ...att,
        users: u
          ? u
          : { id: att.user_id, name: "Empleado", email: "", role: "STAFF" },
      };
    });

    return NextResponse.json({ attendances: enrichedAttendances });
  } catch (error) {
    console.error("[ATTENDANCE_HISTORY] GET internal error:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error al obtener el historial de asistencias",
      },
      { status: 500 },
    );
  }
}
