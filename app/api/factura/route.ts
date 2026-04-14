// TesoritoOS – Facturama CFDI 4.0 Integration
// POST /api/factura  → issue a new invoice for an order
// GET  /api/factura?orderId=xxx → check if an order already has an invoice

import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

// ─── helpers ─────────────────────────────────────────────────────────────────

/** Returns true when the RFC corresponds to a Persona Moral (12-char RFC) */
function isPersonaMoral(rfc: string): boolean {
  return rfc.trim().length === 12;
}

/** Returns the Forma de Pago SAT code from our internal payment method */
function toFormaPago(method: string): string {
  switch (method) {
    case "CASH":
      return "01"; // Efectivo
    case "CARD":
      return "04"; // Tarjeta de crédito (common default)
    case "TRANSFER":
      return "03"; // Transferencia electrónica
    default:
      return "99"; // Por definir
  }
}

/** Calls the Facturama api-lite endpoint and returns the raw response */
async function callFacturama(
  payload: object,
  apiUrl: string,
  credentials: string
): Promise<{ ok: boolean; data: unknown }> {
  const res = await fetch(`${apiUrl}/api-lite/3/cfdis`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Basic ${credentials}`,
    },
    body: JSON.stringify(payload),
  });

  const data = await res.json();
  return { ok: res.ok, data };
}

/** Builds the CFDI 4.0 JSON payload for Facturama */
function buildCfdiPayload(params: {
  rfcEmisor: string;
  razonSocialEmisor: string;
  cpEmisor: string;
  rfcReceptor: string;
  razonSocialReceptor: string;
  regimenFiscalReceptor: string;
  cpReceptor: string;
  usoCfdi: string;
  formaPago: string;
  items: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
  }>;
  applyIsrRetencion: boolean;
}) {
  const {
    rfcEmisor,
    razonSocialEmisor,
    cpEmisor,
    rfcReceptor,
    razonSocialReceptor,
    regimenFiscalReceptor,
    cpReceptor,
    usoCfdi,
    formaPago,
    items,
    applyIsrRetencion,
  } = params;

  const cfdiItems = items.map((item, idx) => {
    const base = parseFloat((item.unitPrice * item.quantity / 1.16).toFixed(6));
    const iva = parseFloat((base * 0.16).toFixed(6));
    const isrRetencion = applyIsrRetencion
      ? parseFloat((base * 0.0125).toFixed(6))
      : 0;

    const taxes: object[] = [
      {
        Total: iva,
        Name: "IVA",
        Base: base,
        Rate: 0.16,
        IsRetention: false,
      },
    ];

    if (applyIsrRetencion) {
      taxes.push({
        Total: isrRetencion,
        Name: "ISR",
        Base: base,
        Rate: 0.0125,
        IsRetention: true,
      });
    }

    const subtotal = base;
    const total = parseFloat((base + iva - isrRetencion).toFixed(6));

    return {
      ProductCode: "90101501", // Alimentos preparados para consumo en el establecimiento
      IdentificationNumber: String(idx + 1).padStart(3, "0"),
      Description: item.description,
      Unit: "Servicio",
      UnitCode: "E48",
      UnitPrice: parseFloat(item.unitPrice.toFixed(6)),
      Quantity: item.quantity,
      Subtotal: subtotal,
      Taxes: taxes,
      Total: total,
    };
  });

  return {
    Issuer: {
      Rfc: rfcEmisor,
      Name: razonSocialEmisor,
      FiscalRegime: "626", // RESICO – Personas Físicas
    },
    Receiver: {
      Rfc: rfcReceptor,
      Name: razonSocialReceptor,
      FiscalRegime: regimenFiscalReceptor,
      TaxZipCode: cpReceptor,
      CfdiUse: usoCfdi,
    },
    CfdiType: "I", // Ingreso
    NameId: "1",
    ExpeditionPlace: cpEmisor,
    PaymentForm: formaPago,
    PaymentMethod: "PUE", // Pago en una sola exhibición
    Currency: "MXN",
    Items: cfdiItems,
  };
}

// ─── GET /api/factura?orderId=xxx ─────────────────────────────────────────────
export async function GET(request: NextRequest) {
  try {
    const orderId = request.nextUrl.searchParams.get("orderId");
    if (!orderId) {
      return NextResponse.json({ error: "orderId is required" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: invoice } = await supabase
      .from("invoices")
      .select("*")
      .eq("order_id", orderId)
      .eq("status", "issued")
      .maybeSingle();

    return NextResponse.json({ invoice: invoice ?? null });
  } catch (error) {
    console.error("Error fetching invoice:", error);
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

// ─── POST /api/factura ────────────────────────────────────────────────────────
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      orderId,
      rfcReceptor,
      razonSocialReceptor,
      regimenFiscalReceptor,
      cpReceptor,
      usoCfdi,
    } = body;

    if (!orderId || !rfcReceptor || !razonSocialReceptor || !cpReceptor || !usoCfdi || !regimenFiscalReceptor) {
      return NextResponse.json(
        { error: "Faltan campos requeridos: orderId, rfcReceptor, razonSocialReceptor, regimenFiscalReceptor, cpReceptor, usoCfdi" },
        { status: 400 }
      );
    }

    // Validate environment variables
    const facturamaUser = process.env.FACTURAMA_USER;
    const facturamaPassword = process.env.FACTURAMA_PASSWORD;
    const facturamaApiUrl = process.env.FACTURAMA_API_URL ?? "https://apisandbox.facturama.mx";
    const rfcEmisor = process.env.FACTURAMA_RFC;
    const razonSocialEmisor = process.env.FACTURAMA_RAZON_SOCIAL;
    const cpEmisor = process.env.FACTURAMA_CP;

    if (!facturamaUser || !facturamaPassword || !rfcEmisor || !razonSocialEmisor || !cpEmisor) {
      return NextResponse.json(
        { error: "Configuración de Facturama incompleta. Verifica las variables de entorno." },
        { status: 500 }
      );
    }

    const supabase = await createClient();

    // 1. Check if this order was already invoiced
    const { data: existingInvoice } = await supabase
      .from("invoices")
      .select("id, cfdi_uid, folio_fiscal")
      .eq("order_id", orderId)
      .eq("status", "issued")
      .maybeSingle();

    if (existingInvoice) {
      return NextResponse.json(
        { error: "Esta orden ya cuenta con una factura timbrada.", invoice: existingInvoice },
        { status: 409 }
      );
    }

    // 2. Fetch order with items and payment
    const { data: order, error: orderError } = await supabase
      .from("orders")
      .select(`
        *,
        order_items (
          *,
          menu_items (name, price)
        ),
        payments (method)
      `)
      .eq("id", orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: "Orden no encontrada" }, { status: 404 });
    }

    // 3. Build items list from order
    const orderItems = (order.order_items || []).map((item: {
      quantity: number;
      unit_price: number;
      menu_items?: { name?: string };
    }) => ({
      description: item.menu_items?.name ?? "Consumo restaurante",
      quantity: item.quantity,
      unitPrice: item.unit_price,
    }));

    if (orderItems.length === 0) {
      return NextResponse.json(
        { error: "La orden no tiene conceptos para facturar." },
        { status: 400 }
      );
    }

    // 4. Determine payment form
    const paymentMethod = order.payments?.[0]?.method ?? "OTHER";
    const formaPago = toFormaPago(paymentMethod);

    // 5. Determine if ISR retention applies (RESICO: only for Persona Moral)
    const applyIsrRetencion = isPersonaMoral(rfcReceptor);

    // 6. Build CFDI payload
    const credentials = Buffer.from(`${facturamaUser}:${facturamaPassword}`).toString("base64");
    const payload = buildCfdiPayload({
      rfcEmisor,
      razonSocialEmisor,
      cpEmisor,
      rfcReceptor: rfcReceptor.toUpperCase().trim(),
      razonSocialReceptor: razonSocialReceptor.trim(),
      regimenFiscalReceptor,
      cpReceptor,
      usoCfdi,
      formaPago,
      items: orderItems,
      applyIsrRetencion,
    });

    // 7. Call Facturama
    const { ok, data: facturamaResponse } = await callFacturama(payload, facturamaApiUrl, credentials);

    if (!ok) {
      const errMsg =
        (facturamaResponse as { Message?: string })?.Message ??
        JSON.stringify(facturamaResponse);
      return NextResponse.json(
        { error: `Error al timbrar con Facturama: ${errMsg}` },
        { status: 422 }
      );
    }

    const cfdiData = facturamaResponse as {
      Id: string;
      Complement?: { TaxStamp?: { Uuid?: string } };
    };

    const cfdiUid = cfdiData.Id;
    const folioFiscal = cfdiData.Complement?.TaxStamp?.Uuid ?? null;

    // 8. Calculate totals for our record
    let subtotalSum = 0;
    let ivaSum = 0;
    let isrSum = 0;

    for (const item of orderItems) {
      const base = item.unitPrice * item.quantity / 1.16;
      subtotalSum += base;
      ivaSum += base * 0.16;
      if (applyIsrRetencion) isrSum += base * 0.0125;
    }

    const totalInvoice = subtotalSum + ivaSum - isrSum;

    // 9. Save invoice record
    const { data: invoice, error: insertError } = await supabase
      .from("invoices")
      .insert({
        order_id: orderId,
        cfdi_uid: cfdiUid,
        folio_fiscal: folioFiscal,
        rfc_receptor: rfcReceptor.toUpperCase().trim(),
        razon_social_receptor: razonSocialReceptor.trim(),
        uso_cfdi: usoCfdi,
        regimen_fiscal_receptor: regimenFiscalReceptor,
        cp_receptor: cpReceptor,
        subtotal: parseFloat(subtotalSum.toFixed(2)),
        iva: parseFloat(ivaSum.toFixed(2)),
        isr_retencion: parseFloat(isrSum.toFixed(2)),
        total: parseFloat(totalInvoice.toFixed(2)),
        status: "issued",
      })
      .select()
      .single();

    if (insertError) throw insertError;

    // 10. Build download URLs
    const base64Creds = credentials;
    const pdfUrl = `${facturamaApiUrl}/cfdi/${cfdiUid}/pdf`;
    const xmlUrl = `${facturamaApiUrl}/cfdi/${cfdiUid}/xml`;

    return NextResponse.json(
      {
        invoice,
        cfdiUid,
        folioFiscal,
        pdfUrl,
        xmlUrl,
        isrAplicado: applyIsrRetencion,
        downloadNote: `Para descargar PDF/XML envía el header Authorization: Basic ${base64Creds} a las URLs de descarga.`,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Error creating invoice:", error);
    return NextResponse.json(
      { error: "Error interno al generar la factura." },
      { status: 500 }
    );
  }
}
