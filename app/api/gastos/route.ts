import { createClient } from "@/lib/supabase/server";
import { getCurrentCDMXDay } from "@/lib/utils";
import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const month = searchParams.get("month"); // e.g. "2024-03"

  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();
    let query = supabase
      .from("expenses")
      .select(
        `
        *,
        expense_categories (name, color, tipo_gasto)
      `,
      )
      .eq("tenant_id", tenant.id)
      .order("date", { ascending: false })
      .order("created_at", { ascending: false });

    let totalSales = 0;

    if (month) {
      const [yearNum, monthNum] = month.split("-").map(Number);
      let nextYear = yearNum;
      let nextMonth = monthNum + 1;
      if (nextMonth > 12) {
        nextMonth = 1;
        nextYear++;
      }
      const startDate = `${yearNum}-${String(monthNum).padStart(2, "0")}-01`;
      const endDate = `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`;

      query = query.gte("date", startDate).lt("date", endDate);

      // Fetch monthly sales (completed orders) using operational_date
      const { data: salesData, error: salesError } = await supabase
        .from("orders")
        .select("total")
        .eq("tenant_id", tenant.id)
        .in("status", ["DELIVERED", "PAID"])
        .gte("operational_date", startDate)
        .lt("operational_date", endDate);

      if (!salesError && salesData) {
        totalSales = salesData.reduce(
          (sum, order) => sum + (order.total || 0),
          0,
        );
      }
    }

    const { data, error } = await query;
    if (error) throw error;
    return NextResponse.json({ expenses: data || [], totalSales });
  } catch (error) {
    console.error("Error fetching expenses:", error);
    return NextResponse.json(
      { error: "Error fetching expenses" },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { category_id, amount, description, has_invoice, date } = body;

    if (!category_id || !amount || !description) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }

    const tenant = await getTenantContext();
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("expenses")
      .insert([
        {
          tenant_id: tenant.id,
          category_id,
          amount: parseFloat(amount),
          description,
          has_invoice: Boolean(has_invoice),
          date: date || getCurrentCDMXDay(),
        },
      ])
      .select(
        `
        *,
        expense_categories (name, color, tipo_gasto)
      `,
      )
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error creating expense:", error);
    return NextResponse.json(
      { error: "Error creating expense" },
      { status: 500 },
    );
  }
}
