import { prisma } from "@/lib/prisma";
import { NextResponse } from "next/server";

export async function GET() {
  try {
    const today = new Date();
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(today.getDate() - 7);

    // 1. Sales Summary (Completed Orders)
    const completedOrders = await prisma.order.findMany({
      where: {
        status: { in: ["DELIVERED", "PAID"] },
        createdAt: { gte: sevenDaysAgo }, // Last 7 days for charts
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

    // Calculate totals
    const totalSales = completedOrders.reduce(
      (sum, order) => sum + order.total,
      0,
    );
    const totalOrders = completedOrders.length;
    const averageTicket = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Sales by Day
    const salesByDay: Record<string, number> = {};
    completedOrders.forEach((order) => {
      const date = order.createdAt.toISOString().split("T")[0];
      salesByDay[date] = (salesByDay[date] || 0) + order.total;
    });

    // Sales by Source
    const salesBySource: Record<string, { count: number; total: number }> = {};
    completedOrders.forEach((order) => {
      const source = order.source || "Desconocido";
      if (!salesBySource[source]) {
        salesBySource[source] = { count: 0, total: 0 };
      }
      salesBySource[source].count += 1;
      salesBySource[source].total += order.total;
    });

    // 2. Top Selling Items
    const itemSales: Record<string, { name: string; quantity: number; revenue: number }> =
      {};
    completedOrders.forEach((order) => {
      order.orderItems.forEach((item) => {
        if (!itemSales[item.menuItemId]) {
          itemSales[item.menuItemId] = {
            name: item.menuItem.name,
            quantity: 0,
            revenue: 0,
          };
        }
        itemSales[item.menuItemId].quantity += item.quantity;
        itemSales[item.menuItemId].revenue += item.quantity * item.unitPrice;
      });
    });

    const topSellingItems = Object.values(itemSales)
      .sort((a, b) => b.quantity - a.quantity)
      .slice(0, 5);

    // 3. Inventory Status
    const ingredients = await prisma.ingredient.findMany();
    const lowStockIngredients = ingredients.filter(
      (ing) => ing.currentStock <= ing.minimumStock,
    );
    const totalStockValue = ingredients.reduce(
      (sum, ing) => sum + ing.currentStock * (ing.costPerUnit || 0),
      0,
    );

    // 4. Customer Insights
    const customers = await prisma.customer.findMany({
      orderBy: { totalSpend: "desc" },
      take: 5,
    });
    
    const newCustomersCount = await prisma.customer.count({
        where: {
            createdAt: { gte: sevenDaysAgo }
        }
    });

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
        lowStockItems: lowStockIngredients.map(i => ({ name: i.name, stock: i.currentStock, min: i.minimumStock }))
      },
      customers: {
        topCustomers: customers,
        newCustomersCount
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
