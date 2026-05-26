import { createClient } from "@/lib/supabase/server";
import { MEX_TIMEZONE } from "@/lib/utils";
import { NextResponse } from "next/server";

function getCDMXDateString(offsetDays: number): string {
  const formatter = new Intl.DateTimeFormat("en-CA", {
    timeZone: MEX_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  });
  const todayMx = formatter.format(new Date());
  const [year, month, day] = todayMx.split("-").map(Number);
  // Use noon UTC to avoid crossing date boundaries during timezone conversion.
  const shifted = new Date(Date.UTC(year, month - 1, day, 12, 0, 0));
  shifted.setUTCDate(shifted.getUTCDate() + offsetDays);
  return formatter.format(shifted);
}

export async function GET() {
  try {
    const supabase = await createClient();
    const yesterday = getCDMXDateString(-1);

    const { data: existingCut, error: cutError } = await supabase
      .from("daily_cuts")
      .select("id")
      .eq("cut_date", yesterday)
      .maybeSingle();

    if (cutError) throw cutError;

    if (existingCut) {
      return NextResponse.json({
        hasPendingCut: false,
        pendingDate: null,
        pendingOrders: 0,
      });
    }

    const { count, error: ordersError } = await supabase
      .from("orders")
      .select("id", { count: "exact", head: true })
      .eq("operational_date", yesterday)
      .is("corte_id", null)
      .in("status", ["PAID", "DELIVERED", "UNCOLLECTED"]);

    if (ordersError) throw ordersError;

    const pendingOrders = count ?? 0;

    return NextResponse.json({
      hasPendingCut: pendingOrders > 0,
      pendingDate: pendingOrders > 0 ? yesterday : null,
      pendingOrders,
    });
  } catch (error) {
    console.error("Error checking pending cut:", error);
    return NextResponse.json(
      { error: "Error al verificar corte pendiente" },
      { status: 500 },
    );
  }
}
