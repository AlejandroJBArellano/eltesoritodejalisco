import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

const DATE_REGEX = /^\d{4}-\d{2}-\d{2}$/;

export async function POST(request: NextRequest) {
  try {
    const { cutDate } = await request.json();

    if (!cutDate || typeof cutDate !== "string" || !DATE_REGEX.test(cutDate)) {
      return NextResponse.json(
        { error: "cutDate inválida. Debe ser YYYY-MM-DD" },
        { status: 400 },
      );
    }

    const supabase = await createClient();
    const { data: authData } = await supabase.auth.getUser();
    const userId = authData.user?.id ?? null;

    const { data, error } = await supabase.rpc("generar_corte_extemporaneo", {
      p_cut_date: cutDate,
      p_user_id: userId,
    });

    if (error) {
      if (error.message.includes("Ya existe corte")) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json({ ok: true, result: data?.[0] ?? null }, { status: 201 });
  } catch (error) {
    console.error("Error generating extemporaneous cut:", error);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
