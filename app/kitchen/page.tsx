import { KitchenDisplaySystem } from "@/components/kitchen/KitchenDisplaySystem";
import { prisma } from "@/lib/prisma";
import { OrderWithDetails } from "@/types";

// In production, fetch from API with real-time subscription
async function getActiveOrders() {
  const orders = await prisma.order.findMany({
    where: {
      status: { in: ["PENDING", "PREPARING", "READY"] },
    },
    include: {
      orderItems: {
        include: {
          menuItem: true,
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });
  
  // Serialize dates to strings to avoid "Date object" warning in Client Components
  return JSON.parse(JSON.stringify(orders));
}

export default async function KitchenPage() {
  const orders = await getActiveOrders();

  return (
    <main>
      <KitchenDisplaySystem initialOrders={orders} />
    </main>
  );
}
