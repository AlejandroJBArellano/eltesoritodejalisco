import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";
import { format } from "date-fns-tz";
import { differenceInMinutes } from "date-fns";

const TZ = "America/Mexico_City";

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    // Only allow admin or managers? Let's check role if strict, or assume caller is admin
    // since this is used during Corte Diario.

    const { cut_date, total_card_tips, total_cash_tips } = await request.json();
    
    const targetDate = cut_date || format(new Date(), "yyyy-MM-dd", { timeZone: TZ });
    const totalTips = (Number(total_card_tips) || 0) + (Number(total_cash_tips) || 0);

    // 1. Fetch finished attendances for the date
    const { data: attendances, error: fetchError } = await supabase
      .from("attendance")
      .select("id, user_id, check_in, check_out, users(id, name)")
      .eq("date", targetDate)
      .eq("status", "FINISHED");

    if (fetchError) {
      throw fetchError;
    }

    if (!attendances || attendances.length === 0) {
      return NextResponse.json({
        total_hours: 0,
        value_per_hour: 0,
        breakdown: [],
      });
    }

    // 2. Calculate hours per employee
    // Some employees might have multiple shifts in a day, so we sum them by user
    const hoursByUser: Record<string, { name: string; hours: number }> = {};

    let totalHoursAll = 0;

    for (const record of attendances) {
      if (record.check_in && record.check_out) {
        const checkIn = new Date(record.check_in);
        const checkOut = new Date(record.check_out);
        
        const diffMinutes = differenceInMinutes(checkOut, checkIn);
        const hours = diffMinutes / 60;

        const userId = record.user_id;
        const userName = Array.isArray(record.users) 
          ? record.users[0]?.name 
          : (record.users as any)?.name || "Desconocido";

        if (!hoursByUser[userId]) {
          hoursByUser[userId] = { name: userName, hours: 0 };
        }
        hoursByUser[userId].hours += hours;
        totalHoursAll += hours;
      }
    }

    // 3. Calculate Tip Value per Hour
    const valuePerHour = totalHoursAll > 0 ? totalTips / totalHoursAll : 0;

    // 4. Proportional Assignment
    const breakdown = Object.entries(hoursByUser).map(([userId, data]) => {
      // Round tips to 2 decimals
      const tipAmount = Math.round((data.hours * valuePerHour) * 100) / 100;
      return {
        userId,
        name: data.name,
        hours: Math.round(data.hours * 100) / 100, // round to 2 decimals for display
        tipAmount,
      };
    });

    return NextResponse.json({
      total_hours: Math.round(totalHoursAll * 100) / 100,
      value_per_hour: Math.round(valuePerHour * 100) / 100,
      breakdown,
    });

  } catch (error) {
    console.error("POST /api/tips/calculate error:", error);
    return NextResponse.json({ error: "Error interno del servidor" }, { status: 500 });
  }
}
