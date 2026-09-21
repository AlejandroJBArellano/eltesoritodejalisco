import { createAdminClient } from "@/lib/supabase/admin";

export interface McpToolContext {
  tenantId: string;
  scopes: string[];
}

export interface McpToolDefinition {
  name: string;
  description: string;
  parameters: Record<string, any>;
  execute: (args: any, ctx: McpToolContext) => Promise<any>;
}

export const MCP_TOOLS: Record<string, McpToolDefinition> = {
  get_dashboard_metrics: {
    name: "get_dashboard_metrics",
    description:
      "Obtiene las métricas operativas y de ventas del restaurante en tiempo real (ventas totales, órdenes activas, ticket promedio y comparación diaria).",
    parameters: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description: "Fecha en formato YYYY-MM-DD. Por defecto hoy.",
        },
      },
    },
    execute: async (args, ctx) => {
      const supabase = createAdminClient();
      const targetDate = args?.date || new Date().toISOString().split("T")[0];
      const startIso = `${targetDate}T00:00:00.000Z`;
      const endIso = `${targetDate}T23:59:59.999Z`;

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, total, status, payment_status, created_at")
        .eq("tenant_id", ctx.tenantId)
        .gte("created_at", startIso)
        .lte("created_at", endIso);

      if (error) throw new Error(`Error consultando órdenes: ${error.message}`);

      const validOrders = (orders || []).filter(
        (o) => o.status !== "CANCELADO" && o.status !== "CANCELLED",
      );

      const totalSales = validOrders
        .filter((o) => o.payment_status === "PAID" || o.payment_status === "PAGADO")
        .reduce((sum, o) => sum + (Number(o.total) || 0), 0);

      const paidCount = validOrders.filter(
        (o) => o.payment_status === "PAID" || o.payment_status === "PAGADO",
      ).length;

      const activeOrders = validOrders.filter(
        (o) => o.status !== "COMPLETADO" && o.status !== "COMPLETED" && o.status !== "ENTREGADO",
      );

      const avgTicket = paidCount > 0 ? totalSales / paidCount : 0;

      return {
        date: targetDate,
        total_sales: Math.round(totalSales * 100) / 100,
        completed_orders_count: paidCount,
        active_orders_count: activeOrders.length,
        average_ticket: Math.round(avgTicket * 100) / 100,
        total_orders_recorded: validOrders.length,
      };
    },
  },

  get_active_orders: {
    name: "get_active_orders",
    description:
      "Lista las comandas u órdenes activas en cocina, barra o salón, con tiempos transcurridos, estatus y desglose de platillos.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Número máximo de órdenes a retornar (default 20).",
        },
      },
    },
    execute: async (args, ctx) => {
      const supabase = createAdminClient();
      const limit = args?.limit || 20;

      const { data: orders, error } = await supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          table_number,
          order_type,
          status,
          total,
          notes,
          created_at,
          order_items (
            id,
            quantity,
            notes,
            unit_price,
            total_price,
            menu_items (
              name
            )
          )
        `,
        )
        .eq("tenant_id", ctx.tenantId)
        .not("status", "in", '("COMPLETADO","CANCELADO","CANCELLED")')
        .order("created_at", { ascending: true })
        .limit(limit);

      if (error) throw new Error(`Error al obtener órdenes activas: ${error.message}`);

      const now = Date.now();
      const formatted = (orders || []).map((o: any) => {
        const createdTime = new Date(o.created_at).getTime();
        const elapsedMinutes = Math.floor((now - createdTime) / 60000);

        return {
          id: o.id,
          order_number: o.order_number,
          table_number: o.table_number,
          order_type: o.order_type,
          status: o.status,
          total: o.total,
          elapsed_minutes: elapsedMinutes,
          created_at: o.created_at,
          items: (o.order_items || []).map((item: any) => ({
            name: item.menu_items?.name || "Platillo",
            quantity: item.quantity,
            notes: item.notes,
            unit_price: item.unit_price,
            total_price: item.total_price,
          })),
        };
      });

      return {
        active_count: formatted.length,
        orders: formatted,
      };
    },
  },

  get_order_details: {
    name: "get_order_details",
    description:
      "Obtiene el detalle completo de una orden específica (platillos, pagos, notas y auditoría).",
    parameters: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "ID de la orden (UUID o número de orden).",
        },
      },
      required: ["orderId"],
    },
    execute: async (args, ctx) => {
      if (!args?.orderId) throw new Error("orderId es requerido");
      const supabase = createAdminClient();

      let query = supabase
        .from("orders")
        .select(
          `
          id,
          order_number,
          table_number,
          order_type,
          status,
          payment_status,
          total,
          subtotal,
          tax,
          tip,
          notes,
          created_at,
          order_items (
            id,
            quantity,
            unit_price,
            total_price,
            notes,
            menu_items (
              name
            )
          ),
          payments (
            id,
            amount,
            payment_method,
            status,
            created_at
          )
        `,
        )
        .eq("tenant_id", ctx.tenantId);

      // Buscar por UUID o por order_number
      if (args.orderId.length === 36 && args.orderId.includes("-")) {
        query = query.eq("id", args.orderId);
      } else {
        query = query.eq("order_number", args.orderId);
      }

      const { data: order, error } = await query.single();
      if (error || !order) throw new Error("Orden no encontrada");

      return order;
    },
  },

  get_sales_report: {
    name: "get_sales_report",
    description:
      "Genera un reporte consolidado de ventas por rango de fechas, métodos de pago y métricas de rendimiento.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Fecha inicial (YYYY-MM-DD).",
        },
        endDate: {
          type: "string",
          description: "Fecha final (YYYY-MM-DD).",
        },
      },
      required: ["startDate", "endDate"],
    },
    execute: async (args, ctx) => {
      const { startDate, endDate } = args;
      if (!startDate || !endDate) throw new Error("startDate y endDate son requeridos");

      const supabase = createAdminClient();
      const startIso = `${startDate}T00:00:00.000Z`;
      const endIso = `${endDate}T23:59:59.999Z`;

      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, total, status, payment_status, created_at")
        .eq("tenant_id", ctx.tenantId)
        .gte("created_at", startIso)
        .lte("created_at", endIso);

      if (error) throw new Error(`Error al generar reporte: ${error.message}`);

      const validOrders = (orders || []).filter(
        (o) =>
          o.status !== "CANCELADO" &&
          (o.payment_status === "PAID" || o.payment_status === "PAGADO"),
      );

      const totalRevenue = validOrders.reduce(
        (sum, o) => sum + (Number(o.total) || 0),
        0,
      );

      const dailyBreakdown: Record<string, { count: number; total: number }> = {};
      validOrders.forEach((o) => {
        const day = o.created_at.split("T")[0];
        if (!dailyBreakdown[day]) dailyBreakdown[day] = { count: 0, total: 0 };
        dailyBreakdown[day].count += 1;
        dailyBreakdown[day].total += Number(o.total) || 0;
      });

      return {
        start_date: startDate,
        end_date: endDate,
        total_revenue: Math.round(totalRevenue * 100) / 100,
        paid_orders_count: validOrders.length,
        average_ticket:
          validOrders.length > 0
            ? Math.round((totalRevenue / validOrders.length) * 100) / 100
            : 0,
        daily_breakdown: dailyBreakdown,
      };
    },
  },

  get_popular_items: {
    name: "get_popular_items",
    description:
      "Lista los platillos y bebidas más vendidos por volumen de pedidos e ingresos generados.",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Número máximo de productos (default 10).",
        },
        days: {
          type: "number",
          description: "Días hacia atrás a analizar (default 30).",
        },
      },
    },
    execute: async (args, ctx) => {
      const supabase = createAdminClient();
      const limit = args?.limit || 10;
      const days = args?.days || 30;

      const dateLimit = new Date();
      dateLimit.setDate(dateLimit.getDate() - days);

      const { data: items, error } = await supabase
        .from("order_items")
        .select(
          `
          menu_item_id,
          quantity,
          total_price,
          menu_items (
            id,
            name,
            price
          ),
          orders!inner (
            tenant_id,
            status,
            created_at
          )
        `,
        )
        .eq("orders.tenant_id", ctx.tenantId)
        .gte("orders.created_at", dateLimit.toISOString())
        .not("orders.status", "in", '("CANCELADO","CANCELLED")');

      if (error) throw new Error(`Error al consultar platillos populares: ${error.message}`);

      const itemMap: Record<
        string,
        { id: string; name: string; quantity: number; revenue: number }
      > = {};

      (items || []).forEach((row: any) => {
        const id = row.menu_item_id || "unknown";
        const name = row.menu_items?.name || "Sin nombre";
        if (!itemMap[id]) {
          itemMap[id] = { id, name, quantity: 0, revenue: 0 };
        }
        itemMap[id].quantity += Number(row.quantity) || 0;
        itemMap[id].revenue += Number(row.total_price) || 0;
      });

      const sorted = Object.values(itemMap)
        .sort((a, b) => b.quantity - a.quantity)
        .slice(0, limit);

      return {
        analyzed_days: days,
        top_items: sorted,
      };
    },
  },

  get_inventory_status: {
    name: "get_inventory_status",
    description:
      "Consulta el stock actual de insumos e ingredientes, costos y alertas de stock bajo mínimo.",
    parameters: {
      type: "object",
      properties: {
        onlyLowStock: {
          type: "boolean",
          description: "Si es true, solo retorna ingredientes con stock menor o igual al mínimo.",
        },
      },
    },
    execute: async (args, ctx) => {
      const supabase = createAdminClient();
      const { data: ingredients, error } = await supabase
        .from("ingredients")
        .select("id, name, current_stock, min_stock, unit, cost, category")
        .eq("tenant_id", ctx.tenantId)
        .order("name", { ascending: true });

      if (error) throw new Error(`Error al consultar inventario: ${error.message}`);

      const processed = (ingredients || []).map((i) => {
        const isLow = Number(i.current_stock) <= Number(i.min_stock);
        return {
          id: i.id,
          name: i.name,
          current_stock: i.current_stock,
          min_stock: i.min_stock,
          unit: i.unit,
          cost: i.cost,
          category: i.category,
          is_low_stock: isLow,
        };
      });

      const filtered = args?.onlyLowStock ? processed.filter((i) => i.is_low_stock) : processed;

      return {
        total_items: processed.length,
        low_stock_count: processed.filter((i) => i.is_low_stock).length,
        items: filtered,
      };
    },
  },

  get_recipe_details: {
    name: "get_recipe_details",
    description:
      "Obtiene la ficha técnica y receta con insumos necesarios para preparar un platillo del menú.",
    parameters: {
      type: "object",
      properties: {
        menuItemId: {
          type: "string",
          description: "ID del platillo en el menú.",
        },
        query: {
          type: "string",
          description: "Nombre o término de búsqueda del platillo.",
        },
      },
    },
    execute: async (args, ctx) => {
      const supabase = createAdminClient();

      let itemQuery = supabase
        .from("menu_items")
        .select("id, name, price, description")
        .eq("tenant_id", ctx.tenantId);

      if (args?.menuItemId) {
        itemQuery = itemQuery.eq("id", args.menuItemId);
      } else if (args?.query) {
        itemQuery = itemQuery.ilike("name", `%${args.query}%`);
      }

      const { data: menuItem, error: itemError } = await itemQuery.limit(1).maybeSingle();
      if (itemError || !menuItem) throw new Error("Platillo no encontrado");

      const { data: recipes, error: recipeError } = await supabase
        .from("recipe_items")
        .select(
          `
          id,
          quantity,
          ingredients (
            id,
            name,
            unit,
            cost
          )
        `,
        )
        .eq("menu_item_id", menuItem.id);

      if (recipeError) throw new Error(`Error al obtener receta: ${recipeError.message}`);

      let calculatedCost = 0;
      const ingredients = (recipes || []).map((r: any) => {
        const unitCost = Number(r.ingredients?.cost) || 0;
        const qty = Number(r.quantity) || 0;
        const totalCost = unitCost * qty;
        calculatedCost += totalCost;

        return {
          ingredient_id: r.ingredients?.id,
          name: r.ingredients?.name,
          quantity: qty,
          unit: r.ingredients?.unit,
          unit_cost: unitCost,
          total_cost: Math.round(totalCost * 100) / 100,
        };
      });

      return {
        menu_item: menuItem,
        ingredients,
        estimated_food_cost: Math.round(calculatedCost * 100) / 100,
        margin_percent:
          menuItem.price > 0
            ? Math.round(((menuItem.price - calculatedCost) / menuItem.price) * 100)
            : 0,
      };
    },
  },

  get_daily_cuts: {
    name: "get_daily_cuts",
    description:
      "Consulta el historial de cortes de caja diarios (ventas en efectivo, tarjeta, propinas y diferencias).",
    parameters: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Número de cortes a consultar (default 7).",
        },
      },
    },
    execute: async (args, ctx) => {
      const supabase = createAdminClient();
      const limit = args?.limit || 7;

      const { data: cuts, error } = await supabase
        .from("daily_cuts")
        .select("*")
        .eq("tenant_id", ctx.tenantId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (error) throw new Error(`Error al consultar cortes: ${error.message}`);

      return {
        count: (cuts || []).length,
        cuts: cuts || [],
      };
    },
  },

  get_expenses_summary: {
    name: "get_expenses_summary",
    description:
      "Obtiene el resumen de gastos y egresos operativos clasificados por categoría en un periodo.",
    parameters: {
      type: "object",
      properties: {
        startDate: {
          type: "string",
          description: "Fecha inicial (YYYY-MM-DD).",
        },
        endDate: {
          type: "string",
          description: "Fecha final (YYYY-MM-DD).",
        },
      },
    },
    execute: async (args, ctx) => {
      const supabase = createAdminClient();
      let query = supabase
        .from("expenses")
        .select(
          `
          id,
          amount,
          description,
          date,
          created_at,
          expense_categories (
            name
          )
        `,
        )
        .eq("tenant_id", ctx.tenantId);

      if (args?.startDate) {
        query = query.gte("date", args.startDate);
      }
      if (args?.endDate) {
        query = query.lte("date", args.endDate);
      }

      const { data: expenses, error } = await query.order("date", { ascending: false });
      if (error) throw new Error(`Error al consultar gastos: ${error.message}`);

      const categoryTotals: Record<string, number> = {};
      let totalAmount = 0;

      (expenses || []).forEach((e: any) => {
        const cat = e.expense_categories?.name || "Sin categoría";
        const amt = Number(e.amount) || 0;
        categoryTotals[cat] = (categoryTotals[cat] || 0) + amt;
        totalAmount += amt;
      });

      return {
        total_expenses: Math.round(totalAmount * 100) / 100,
        expenses_count: (expenses || []).length,
        by_category: categoryTotals,
        recent_expenses: (expenses || []).slice(0, 15),
      };
    },
  },

  get_menu_catalog: {
    name: "get_menu_catalog",
    description:
      "Consulta el catálogo activo del menú con categorías, precios y disponibilidad.",
    parameters: {
      type: "object",
      properties: {
        categoryId: {
          type: "string",
          description: "Filtrar por ID de categoría específico.",
        },
      },
    },
    execute: async (args, ctx) => {
      const supabase = createAdminClient();

      const { data: categories, error: catError } = await supabase
        .from("menu_categories")
        .select("id, name, sort_order")
        .eq("tenant_id", ctx.tenantId)
        .order("sort_order", { ascending: true });

      if (catError) throw new Error(`Error al consultar categorías: ${catError.message}`);

      let itemQuery = supabase
        .from("menu_items")
        .select("id, name, description, price, is_available, category_id")
        .eq("tenant_id", ctx.tenantId)
        .order("name", { ascending: true });

      if (args?.categoryId) {
        itemQuery = itemQuery.eq("category_id", args.categoryId);
      }

      const { data: items, error: itemError } = await itemQuery;
      if (itemError) throw new Error(`Error al consultar platillos: ${itemError.message}`);

      return {
        categories: categories || [],
        total_items: (items || []).length,
        items: items || [],
      };
    },
  },
};
