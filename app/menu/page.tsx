import { createClient } from "@/lib/supabase/server";
import { MenuContent } from "@/components/menu/MenuContent";
import { getTenantContext } from "@/lib/tenant";
import { MenuItem, SortField, MenuCategory, Ingredient } from "@/components/menu/types";
import { Database } from "@/types/supabase";

type DbMenuItem = Database["public"]["Tables"]["menu_items"]["Row"];
type DbMenuCategory = Database["public"]["Tables"]["menu_categories"]["Row"];
type DbIngredient = Database["public"]["Tables"]["ingredients"]["Row"];

async function getMenuDropdownItems(): Promise<{ id: string; name: string; price: number }[]> {
  const tenant = await getTenantContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_items")
    .select("id, name, price")
    .eq("tenant_id", tenant.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching menu items for dropdown:", error);
    return [];
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    price: item.price,
  }));
}

async function getMenuCategories(): Promise<MenuCategory[]> {
  const tenant = await getTenantContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("menu_categories")
    .select("*")
    .eq("tenant_id", tenant.id)
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
    translations: cat.translations as any,
  }));
}

async function getIngredients(): Promise<Ingredient[]> {
  const tenant = await getTenantContext();
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("tenant_id", tenant.id)
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
    trackingType: ing.tracking_type as any,
    createdAt: ing.created_at ?? "",
    updatedAt: ing.updated_at ?? "",
  }));
}

async function getMenuStats(tenantId: string) {
  const supabase = await createClient();

  const [totalCountResult, activeCountResult] = await Promise.all([
    supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId),
    supabase
      .from("menu_items")
      .select("id", { count: "exact", head: true })
      .eq("tenant_id", tenantId)
      .eq("is_available", true),
  ]);

  return {
    totalCount: totalCountResult.count ?? 0,
    activeCount: activeCountResult.count ?? 0,
  };
}

async function getFilteredMenuItems(params: {
  tenantId: string;
  q: string;
  category: string;
  availability: string;
  sort: SortField;
  direction: "asc" | "desc";
  page: number;
  pageSize: number;
}): Promise<{ items: MenuItem[]; totalCount: number }> {
  const supabase = await createClient();
  let query = supabase
    .from("menu_items")
    .select("*", { count: "exact" })
    .eq("tenant_id", params.tenantId);

  if (params.q.trim()) {
    query = query.or(`name.ilike.%${params.q.trim()}%,description.ilike.%${params.q.trim()}%,category.ilike.%${params.q.trim()}%`);
  }
  if (params.category !== "all") {
    query = query.eq("category", params.category);
  }
  if (params.availability === "available") {
    query = query.eq("is_available", true);
  } else if (params.availability === "unavailable") {
    query = query.eq("is_available", false);
  }

  // Map sort field to DB column
  const sortColumn = params.sort === "isAvailable" ? "is_available" : params.sort;
  query = query.order(sortColumn, { ascending: params.direction === "asc" });

  const start = (params.page - 1) * params.pageSize;
  const end = start + params.pageSize - 1;
  query = query.range(start, end);

  const { data, count, error } = await query;
  if (error) {
    console.error("Error fetching filtered menu items:", error);
    return { items: [], totalCount: 0 };
  }

  const items = (data || []) as DbMenuItem[];
  const mappedItems: MenuItem[] = items.map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    imageUrl: item.image_url,
    isAvailable: item.is_available,
    translations: item.translations as any,
    ingredientId: item.ingredient_id,
    show_in_dine_in: item.show_in_dine_in ?? true,
    show_in_takeaway: item.show_in_takeaway ?? true,
  }));

  return {
    items: mappedItems,
    totalCount: count ?? 0,
  };
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

  const [dropdownItems, initialCategories, initialIngredients, stats, filteredResult] = await Promise.all([
    getMenuDropdownItems(),
    getMenuCategories(),
    getIngredients(),
    getMenuStats(tenant.id),
    getFilteredMenuItems({
      tenantId: tenant.id,
      q,
      category,
      availability,
      sort,
      direction,
      page,
      pageSize,
    }),
  ]);

  const totalItems = filteredResult.totalCount;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;

  const categoriesList = initialCategories.map((c) => c.name);

  return (
    <MenuContent
      items={dropdownItems as any}
      paginatedItems={filteredResult.items}
      categories={categoriesList}
      activeCount={stats.activeCount}
      totalPages={totalPages}
      totalItems={totalItems}
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
