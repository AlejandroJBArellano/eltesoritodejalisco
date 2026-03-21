import { KitchenDisplaySystem } from "@/components/kitchen/KitchenDisplaySystem";
import { createClient } from "@/lib/supabase/server";

export const mapOrderData = (dbOrder: any) => {
  return {
    ...dbOrder,
    orderNumber: dbOrder.order_number,
    customerId: dbOrder.customer_id,
                createdAt: dbOrder.created_at ? (dbOrder.created_at.includes('Z') || dbOrder.created_at.includes('+') ? dbOrder.created_at : `${dbOrder.created_at.replace(' ', 'T')}Z`) : null,
                updatedAt: dbOrder.updated_at ? (dbOrder.updated_at.includes('Z') || dbOrder.updated_at.includes('+') ? dbOrder.updated_at : `${dbOrder.updated_at.replace(' ', 'T')}Z`) : null,
                orderItems: Array.isArray(dbOrder.order_items)
      ? dbOrder.order_items.map((item: any) => ({
        ...item,
        orderId: item.order_id,
        menuItemId: item.menu_item_id,
        unitPrice: item.unit_price,
        menuItem: item.menu_items
          ? {
            ...item.menu_items,
            imageUrl: item.menu_items?.image_url,
            isAvailable: item.menu_items?.is_available,
          }
          : { name: "Producto", price: item.unit_price || 0 },
      }))
      : [],
    customer: dbOrder.customers || dbOrder.customer || undefined,
  };
};

// In production, fetch from API with real-time subscription
async function getActiveOrders() {
  const supabase = await createClient();
  const { data: orders } = await supabase
    .from("orders")
    .select(`
      *,
      order_items (
        *,
        menu_items (*)
      )
    `)
    .in("status", ["PENDING", "PREPARING", "READY"])
    .order("created_at", { ascending: true });

  return (orders || []).map(mapOrderData);
}

export default async function KitchenPage() {
  const orders = await getActiveOrders();

  return (
    <main className="p-4 bg-[#121212] min-h-screen grid grid-cols-1">
      <div className="w-full">
        <h1 className="text-2xl font-bold mb-4 text-[#E0E0E0]">
          Comandas en Cocina
        </h1>
        <KitchenDisplaySystem initialOrders={orders} />
      </div>
    </main>
  );
}
