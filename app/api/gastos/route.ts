import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const month = searchParams.get("month"); // e.g. "2024-03"

    try {
        const supabase = await createClient();
        let query = supabase
            .from("expenses")
            .select(`
        *,
        expense_categories (name, color)
      `)
            .order("date", { ascending: false })
            .order("created_at", { ascending: false });

        if (month) {
            const startDate = `${month}-01`;
            const dateObj = new Date(startDate);
            // Calcula el primer día del siguiente mes usando timezone neutral (UTC-ish)
            let nextMonth = dateObj.getMonth() + 1;
            let year = dateObj.getFullYear();
            if (nextMonth > 11) {
                nextMonth = 0;
                year++;
            }
            const endDate = `${year}-${(nextMonth + 1).toString().padStart(2, '0')}-01`;

            query = query.gte("date", startDate).lt("date", endDate);
        }

        const { data, error } = await query;
        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching expenses:", error);
        return NextResponse.json({ error: "Error fetching expenses" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { category_id, amount, description, has_invoice, date } = body;

        if (!category_id || !amount || !description) {
            return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
        }

        const supabase = await createClient();
        const { data, error } = await supabase
            .from("expenses")
            .insert([{
                category_id,
                amount: parseFloat(amount),
                description,
                has_invoice: Boolean(has_invoice),
                date: date || new Date().toISOString().split("T")[0]
            }])
            .select(`
        *,
        expense_categories (name, color)
      `)
            .single();

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating expense:", error);
        return NextResponse.json({ error: "Error creating expense" }, { status: 500 });
    }
}
