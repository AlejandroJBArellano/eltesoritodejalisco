import { NextRequest, NextResponse } from "next/server";
import { getProfile, verifyManagerPin } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const tenant = await getTenantContext();
    const body = await request.json();
    const { pin } = body;

    if (!pin || typeof pin !== "string" || !pin.trim()) {
      return NextResponse.json(
        { valid: false, error: "Ingresa el PIN de autorización" },
        { status: 400 }
      );
    }

    const manager = await verifyManagerPin(tenant.id, pin.trim());

    if (!manager) {
      return NextResponse.json(
        { valid: false, error: "PIN de autorización incorrecto" },
        { status: 401 }
      );
    }

    return NextResponse.json({
      valid: true,
      manager: {
        id: manager.id,
        name: manager.full_name || "Gerente",
        role: manager.role,
      },
    });
  } catch (error) {
    console.error("Error al verificar PIN:", error);
    return NextResponse.json(
      { error: "Error interno al verificar PIN" },
      { status: 500 }
    );
  }
}
