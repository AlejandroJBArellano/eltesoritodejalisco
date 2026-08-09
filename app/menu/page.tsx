import { createClient } from "@/lib/supabase/server";
import { MenuContent } from "@/components/menu/MenuContent";
import { getTenantContext } from "@/lib/tenant";
import { MenuItem, SortField } from "@/components/menu/types";

async function getMenuItems(): Promise<MenuItem[]> {
  const tenant = await getTenantContext();
  const supabase = await createClient();
  const { data: items, error } = await supabase
    .from("menu_items")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching menu items:", error);
    return [];
  }

  return (items || []).map((item) => ({
    id: item.id,
    name: item.name,
    description: item.description,
    price: item.price,
    category: item.category,
    imageUrl: item.image_url,
    isAvailable: item.is_available,
    translations: item.translations,
    ingredientId: item.ingredient_id,
    show_in_dine_in: item.show_in_dine_in,
    show_in_takeaway: item.show_in_takeaway,
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

  const rawItems = await getMenuItems();

  // 1. Filter
  const filteredItems = rawItems.filter((item) => {
    if (q.trim()) {
      const lowerQ = q.toLowerCase();
      const matchName = item.name.toLowerCase().includes(lowerQ);
      const matchDesc = (item.description || "").toLowerCase().includes(lowerQ);
      const matchCat = (item.category || "").toLowerCase().includes(lowerQ);
      if (!matchName && !matchDesc && !matchCat) return false;
    }
    if (category !== "all" && item.category !== category) return false;
    if (availability === "available" && !item.isAvailable) return false;
    if (availability === "unavailable" && item.isAvailable) return false;
    return true;
  });

  // 2. Sort
  const sortedItems = [...filteredItems].sort((a, b) => {
    let comp = 0;
    if (sort === "name") {
      comp = a.name.localeCompare(b.name);
    } else if (sort === "price") {
      comp = a.price - b.price;
    } else if (sort === "category") {
      comp = (a.category || "").localeCompare(b.category || "");
    } else if (sort === "isAvailable") {
      comp = (a.isAvailable ? 1 : 0) - (b.isAvailable ? 1 : 0);
    }
    return direction === "asc" ? comp : -comp;
  });

  // 3. Paginate
  const totalItems = sortedItems.length;
  const totalPages = Math.ceil(totalItems / pageSize) || 1;
  const start = (page - 1) * pageSize;
  const paginatedItems = sortedItems.slice(start, start + pageSize);

  // Stats / Unique Categories
  const activeCount = rawItems.filter((item) => item.isAvailable).length;
  const categoriesList = Array.from(
    new Set(rawItems.map((i) => i.category).filter(Boolean)),
  ).sort() as string[];

  return (
    <MenuContent
      items={rawItems}
      paginatedItems={paginatedItems}
      categories={categoriesList}
      activeCount={activeCount}
      totalPages={totalPages}
      totalItems={totalItems}
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
