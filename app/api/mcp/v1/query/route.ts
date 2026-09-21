import { NextRequest, NextResponse } from "next/server";
import { validateMcpApiKey } from "@/lib/mcp/auth";
import { MCP_TOOLS } from "@/lib/mcp/tools";

export async function POST(req: NextRequest) {
  try {
    const authHeader =
      req.headers.get("authorization") || req.headers.get("x-kittn-api-key");

    const authResult = await validateMcpApiKey(authHeader);
    if (!authResult.valid) {
      return NextResponse.json({ error: authResult.error }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { tool, arguments: toolArgs } = body;

    if (!tool || typeof tool !== "string") {
      return NextResponse.json(
        { error: "Nombre de herramienta 'tool' requerido" },
        { status: 400 },
      );
    }

    const toolDef = MCP_TOOLS[tool];
    if (!toolDef) {
      return NextResponse.json(
        {
          error: `Herramienta '${tool}' no reconocida. Herramientas disponibles: ${Object.keys(
            MCP_TOOLS,
          ).join(", ")}`,
        },
        { status: 404 },
      );
    }

    const result = await toolDef.execute(toolArgs || {}, {
      tenantId: authResult.tenantId,
      scopes: authResult.scopes,
    });

    return NextResponse.json({
      success: true,
      tool,
      result,
    });
  } catch (error: unknown) {
    console.error("Error en MCP Gateway:", error);
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Error interno al ejecutar la herramienta",
      },
      { status: 500 },
    );
  }
}

export async function GET(req: NextRequest) {
  const authHeader =
    req.headers.get("authorization") || req.headers.get("x-kittn-api-key");

  const authResult = await validateMcpApiKey(authHeader);
  if (!authResult.valid) {
    return NextResponse.json({ error: authResult.error }, { status: 401 });
  }

  // Retorna el catálogo de herramientas disponibles
  const toolsList = Object.values(MCP_TOOLS).map((t) => ({
    name: t.name,
    description: t.description,
    parameters: t.parameters,
  }));

  return NextResponse.json({
    name: "KittnOS MCP Gateway",
    version: "1.0.0",
    tenantId: authResult.tenantId,
    tools: toolsList,
  });
}
