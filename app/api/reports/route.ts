import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    const supabase = await createClient();

    // 1. Sales Summary (Completed Orders)
    const { data: completedOrders, error: ordersError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (*)
        )
      `)
      .in("status", ["DELIVERED", "PAID"])
      .gte("created_at", sevenDaysAgo.toISOString())
      .order("created_at", { ascending: true });

    if (ordersError) throw ordersError;

    // Calculate totals
    const totalSales = (completedOrders || []).reduce(
      (sum, order) => sum + (order.total || 0),
      0,
    );
    const totalOrders = (completedOrders || []).length;
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Sales by Day
    const salesByDay: Record<string, number> = {};
    (completedOrders || []).forEach((order) => {
      const date = order.created_at.split("T")[0];
      salesByDay[date] = (salesByDay[date] || 0) + (order.total || 0);
    });

    // Sales by Source
    const salesBySource: Record<string, { count: number; total: number }> = {};
    (completedOrders || []).forEach((order) => {
      const source = order.source || "Desconocido";
      if (!salesBySource[source]) {
        salesBySource[source] = { count: 0, total: 0 };
      }
      salesBySource[source].count += 1;
      salesBySource[source].total += (order.total || 0);
    });

    // 2. Top Selling Items
    const itemSales: Record<string, { name: string; quantity: number; revenue: number }> =
      {};
    (completedOrders || []).forEach((order) => {
      (order as any).order_items.forEach((item: any) => {
        if (!itemSales[item.menu_item_id]) {
          itemSales[item.menu_item_id] = {
            name: item.menu_items?.name || "Unknown",
            quantity: 0,
            revenue: 0,
          };
        }
        itemSales[item.menu_item_id].quantity += item.quantity;
        itemSales[item.menu_item_id].revenue += item.quantity * item.unit_price;
      });
    });

    const topSellingItems = Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 3. Inventory Status
    const { data: ingredients, error: invError } = await supabase
      .from("ingredients")
      .select("*");

    if (invError) throw invError;

    const lowStockIngredients = (ingredients || []).filter(
      (ing) => ing.current_stock <= ing.minimum_stock,
    );
    const totalStockValue = (ingredients || []).reduce(
      (sum, ing) => sum + ing.current_stock * (ing.cost_per_unit || 0),
      0,
    );

    // 4. Customer Insights
    const { data: customers, error: custError } = await supabase
      .from("customers")
      .select("*")
      .order("total_spend", { ascending: false })
      .limit(5);

    if (custError) throw custError;
    
    const { count: newCustomersCount, error: countError } = await supabase
        .from("customers")
        .select("*", { count: 'exact', head: true })
        .gte("created_at", sevenDaysAgo.toISOString());

    if (countError) throw countError;

    return NextResponse.json({
      summary: {
        totalSales,
        totalOrders,
        averageTicket,
      },
      salesByDay,
      salesBySource,
      topSellingItems,
      inventory: {
        lowStockCount: lowStockIngredients.length,
        totalStockValue,
        lowStockItems: lowStockIngredients.map(i => ({ name: i.name, stock: i.current_stock, min: i.minimum_stock }))
      },
      customers: {
        topCustomers: customers,
        newCustomersCount: newCustomersCount || 0
      }
    });
  } catch (error) {
    console.error("Error generating reports:", error);
    return NextResponse.json(
      { error: "Error al generar reportes" },
      { status: 500 },
    );
  }
}
