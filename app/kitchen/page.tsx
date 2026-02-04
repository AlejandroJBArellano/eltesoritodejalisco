// TesoritoOS - Kitchen Display Page
// Real-time kitchen view with order management

import { KitchenDisplaySystem } from "@/components/kitchen/KitchenDisplaySystem";

// In production, fetch from API with real-time subscription
async function getActiveOrders() {
  // This would be replaced with actual API call
  // For now, returning mock data structure
  return [];
}

export default async function KitchenPage() {
  const orders = await getActiveOrders();

  return (
    <main>
      <KitchenDisplaySystem initialOrders={orders} />
    </main>
  );
}
