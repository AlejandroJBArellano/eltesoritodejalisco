import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// GET: Get the active batch for a specific ingredient
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const ingredientId = searchParams.get("ingredientId");

  if (!ingredientId) {
    return NextResponse.json(
      { error: "Ingredient ID is required" },
      { status: 400 },
    );
  }

  try {
    const supabase = await createClient();
    const { data: activeBatch, error } = await supabase
      .from("smart_batches")
      .select("*, ingredient:ingredients(*)")
      .eq("ingredient_id", ingredientId)
      .eq("is_active", true)
      .maybeSingle();

    if (error) throw error;

    return NextResponse.json({ activeBatch });
  } catch (error) {
    console.error("Error fetching active batch:", error);
    return NextResponse.json(
      { error: "Failed to fetch active batch" },
      { status: 500 },
    );
  }
}

// POST: Start a new smart batch
export async function POST(request: NextRequest) {
  try {
    const { ingredientId, name } = await request.json();

    if (!ingredientId) {
      return NextResponse.json(
        { error: "Ingredient ID is required" },
        { status: 400 },
      );
    }

    const supabase = await createClient();

    // Close any existing active batches for this ingredient
    const { error: updateError } = await supabase
      .from("smart_batches")
      .update({
        is_active: false,
        ended_at: new Date().toISOString(),
      })
      .eq("ingredient_id", ingredientId)
      .eq("is_active", true);

    if (updateError) throw updateError;

    const { data: newBatch, error: createError } = await supabase
      .from("smart_batches")
      .insert({
        ingredient_id: ingredientId,
        name: name || "Topper Standard",
        is_active: true,
      })
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json(newBatch, { status: 201 });
  } catch (error) {
    console.error("Error creating smart batch:", error);
    return NextResponse.json(
      { error: "Failed to create smart batch" },
      { status: 500 },
    );
  }
}
