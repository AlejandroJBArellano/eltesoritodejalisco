import { createClient } from "@/lib/supabase/server";
import { MenuContent } from "@/components/menu/MenuContent";
import { getTenantContext } from "@/lib/tenant";
import {
  MenuItem,
  SortField,
  MenuCategory,
  Ingredient,
  Translations,
} from "@/components/menu/types";
import { Database } from "@/types/supabase";

export const dynamic = "force-dynamic";

type DbMenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type DbMenuCategory = Database["public"]["Tables"]["menu_categories"]["Row"];
type DbIngredient = Database["public"]["Tables"]["ingredients"]["Row"];

async function getAllMenuItems(tenantId: string): Promise<MenuItem[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select(
      "id, name, description, price, category, image_url, is_available, translations, ingredient_id, show_in_dine_in, show_in_takeaway",
    )
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching menu items:", error);
    return [];
  }

  const items = (data || []) as DbMenuItem[];

  // Grupos de personalización por producto (si la migración aún no existe, 0)
  const groupCounts = new Map<string, number>();
  if (items.length > 0) {
    const { data: groupRows, error: groupError } = await supabase
      .from("menu_item_option_groups")
      .select("menu_item_id")
      .eq("tenant_id", tenantId);
    if (!groupError) {
      for (const row of (groupRows || []) as { menu_item_id: string }[]) {
        groupCounts.set(
          row.menu_item_id,
          (groupCounts.get(row.menu_item_id) || 0) + 1,
        );
      }
    }
  }

  return items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    imageUrl: item.image_url,
    isAvailable: item.is_available,
    translations: (item.translations as unknown as Translations) || undefined,
    ingredientId: item.ingredient_id,
    show_in_dine_in: item.show_in_dine_in ?? true,
    show_in_takeaway: item.show_in_takeaway ?? true,
    customizationGroups: groupCounts.get(item.id) || 0,
  }));
}

async function getMenuCategories(tenantId: string): Promise<MenuCategory[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("sort_order", { ascending: true });

  if (error) {
    console.error("Error fetching menu categories:", error);
    return [];
  }

  const categories = (data || []) as DbMenuCategory[];

  return categories.map((cat) => ({
    id: cat.id,
    name: cat.name,
    sort_order: cat.sort_order ?? 0,
    is_active: cat.is_active ?? true,
    show_in_pickup: cat.show_in_pickup ?? true,
    translations: (cat.translations as unknown as Translations) || undefined,
  }));
}

async function getIngredients(tenantId: string): Promise<Ingredient[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("tenant_id", tenantId)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching ingredients:", error);
    return [];
  }

  const ingredients = (data || []) as DbIngredient[];

  return ingredients.map((ing) => ({
    id: ing.id,
    name: ing.name,
    unit: ing.unit,
    currentStock: ing.current_stock,
    minimumStock: ing.minimum_stock,
    costPerUnit: ing.cost_per_unit,
    trackingType: (ing.tracking_type === "PIECE" ? "PIECE" : "MEASURABLE") as
      | "MEASURABLE"
      | "PIECE",
    createdAt: ing.created_at ?? "",
    updatedAt: ing.updated_at ?? "",
  }));
}

export default async function MenuPage({
  searchParams,
}: {
  searchParams: Promise<{
    q?: string;
    category?: string;
    availability?: string;
    sort?: string;
    direction?: string;
    page?: string;
    pageSize?: string;
  }>;
}) {
  const params = await searchParams;
  const q = params.q || "";
  const category = params.category || "all";
  const availability = params.availability || "all";
  const sort = (params.sort as SortField) || "name";
  const direction = (params.direction as "asc" | "desc") || "asc";
  const page = Number(params.page) || 1;
  const pageSize = Number(params.pageSize) || 10;

  const tenant = await getTenantContext();

  const [allItems, initialCategories, initialIngredients] = await Promise.all([
    getAllMenuItems(tenant.id),
    getMenuCategories(tenant.id),
    getIngredients(tenant.id),
  ]);

  const categoriesList = initialCategories.map((c) => c.name);

  return (
    <MenuContent
      items={allItems}
      categories={categoriesList}
      initialMenuCategories={initialCategories}
      initialIngredients={initialIngredients}
      searchParams={{
        q,
        category,
        availability,
        sort,
        direction,
        page,
        pageSize,
      }}
    />
  );
}
