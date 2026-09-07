import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { NextResponse } from "next/server";
import { addDays, differenceInCalendarDays, parseISO, format } from "date-fns";
import type { Database } from "@/types/supabase";

type ShiftInsert = Database["public"]["Tables"]["employee_shifts"]["Insert"];

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
        { error: "Permisos insuficientes para duplicar turnos" },
        { status: 403 }
      );
    }

    const body = await request.json();
    const { source_week_start, target_week_start } = body;

    if (!source_week_start || !target_week_start) {
      return NextResponse.json(
        { error: "Fechas de inicio de semana requeridas (origen y destino)" },
        { status: 400 }
      );
    }

    const sourceStart = parseISO(source_week_start);
    const targetStart = parseISO(target_week_start);
    const sourceEnd = addDays(sourceStart, 6);
    const targetEnd = addDays(targetStart, 6);

    const sourceStartStr = format(sourceStart, "yyyy-MM-dd");
    const sourceEndStr = format(sourceEnd, "yyyy-MM-dd");
    const targetStartStr = format(targetStart, "yyyy-MM-dd");
    const targetEndStr = format(targetEnd, "yyyy-MM-dd");

    const daysDiff = differenceInCalendarDays(targetStart, sourceStart);

    // 1. Fetch shifts from source week
    const { data: sourceShifts, error: fetchError } = await supabase
      .from("employee_shifts")
      .select("*")
      .eq("tenant_id", tenant.id)
      .gte("date", sourceStartStr)
      .lte("date", sourceEndStr);

    if (fetchError) {
      console.error("Error fetching source shifts:", fetchError);
      return NextResponse.json({ error: "Error al consultar turnos de la semana origen" }, { status: 500 });
    }

    if (!sourceShifts || sourceShifts.length === 0) {
      return NextResponse.json(
        { error: "No hay turnos registrados en la semana de origen para duplicar" },
        { status: 400 }
      );
    }

    // 2. Prepare new shifts by shifting date
    const newShifts: ShiftInsert[] = sourceShifts.map((s) => {
      const originalDate = parseISO(s.date);
      const newShiftDate = format(addDays(originalDate, daysDiff), "yyyy-MM-dd");
      return {
        tenant_id: tenant.id,
        user_id: s.user_id,
        date: newShiftDate,
        start_time: s.start_time,
        end_time: s.end_time,
        area: s.area,
        notes: s.notes,
      };
    });

    // 3. Optional: Delete existing shifts in target week to avoid duplicates, or just insert
    // Let's delete existing target week shifts so it's a clean copy
    await supabase
      .from("employee_shifts")
      .delete()
      .eq("tenant_id", tenant.id)
      .gte("date", targetStartStr)
      .lte("date", targetEndStr);

    // 4. Insert new shifts in target week
    const { data: inserted, error: insertError } = await supabase
      .from("employee_shifts")
      .insert(newShifts)
      .select();

    if (insertError) {
      console.error("Error inserting duplicated shifts:", insertError);
      return NextResponse.json({ error: "Error al duplicar turnos en la semana destino" }, { status: 500 });
    }

    return NextResponse.json({
      message: "Turnos duplicados correctamente",
      count: inserted?.length || 0,
      shifts: inserted || [],
    });
  } catch (error) {
    console.error("POST /api/shifts/duplicate error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
