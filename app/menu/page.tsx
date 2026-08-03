import { createClient } from "@/lib/supabase/server";
import { MenuContent } from "@/components/menu/MenuContent";
import { getTenantContext } from "@/lib/tenant";

type MenuItem = {
  id: string;
  name: string;
  description?: string | null;
  price: number;
  category?: string | null;
  imageUrl?: string | null;
  isAvailable: boolean;
};

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
    ...item,
    isAvailable: item.is_available,
    imageUrl: item.image_url,
  }));
}

export default async function MenuPage() {
  const items = await getMenuItems();

  return <MenuContent initialItems={items} />;
}
