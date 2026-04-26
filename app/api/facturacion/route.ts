import { NextResponse } from "next/server";
import { generarTicketAutofactura, crearFacturaDirecta } from "@/lib/services/facturama";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { orderId, venta, tipo, cliente } = body;

    if (!orderId || !venta || !tipo) {
      return NextResponse.json(
        { error: "Faltan datos requeridos (orderId, venta, tipo)" },
        { status: 400 }
      );
    }

    if (tipo === "DIRECTA") {
      if (!cliente) {
        return NextResponse.json(
          { error: "Los datos del cliente son obligatorios para facturación directa" },
          { status: 400 }
        );
      }
      
      const factura = await crearFacturaDirecta(venta, cliente, orderId);
      return NextResponse.json(factura);
    } else if (tipo === "TICKET") {
      const ticket = await generarTicketAutofactura(venta, orderId);
      return NextResponse.json({
        ticketId: ticket.Id || ticket.Folio,
        ticketData: ticket
      });
    } else {
      return NextResponse.json(
        { error: "Tipo de facturación no válido" },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Error en API de facturación:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error interno del servidor" },
      { status: 500 }
    );
  }
}
