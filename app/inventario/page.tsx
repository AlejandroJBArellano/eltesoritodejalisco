// KittnOS - Inventory Management Page
// Server component: loads all ingredients and renders the interactive table

import { getProfile } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { getTenantContext } from "@/lib/tenant";
import { redirect } from "next/navigation";
import { PageHeader } from "@/components/PageHeader";
import { InventarioTable } from "@/components/inventario/InventarioTable";
import { Package } from "lucide-react";
import type { Ingredient } from "@/types";

export const metadata = {
  title: "Inventario | KittnOS",
  description: "Gestión y control de inventario de ingredientes",
};

export default async function InventarioPage() {
  const profile = await getProfile();
  if (!profile) redirect("/login");
  if (profile.role !== "ADMIN" && profile.role !== "MANAGER") {
    redirect("/");
  }

  const tenant = await getTenantContext();
  const supabase = await createClient();

  const { data: rawIngredients, error } = await supabase
    .from("ingredients")
    .select("*")
    .eq("tenant_id", tenant.id)
    .order("name", { ascending: true });

  if (error) {
    console.error("Error fetching ingredients:", error);
  }

  const ingredients: Ingredient[] = (rawIngredients || []).map((ing) => ({
    id: ing.id,
    name: ing.name,
    unit: ing.unit,
    currentStock: ing.current_stock,
    minimumStock: ing.minimum_stock,
    costPerUnit: ing.cost_per_unit ?? undefined,
    trackingType: ing.tracking_type,
    createdAt: new Date(ing.created_at),
    updatedAt: new Date(ing.updated_at),
  }));

  return (
    <div className="min-h-screen">
      <main className="mx-auto max-w-7xl px-4 py-6 sm:py-10 sm:px-6 lg:px-8 space-y-6">
        <PageHeader
          title="Inventario"
          icon={<Package className="h-5 w-5 text-primary" />}
          subtitle={`${ingredients.length} ingredientes registrados`}
        />
        <InventarioTable initialIngredients={ingredients} />
      </main>
    </div>
  );
}
