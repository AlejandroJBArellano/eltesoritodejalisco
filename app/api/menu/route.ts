// TesoritoOS - Menu Management API
// Handles menu items CRUD

import { prisma } from "@/lib/prisma";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/menu
 * Get all menu items
 */
export async function GET() {
  try {
    const items = await prisma.menuItem.findMany({
      orderBy: { name: "asc" },
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu items" },
      { status: 500 },
    );
  }
}

/**
 * POST /api/menu
 * Create a new menu item
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { name, description, price, category, imageUrl, isAvailable } = body;

    if (!name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
        { status: 400 },
      );
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        description: description || null,
        price: parsedPrice,
        category: category || null,
        imageUrl: imageUrl || null,
        isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      },
    });

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      { error: "Failed to create menu item" },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/menu
 * Update a menu item
 */
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, name, description, price, category, imageUrl, isAvailable } =
      body;

    if (!id || !name) {
      return NextResponse.json(
        { error: "ID and name are required" },
        { status: 400 },
      );
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "Price must be a non-negative number" },
        { status: 400 },
      );
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description: description || null,
        price: parsedPrice,
        category: category || null,
        imageUrl: imageUrl || null,
        isAvailable: Boolean(isAvailable),
      },
    });

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error updating menu item:", error);
    return NextResponse.json(
      { error: "Failed to update menu item" },
      { status: 500 },
    );
  }
}

/**
 * DELETE /api/menu
 * Delete a menu item
 */
export async function DELETE(request: NextRequest) {
  try {
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "Menu item ID is required" },
        { status: 400 },
      );
    }

    await prisma.menuItem.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json(
      { error: "Failed to delete menu item" },
      { status: 500 },
    );
  }
}
