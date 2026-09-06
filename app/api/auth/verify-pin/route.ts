import { NextRequest, NextResponse } from "next/server";
import { getProfile } from "@/lib/auth";

export async function POST(request: NextRequest) {
  try {
    const profile = await getProfile();
    if (!profile) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json();
    const { pin } = body;

    const expectedPin = process.env.ADMIN_PIN || "1234";

    if (!pin || String(pin).trim() !== String(expectedPin).trim()) {
      return NextResponse.json(
        { valid: false, error: "PIN de autorización incorrecto" },
        { status: 401 }
      );
    }

    return NextResponse.json({ valid: true });
  } catch (error) {
    console.error("Error al verificar PIN:", error);
    return NextResponse.json(
      { error: "Error interno al verificar PIN" },
      { status: 500 }
    );
  }
}
