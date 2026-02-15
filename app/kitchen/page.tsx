import { IngredientBatchControl } from "@/components/kitchen/IngredientBatchControl";
import { KitchenDisplaySystem } from "@/components/kitchen/KitchenDisplaySystem";
import { createClient } from "@/lib/supabase/server";

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

  return orders || [];
}

async function getTrackedIngredient() {
  const supabase = await createClient();
  // Try to find the main protein like "Carne de Soya"
  const { data: ingredient } = await supabase
    .from("ingredients")
    .select("*")
    .ilike("name", "%Soya%")
    .limit(1)
    .maybeSingle();

  if (ingredient) return ingredient;

  // Fallback to first ingredient if not found
  const { data: firstIng } = await supabase
    .from("ingredients")
    .select("*")
    .limit(1)
    .maybeSingle();

  return firstIng;
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
