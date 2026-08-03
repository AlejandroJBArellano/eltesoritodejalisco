import { KitchenDisplaySystem } from "@/components/kitchen/KitchenDisplaySystem";
import { createClient } from "@/lib/supabase/server";
import { mapOrderData } from "@/lib/mappers/orders";
import type { DbOrderPayload } from "@/lib/mappers/orders";

import { getTenantContext } from "@/lib/tenant";

// Fetch active kitchen orders
async function getActiveOrders() {
  const tenant = await getTenantContext();
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(
      `
      *,
      order_items (
        *,
        menu_items (*)
      ),
      payments (*)
    `,
    )
    .eq("tenant_id", tenant.id)
    .in("status", ["PENDING", "PREPARING", "READY"])
    .order("created_at", { ascending: true });

  return (orders || []).map((o) =>
    mapOrderData(o as unknown as DbOrderPayload),
  );
}

export default async function KitchenPage() {
  const tenant = await getTenantContext();
  const orders = await getActiveOrders();

  return <KitchenDisplaySystem initialOrders={orders} tenantId={tenant.id} />;
}
