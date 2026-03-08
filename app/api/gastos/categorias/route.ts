import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
    try {
        const supabase = await createClient();
        const { data, error } = await supabase
            .from("expense_categories")
            .select("*")
            .eq("is_active", true)
            .order("name", { ascending: true });

        if (error) throw error;
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error fetching categories:", error);
        return NextResponse.json({ error: "Error fetching categories" }, { status: 500 });
    }
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { name, color } = body;
        if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

        const supabase = await createClient();
        const { data, error } = await supabase
            .from("expense_categories")
            .insert([{ name, color: color || "#3B82F6" }])
            .select()
            .single();

        if (error) {
            if (error.code === '23505') { // unique violation
                return NextResponse.json({ error: "Category already exists" }, { status: 400 });
            }
            throw error;
        }
        return NextResponse.json(data);
    } catch (error) {
        console.error("Error creating category:", error);
        return NextResponse.json({ error: "Error creating category" }, { status: 500 });
    }
}
