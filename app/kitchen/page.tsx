import { KitchenDisplaySystem } from "@/components/kitchen/KitchenDisplaySystem";
import { createClient } from "@/lib/supabase/server";
import { mapOrderData } from "@/lib/mappers/orders";
import type { DbOrderPayload } from "@/lib/mappers/orders";

// Fetch active kitchen orders
async function getActiveOrders() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        *,
        menu_items (*)
      )
    `,
    )
    .in("status", ["PENDING", "PREPARING", "READY"])
    .order("created_at", { ascending: true });

  return (orders || []).map((o) =>
    mapOrderData(o as unknown as DbOrderPayload),
  );
}

export default async function KitchenPage() {
  const orders = await getActiveOrders();

  return (
    <main className="min-h-screen bg-[#121212] pb-12">
      <KitchenDisplaySystem initialOrders={orders} />
    </main>
  );
}
