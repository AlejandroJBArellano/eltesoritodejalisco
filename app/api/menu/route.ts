// TesoritoOS - Menu Management API
// Handles menu items CRUD with Supabase Storage integration

import { prisma } from "@/lib/prisma";
import { createClient } from "@/lib/supabase/server";
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
 * Create a new menu item with optional image upload
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const category = formData.get("category") as string;
    const isAvailable = formData.get("isAvailable") === "true";
    const imageFile = formData.get("image") as File | null;

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

    let imageUrl = null;

    // Handle image upload to Supabase Storage
    if (imageFile && imageFile.size > 0) {
      const supabase = await createClient();
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { data, error: uploadError } = await supabase.storage
        .from('menu-items')
        .upload(filePath, imageFile);

      if (uploadError) {
        console.error("Storage upload error:", uploadError);
      } else {
        const { data: { publicUrl } } = supabase.storage
          .from('menu-items')
          .getPublicUrl(filePath);
        imageUrl = publicUrl;
      }
    }

    const item = await prisma.menuItem.create({
      data: {
        name,
        description: description || null,
        price: parsedPrice,
        category: category || null,
        imageUrl,
        isAvailable,
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
 * Update a menu item with optional new image
 */
export async function PUT(request: NextRequest) {
  try {
    const formData = await request.formData();
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const category = formData.get("category") as string;
    const isAvailable = formData.get("isAvailable") === "true";
    const imageFile = formData.get("image") as File | null;
    let imageUrl = formData.get("imageUrl") as string | null;

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

    // Handle new image upload if provided
    if (imageFile && imageFile.size > 0) {
      const supabase = await createClient();
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('menu-items')
        .upload(filePath, imageFile);

      if (!uploadError) {
        const { data: { publicUrl } } = supabase.storage
          .from('menu-items')
          .getPublicUrl(filePath);
        imageUrl = publicUrl;
      }
    }

    const item = await prisma.menuItem.update({
      where: { id },
      data: {
        name,
        description: description || null,
        price: parsedPrice,
        category: category || null,
        imageUrl: imageUrl || null,
        isAvailable,
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
