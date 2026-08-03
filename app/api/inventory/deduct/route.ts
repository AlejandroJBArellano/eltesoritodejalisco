// TesoritoOS - Inventory Deduction API
// Handles manual or fallback order deductions

import { deductInventoryForOrder } from "@/lib/services/inventory";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/inventory/deduct
 * Manually deduct inventory for an order
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { orderId } = body;

    if (!orderId) {
      return NextResponse.json(
        { error: "orderId is required" },
        { status: 400 },
      );
    }

    const result = await deductInventoryForOrder(orderId);

    if (!result.success) {
      return NextResponse.json(
        { error: result.errors?.[0] || "Failed to deduct inventory" },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      deductions: result.deductions,
    });
  } catch (error) {
    console.error("Error in inventory deduction endpoint:", error);
    return NextResponse.json(
      { error: "Failed to process inventory deduction" },
      { status: 500 },
    );
  }
}
