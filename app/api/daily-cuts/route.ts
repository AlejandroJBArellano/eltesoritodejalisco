import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function GET() {
  try {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from("daily_cuts")
      .select("*")
      .order("cut_date", { ascending: false })
      .limit(30);

    if (error) throw error;

    return NextResponse.json({ cuts: data || [] });
  } catch (error) {
    console.error("Error fetching daily cuts:", error);
    return NextResponse.json(
      { error: "Error al obtener los cortes diarios" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const {
      cut_date,
      venta_neta,
      iva_acumulado,
      propinas_efectivo,
      propinas_tarjeta,
      caja_efectivo,
      caja_tarjeta,
      utilidad_real,
      total_gastos,
      utilidad_final,
      total_orders,
      notes,
      expenses_detail,
    } = body;

    if (!cut_date) {
      return NextResponse.json(
        { error: "La fecha del corte es requerida" },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Check if a cut for this date already exists
    const { data: existing } = await supabase
      .from("daily_cuts")
      .select("id")
      .eq("cut_date", cut_date)
      .single();

    if (existing) {
      // Update existing cut for the same date
      const { data, error } = await supabase
        .from("daily_cuts")
        .update({
          venta_neta: venta_neta ?? 0,
          iva_acumulado: iva_acumulado ?? 0,
          propinas_efectivo: propinas_efectivo ?? 0,
          propinas_tarjeta: propinas_tarjeta ?? 0,
          caja_efectivo: caja_efectivo ?? 0,
          caja_tarjeta: caja_tarjeta ?? 0,
          utilidad_real: utilidad_real ?? 0,
          total_gastos: total_gastos ?? 0,
          utilidad_final: utilidad_final ?? 0,
          total_orders: total_orders ?? 0,
          notes: notes ?? null,
          expenses_detail: expenses_detail ?? [],
        })
        .eq("id", existing.id)
        .select()
        .single();

      if (error) throw error;
      return NextResponse.json({ cut: data, updated: true });
    }

    const { data, error } = await supabase
      .from("daily_cuts")
      .insert({
        cut_date,
        venta_neta: venta_neta ?? 0,
        iva_acumulado: iva_acumulado ?? 0,
        propinas_efectivo: propinas_efectivo ?? 0,
        propinas_tarjeta: propinas_tarjeta ?? 0,
        caja_efectivo: caja_efectivo ?? 0,
        caja_tarjeta: caja_tarjeta ?? 0,
        utilidad_real: utilidad_real ?? 0,
        total_gastos: total_gastos ?? 0,
        utilidad_final: utilidad_final ?? 0,
        total_orders: total_orders ?? 0,
        notes: notes ?? null,
        expenses_detail: expenses_detail ?? [],
      })
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json({ cut: data, updated: false }, { status: 201 });
  } catch (error) {
    console.error("Error saving daily cut:", error);
    return NextResponse.json(
      { error: "Error al guardar el corte diario" },
      { status: 500 }
    );
  }
}
