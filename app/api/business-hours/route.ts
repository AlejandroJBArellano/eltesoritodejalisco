// TesoritoOS - Business Hours API
// Handles retrieval and updates for store schedules and opening hours

import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/business-hours
 * Retrieve all business hours ordered by day_of_week
 */
export async function GET() {
  try {
    const supabase = createAdminClient();
    const { data: hours, error } = await supabase
      .from("business_hours")
      .select("*")
      .order("day_of_week", { ascending: true });

    if (error) throw error;

    return NextResponse.json({ hours });
  } catch (error) {
    console.error("Error fetching business hours:", error);
    return NextResponse.json(
      { error: "Error al obtener los horarios comerciales" },
      { status: 500 }
    );
  }
}

/**
 * PUT /api/business-hours
 * Bulk update business hours for specified days
 * Body: {
 *   hours: [
 *     { id: string, open_time: string, close_time: string, is_closed: boolean },
 *     ...
 *   ]
 * }
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { hours } = body;

    if (!hours || !Array.isArray(hours)) {
      return NextResponse.json(
        { error: "Se requiere un arreglo de horarios para actualizar" },
        { status: 400 }
      );
    }

    const supabase = createAdminClient();
    const errors: string[] = [];

    for (const item of hours) {
      const { id, open_time, close_time, is_closed } = item;
      
      if (!id) {
        errors.push("ID de registro faltante en uno de los elementos");
        continue;
      }

      const { error } = await supabase
        .from("business_hours")
        .update({
          open_time,
          close_time,
          is_closed
        })
        .eq("id", id);

      if (error) {
        errors.push(`Error al actualizar ID ${id}: ${error.message}`);
      }
    }

    if (errors.length > 0) {
      return NextResponse.json(
        { error: `Errores al actualizar horarios: ${errors.join(", ")}` },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error updating business hours:", error);
    return NextResponse.json(
      { error: "Error interno al actualizar los horarios comerciales" },
      { status: 500 }
    );
  }
}
