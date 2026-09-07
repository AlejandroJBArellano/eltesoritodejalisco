import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { NextResponse } from "next/server";
import type { Database } from "@/types/supabase";

type ShiftInsert = Database["public"]["Tables"]["employee_shifts"]["Insert"];

export async function GET(request: Request) {
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

    const { searchParams } = new URL(request.url);
    const startDate = searchParams.get("start_date");
    const endDate = searchParams.get("end_date");
    const requestedUserId = searchParams.get("user_id");

    // Check role
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const role = profile?.role || dbUser?.role || (user.user_metadata?.role as string);
    const isAdmin = role === "ADMIN" || role === "MANAGER";

    let query = supabase
      .from("employee_shifts")
      .select(`
        id,
        tenant_id,
        user_id,
        date,
        start_time,
        end_time,
        area,
        notes,
        created_at,
        updated_at
      `)
      .eq("tenant_id", tenant.id);

    if (startDate) {
      query = query.gte("date", startDate);
    }
    if (endDate) {
      query = query.lte("date", endDate);
    }

    // Non-admin can only view their own shifts, unless viewing general shifts if requestedUserId matches or not specified
    if (!isAdmin) {
      query = query.eq("user_id", user.id);
    } else if (requestedUserId) {
      query = query.eq("user_id", requestedUserId);
    }

    query = query.order("date", { ascending: true }).order("start_time", { ascending: true });

    const [shiftsRes, usersRes] = await Promise.all([
      query,
      isAdmin
        ? supabase
            .from("users")
            .select("id, name, email, role")
            .eq("tenant_id", tenant.id)
            .order("name", { ascending: true })
        : Promise.resolve({ data: null, error: null }),
    ]);

    if (shiftsRes.error) {
      console.error("Error fetching shifts:", shiftsRes.error);
      return NextResponse.json({ error: "Error al obtener turnos" }, { status: 500 });
    }

    return NextResponse.json({
      shifts: shiftsRes.data || [],
      users: usersRes.data || [],
      toleranceMinutes: tenant.attendance_tolerance_minutes ?? 10,
    });
  } catch (error) {
    console.error("GET /api/shifts error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
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

    // Role check
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const role = profile?.role || dbUser?.role || (user.user_metadata?.role as string);
    const isAdmin = role === "ADMIN" || role === "MANAGER";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Permisos insuficientes para asignar turnos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { id, user_id, date, start_time, end_time, area, notes } = body;

    if (!user_id || !date || !start_time || !end_time) {
      return NextResponse.json(
        { error: "Faltan campos obligatorios (empleado, fecha, hora inicio, hora fin)" },
        { status: 400 }
      );
    }

    // Format start_time and end_time to ensure HH:mm:ss
    const formatTime = (t: string) => (t.length === 5 ? `${t}:00` : t);
    const formattedStart = formatTime(start_time);
    const formattedEnd = formatTime(end_time);

    if (id) {
      // Update existing shift
      const { data: updated, error: updateError } = await supabase
        .from("employee_shifts")
        .update({
          user_id,
          date,
          start_time: formattedStart,
          end_time: formattedEnd,
          area: area || null,
          notes: notes || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", id)
        .eq("tenant_id", tenant.id)
        .select()
        .single();

      if (updateError) {
        console.error("Error updating shift:", updateError);
        return NextResponse.json({ error: "Error al actualizar turno" }, { status: 500 });
      }

      return NextResponse.json({ shift: updated });
    } else {
      // Create new shift
      const insertData: ShiftInsert = {
        tenant_id: tenant.id,
        user_id,
        date,
        start_time: formattedStart,
        end_time: formattedEnd,
        area: area || null,
        notes: notes || null,
      };

      const { data: created, error: insertError } = await supabase
        .from("employee_shifts")
        .insert(insertData)
        .select()
        .single();

      if (insertError) {
        console.error("Error creating shift:", insertError);
        return NextResponse.json({ error: "Error al crear turno" }, { status: 500 });
      }

      return NextResponse.json({ shift: created }, { status: 201 });
    }
  } catch (error) {
    console.error("POST /api/shifts error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
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

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const { data: dbUser } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    const role = profile?.role || dbUser?.role || (user.user_metadata?.role as string);
    const isAdmin = role === "ADMIN" || role === "MANAGER";

    if (!isAdmin) {
      return NextResponse.json(
        { error: "Permisos insuficientes para eliminar turnos" },
        { status: 403 }
      );
    }

    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id) {
      return NextResponse.json({ error: "ID de turno requerido" }, { status: 400 });
    }

    const { error: deleteError } = await supabase
      .from("employee_shifts")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (deleteError) {
      console.error("Error deleting shift:", deleteError);
      return NextResponse.json({ error: "Error al eliminar turno" }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("DELETE /api/shifts error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
