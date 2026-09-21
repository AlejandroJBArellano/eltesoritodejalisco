import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  ErrorCode,
  McpError,
} from "@modelcontextprotocol/sdk/types.js";

export interface KittnMcpConfig {
  apiKey?: string;
  apiUrl?: string;
}

export const KITTN_TOOLS_SCHEMAS = [
  {
    name: "get_dashboard_metrics",
    description:
      "Obtiene las métricas operativas y de ventas del restaurante en tiempo real (ventas totales, órdenes activas, ticket promedio y comparación diaria).",
    inputSchema: {
      type: "object",
      properties: {
        date: {
          type: "string",
          description:
            "Fecha en formato YYYY-MM-DD. Si se omite, consulta el día de hoy.",
        },
      },
    },
  },
  {
    name: "get_active_orders",
    description:
      "Lista las comandas u órdenes activas en cocina, barra o salón con sus tiempos de espera, estatus y desglose de platillos.",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Número máximo de órdenes a listar (default 20).",
        },
      },
    },
  },
  {
    name: "get_order_details",
    description:
      "Obtiene el detalle completo de una comanda u orden (platillos, pagos, notas y auditoría).",
    inputSchema: {
      type: "object",
      properties: {
        orderId: {
          type: "string",
          description: "ID de la orden (UUID o número de comanda).",
        },
      },
      required: ["orderId"],
    },
  },
  {
    name: "get_sales_report",
    description:
      "Genera un reporte consolidado de ventas por rango de fechas, métodos de pago y desglose diario.",
    inputSchema: {
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
  },
  {
    name: "get_popular_items",
    description:
      "Lista los platillos y bebidas más vendidos por volumen de pedidos e ingresos generados.",
    inputSchema: {
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
  },
  {
    name: "get_inventory_status",
    description:
      "Consulta el stock actual de insumos e ingredientes, costos y alertas de stock bajo nivel mínimo.",
    inputSchema: {
      type: "object",
      properties: {
        onlyLowStock: {
          type: "boolean",
          description:
            "Si es true, solo retorna insumos con stock crítico/bajo mínimo.",
        },
      },
    },
  },
  {
    name: "get_recipe_details",
    description:
      "Obtiene la ficha técnica y receta con insumos necesarios para preparar un platillo del menú.",
    inputSchema: {
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
  },
  {
    name: "get_daily_cuts",
    description:
      "Consulta el historial de cortes de caja diarios (ventas en efectivo, tarjeta, propinas y diferencias).",
    inputSchema: {
      type: "object",
      properties: {
        limit: {
          type: "number",
          description: "Número de cortes a consultar (default 7).",
        },
      },
    },
  },
  {
    name: "get_expenses_summary",
    description:
      "Obtiene el resumen de gastos y egresos operativos clasificados por categoría en un periodo.",
    inputSchema: {
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
  },
  {
    name: "get_menu_catalog",
    description:
      "Consulta el catálogo activo del menú con categorías, precios y disponibilidad.",
    inputSchema: {
      type: "object",
      properties: {
        categoryId: {
          type: "string",
          description: "Filtrar por ID de categoría específico.",
        },
      },
    },
  },
];

export function createKittnMcpServer(config: KittnMcpConfig = {}) {
  const server = new Server(
    {
      name: "kittnos-mcp-server",
      version: "1.0.0",
    },
    {
      capabilities: {
        tools: {},
      },
    },
  );

  const getApiKey = () => config.apiKey || process.env.KITTN_API_KEY || "";
  const getApiUrl = () =>
    config.apiUrl ||
    process.env.KITTN_API_URL ||
    "https://admin.trykittn.com/api/mcp/v1/query";

  // Manejador de lista de herramientas
  server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
      tools: KITTN_TOOLS_SCHEMAS,
    };
  });

  // Manejador de ejecución de herramientas
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: toolArgs } = request.params;
    const apiKey = getApiKey();
    const apiUrl = getApiUrl();

    if (!apiKey) {
      throw new McpError(
        ErrorCode.InvalidRequest,
        "KITTN_API_KEY no configurada. Por favor obtén tu clave en Ajustes > Conectar IA en KittnOS y configúrala como variable de entorno.",
      );
    }

    const matchedTool = KITTN_TOOLS_SCHEMAS.find((t) => t.name === name);
    if (!matchedTool) {
      throw new McpError(
        ErrorCode.MethodNotFound,
        `Herramienta no encontrada: ${name}`,
      );
    }

    try {
      const response = await fetch(apiUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
          "x-kittn-api-key": apiKey,
        },
        body: JSON.stringify({
          tool: name,
          arguments: toolArgs || {},
        }),
      });

      const data = await response.json();

      if (!response.ok || data.error) {
        return {
          content: [
            {
              type: "text",
              text: `Error de KittnOS: ${data.error || response.statusText}`,
            },
          ],
          isError: true,
        };
      }

      return {
        content: [
          {
            type: "text",
            text: JSON.stringify(data.result, null, 2),
          },
        ],
      };
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      return {
        content: [
          {
            type: "text",
            text: `Error de conexión con KittnOS Gateway (${apiUrl}): ${errMsg}`,
          },
        ],
        isError: true,
      };
    }
  });

  return server;
}
