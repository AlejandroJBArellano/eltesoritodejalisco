// TesoritoOS - Inventory Deduction API
// Handles automatic inventory deduction when orders are completed

import { deductInventoryForOrder } from "@/lib/services/inventory";
import { NextRequest, NextResponse } from "next/server";

/**
 * POST /api/inventory/deduct
 * Deduct ingredients from inventory for a completed order
 */
export async function POST(request: NextRequest) {
  try {
    const { orderId } = await request.json();

    if (!orderId) {
      return NextResponse.json(
        { error: "Order ID is required" },
        { status: 400 },
      );
    }

    const result = await deductInventoryForOrder(orderId);

    if (!result.success) {
      return NextResponse.json(
        {
          error: "Failed to deduct inventory",
          details: result.errors,
        },
        { status: 400 },
      );
    }

    return NextResponse.json({
      success: true,
      message: "Inventory deducted successfully",
      deductions: result.deductions,
    });
  } catch (error) {
    console.error("Error deducting inventory:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 },
    );
  }
}
