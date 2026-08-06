// TesoritoOS - Menu Management API
// Handles menu items CRUD with Supabase Admin Storage integration

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextRequest, NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";
import { getProfile } from "@/lib/auth";

/**
 * GET /api/menu
 * Get all menu items (including translations for i18n)
 */
export async function GET() {
  try {
    const tenant = await getTenantContext();
    const supabase = await createClient();
    const { data: items, error } = await supabase
      .from("menu_items")
      .select("*, translations")
      .eq("tenant_id", tenant.id)
      .order("name", { ascending: true });

    if (error) throw error;

    // Fetch only the top 5 most ordered item IDs from the database view
    const { data: popularData } = await supabase
      .from("popular_menu_items")
      .select("menu_item_id")
      .eq("tenant_id", tenant.id)
      .gte("order_count", 5)
      .order("order_count", { ascending: false })
      .limit(5);

    const popularIds = new Set((popularData || []).map((row) => row.menu_item_id));

    const enrichedItems = (items || []).map((item) => ({
      ...item,
      is_popular: popularIds.has(item.id),
      is_recommended: false,
    }));

    return NextResponse.json({ items: enrichedItems });
  } catch (error) {
    console.error("Error fetching menu items:", error);
    return NextResponse.json(
      { error: "Failed to fetch menu items" },
      { status: 500 },
    );
  }
}

/**
 * Helper to upload image using Admin Client (bypassing RLS on storage.objects)
 */
async function uploadImageToStorage(imageFile: File): Promise<string> {
  const supabaseAdmin = createAdminClient();

  // Attempt to create bucket if it doesn't exist yet
  try {
    await supabaseAdmin.storage.createBucket("menu-items", { public: true });
  } catch {
    // Bucket already exists or cannot be recreated
  }

  const fileExt = imageFile.name.split(".").pop() || "jpg";
  const fileName = `${Date.now()}-${Math.random().toString(36).substring(2, 9)}.${fileExt}`;
  const filePath = `${fileName}`;

  const { error: uploadError } = await supabaseAdmin.storage
    .from("menu-items")
    .upload(filePath, imageFile, { upsert: true });

  if (uploadError) {
    console.error("Storage upload error:", uploadError);
    throw new Error(
      `Error al subir imagen a almacenamiento: ${uploadError.message}`,
    );
  }

  const {
    data: { publicUrl },
  } = supabaseAdmin.storage.from("menu-items").getPublicUrl(filePath);

  return publicUrl;
}

/**
 * POST /api/menu
 * Create a new menu item with image upload
 */
export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const formData = await request.formData();
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const category = formData.get("category") as string;
    const isAvailable = formData.get("isAvailable") === "true";
    const imageFile = formData.get("image") as File | null;
    let imageUrl = (formData.get("imageUrl") as string) || null;
    const translationsRaw = formData.get("translations") as string | null;
    const translations = translationsRaw ? JSON.parse(translationsRaw) : {};
    const ingredientId = (formData.get("ingredientId") as string) || null;
    const showInDineIn = formData.get("showInDineIn") !== "false";
    const showInTakeaway = formData.get("showInTakeaway") !== "false";

    if (!name) {
      return NextResponse.json(
        { error: "El nombre es obligatorio" },
        { status: 400 },
      );
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "El precio debe ser un número mayor o igual a 0" },
        { status: 400 },
      );
    }

    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadImageToStorage(imageFile);
    }

    const tenant = await getTenantContext();
    const supabaseAdmin = createAdminClient();
    const id = crypto.randomUUID();

    let stripeProductId: string | null = null;
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const { stripe } = await import("@/lib/stripe");
        const stripeProduct = await stripe.products.create({
          name,
          description: description || undefined,
          active: isAvailable,
        });
        stripeProductId = stripeProduct.id;
      }
    } catch (stripeErr) {
      console.error("Error creating product in Stripe:", stripeErr);
      throw new Error(`Error en Stripe: ${(stripeErr as Error).message}`);
    }

    const { data: item, error: createError } = await supabaseAdmin
      .from("menu_items")
      .insert({
        id,
        name,
        description: description || null,
        price: parsedPrice,
        category: category || null,
        image_url: imageUrl || null,
        is_available: isAvailable,
        stripe_product_id: stripeProductId,
        translations,
        ingredient_id: ingredientId,
        tenant_id: tenant.id,
        show_in_dine_in: showInDineIn,
        show_in_takeaway: showInTakeaway,
        updated_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (createError) throw createError;

    return NextResponse.json({ item }, { status: 201 });
  } catch (error) {
    console.error("Error creating menu item:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo crear el producto",
      },
      { status: 500 },
    );
  }
}

/**
 * PUT /api/menu
 * Update a menu item with optional new image upload
 */
export async function PUT(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const formData = await request.formData();
    const id = formData.get("id") as string;
    const name = formData.get("name") as string;
    const description = formData.get("description") as string;
    const price = formData.get("price") as string;
    const category = formData.get("category") as string;
    const isAvailable = formData.get("isAvailable") === "true";
    const imageFile = formData.get("image") as File | null;
    let imageUrl = (formData.get("imageUrl") as string) || null;
    const translationsRaw = formData.get("translations") as string | null;
    const translations = translationsRaw
      ? JSON.parse(translationsRaw)
      : undefined;
    const ingredientId = (formData.get("ingredientId") as string) || null;
    const showInDineIn = formData.get("showInDineIn");
    const showInTakeaway = formData.get("showInTakeaway");

    if (!id || !name) {
      return NextResponse.json(
        { error: "El ID y el nombre son obligatorios" },
        { status: 400 },
      );
    }

    const parsedPrice = Number(price);
    if (!Number.isFinite(parsedPrice) || parsedPrice < 0) {
      return NextResponse.json(
        { error: "El precio debe ser un número mayor o igual a 0" },
        { status: 400 },
      );
    }

    if (imageFile && imageFile.size > 0) {
      imageUrl = await uploadImageToStorage(imageFile);
    }

    const tenant = await getTenantContext();
    const supabaseAdmin = createAdminClient();

    // Fetch existing product to check if it has a stripe_product_id
    const { data: existingItem, error: fetchError } = await supabaseAdmin
      .from("menu_items")
      .select("stripe_product_id")
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .maybeSingle();

    if (fetchError || !existingItem) {
      return NextResponse.json(
        { error: "Producto no encontrado o no autorizado" },
        { status: 404 },
      );
    }

    let stripeProductId = existingItem.stripe_product_id || null;
    try {
      if (process.env.STRIPE_SECRET_KEY) {
        const { stripe } = await import("@/lib/stripe");
        if (stripeProductId) {
          await stripe.products.update(stripeProductId, {
            name,
            description: description || undefined,
            active: isAvailable,
          });
        } else {
          const stripeProduct = await stripe.products.create({
            name,
            description: description || undefined,
            active: isAvailable,
          });
          stripeProductId = stripeProduct.id;
        }
      }
    } catch (stripeErr) {
      console.error("Error updating product in Stripe:", stripeErr);
      throw new Error(`Error en Stripe: ${(stripeErr as Error).message}`);
    }

    const { data: item, error: updateError } = await supabaseAdmin
      .from("menu_items")
      .update({
        name,
        description: description || null,
        price: parsedPrice,
        category: category || null,
        image_url: imageUrl || null,
        is_available: isAvailable,
        stripe_product_id: stripeProductId,
        ingredient_id: ingredientId,
        ...(translations !== undefined ? { translations } : {}),
        ...(showInDineIn !== null ? { show_in_dine_in: showInDineIn === "true" } : {}),
        ...(showInTakeaway !== null ? { show_in_takeaway: showInTakeaway === "true" } : {}),
        updated_at: new Date().toISOString(),
      })
      .eq("id", id)
      .eq("tenant_id", tenant.id)
      .select()
      .single();

    if (updateError) throw updateError;

    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error updating menu item:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "No se pudo actualizar el producto",
      },
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
    const profile = await getProfile();
    if (!profile || (profile.role !== "ADMIN" && profile.role !== "MANAGER")) {
      return NextResponse.json({ error: "No autorizado" }, { status: 403 });
    }
    const { id } = await request.json();

    if (!id) {
      return NextResponse.json(
        { error: "El ID del producto es obligatorio" },
        { status: 400 },
      );
    }

    const tenant = await getTenantContext();
    const supabaseAdmin = createAdminClient();
    const { error } = await supabaseAdmin
      .from("menu_items")
      .delete()
      .eq("id", id)
      .eq("tenant_id", tenant.id);

    if (error) throw error;

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Error deleting menu item:", error);
    return NextResponse.json(
      { error: "No se pudo eliminar el producto" },
      { status: 500 },
    );
  }
}
