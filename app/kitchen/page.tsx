import { IngredientBatchControl } from "@/components/kitchen/IngredientBatchControl";
import { KitchenDisplaySystem } from "@/components/kitchen/KitchenDisplaySystem";
import { prisma } from "@/lib/prisma";

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

async function getTrackedIngredient() {
  // Try to find the main protein like "Carne de Soya"
  let ingredient = await prisma.ingredient.findFirst({
    where: {
      name: { contains: "Soya", mode: "insensitive" },
    },
  });

  // Fallback to first ingredient if not found
  if (!ingredient) {
    ingredient = await prisma.ingredient.findFirst();
  }

  return ingredient ? JSON.parse(JSON.stringify(ingredient)) : null;
}

export default async function KitchenPage() {
  const orders = await getActiveOrders();
  const trackedIngredient = await getTrackedIngredient();

  return (
    <main className="p-4 bg-slate-100 min-h-screen grid grid-cols-1 lg:grid-cols-4 gap-6">
      <div className="lg:col-span-3">
        <h1 className="text-2xl font-bold mb-4 text-slate-800">
          Comandas en Cocina
        </h1>
        <KitchenDisplaySystem initialOrders={orders} />
      </div>

      <div className="lg:col-span-1">
        {trackedIngredient ? (
          <div className="sticky top-4 h-[calc(100vh-2rem)]">
            <IngredientBatchControl
              ingredientName={trackedIngredient.name}
              ingredientId={trackedIngredient.id}
            />
          </div>
        ) : (
          <div className="bg-white p-4 rounded shadow text-sm text-gray-500">
            Crea un ingrediente (ej. Carne de Soya) para activar el control de
            lotes.
          </div>
        )}
      </div>
    </main>
  );
}
