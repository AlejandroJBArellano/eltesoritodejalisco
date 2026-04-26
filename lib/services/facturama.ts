import { createClient } from "@/lib/supabase/server";

export interface Venta {
  subtotal: number;
  iva: number;
  propina: number; // La propina se debe ignorar para el CFDI
}

export interface ClienteFactura {
  rfc: string;
  nombre: string;
  usoCfdi: string;
  regimenFiscal: string;
  codigoPostal: string;
  email?: string;
}

const FACTURAMA_API_URL = process.env.FACTURAMA_API_URL || "https://api.facturama.mx";
const FACTURAMA_USER = process.env.FACTURAMA_USER || "";
const FACTURAMA_PASSWORD = process.env.FACTURAMA_PASSWORD || "";

const EMISOR = {
  Rfc: "AIVK991104QJ0",
  RegimenFiscal: "626",
  LugarExpedicion: "09090",
};

const PRODUCTO_SAT = {
  ClaveProdServ: "90101501", // Restaurantes
  ClaveUnidad: "E48",        // Servicio
  Unidad: "Servicio",
  Descripcion: "Consumo de alimentos",
};

/**
 * Obtiene el header de autorización básico usando las credenciales de entorno.
 */
function getAuthHeader() {
  return "Basic " + Buffer.from(`${FACTURAMA_USER}:${FACTURAMA_PASSWORD}`).toString("base64");
}

/**
 * Llama al endpoint de Facturama para generar un folio de autofactura.
 * 
 * @param venta Objeto con los datos de la venta. Se ignora la propina.
 * @param orderId ID de la orden en la base de datos para relacionar el ticket.
 * @returns El ticket generado.
 */
export async function generarTicketAutofactura(venta: Venta, orderId: string) {
  // Ignoramos la propina para el cálculo de la factura
  const totalTicket = venta.subtotal + venta.iva;

  const payload = {
    Date: new Date().toISOString(),
    Total: totalTicket,
    // Agregamos un identificador único para rastrearlo si es necesario
    Folio: orderId.slice(0, 10), 
  };

  try {
    const response = await fetch(`${FACTURAMA_API_URL}/api/BranchOffice/WebTickets`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error al generar ticket de autofactura: ${errorData}`);
    }

    const ticketData = await response.json();

    // Guardar el identificador del ticket de autofactura en la base de datos
    const supabase = await createClient();
    const { error: dbError } = await supabase.from("facturas").insert({
      order_id: orderId,
      facturama_id: ticketData.Id || ticketData.Folio,
      total: totalTicket,
      status: "ticket_autofactura",
    });

    if (dbError) {
      console.error("Error al guardar ticket de autofactura en DB:", dbError);
    }

    return ticketData;
  } catch (error) {
    console.error("Facturama generarTicketAutofactura error:", error);
    throw error;
  }
}

/**
 * Emite un CFDI 4.0 directamente con los datos del cliente.
 * 
 * @param venta Objeto con los datos de la venta. Se ignora la propina.
 * @param cliente Datos fiscales del cliente.
 * @param orderId ID de la orden para asociar la factura en la base de datos.
 * @returns Los datos de la factura incluyendo ID y URLs del PDF y XML.
 */
export async function crearFacturaDirecta(venta: Venta, cliente: ClienteFactura, orderId: string) {
  // Ignoramos la propina, solo tomamos subtotal e iva.
  const totalFactura = venta.subtotal + venta.iva;

  const payload = {
    ExpeditionPlace: EMISOR.LugarExpedicion,
    PaymentForm: "01", // Efectivo por defecto (podría recibirse como parámetro)
    PaymentMethod: "PUE", // Pago en una sola exhibición
    Currency: "MXN",
    // Facturama toma el emisor por defecto configurado en la cuenta (AIVK991104QJ0)
    Receiver: {
      Rfc: cliente.rfc,
      Name: cliente.nombre,
      CfdiUse: cliente.usoCfdi,
      TaxRegime: cliente.regimenFiscal,
      TaxZipCode: cliente.codigoPostal,
    },
    Items: [
      {
        ProductCode: PRODUCTO_SAT.ClaveProdServ,
        UnitCode: PRODUCTO_SAT.ClaveUnidad,
        Unit: PRODUCTO_SAT.Unidad,
        Description: PRODUCTO_SAT.Descripcion,
        Quantity: 1,
        UnitValue: venta.subtotal,
        Subtotal: venta.subtotal,
        Taxes: [
          {
            Name: "IVA",
            Rate: 0.16,
            Total: venta.iva,
            Base: venta.subtotal,
            IsRetention: false,
          },
        ],
        Total: totalFactura,
      },
    ],
  };

  try {
    // Usamos el endpoint para CFDI 4.0
    const response = await fetch(`${FACTURAMA_API_URL}/3/cfdis`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: getAuthHeader(),
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorData = await response.text();
      throw new Error(`Error al emitir CFDI 4.0: ${errorData}`);
    }

    const facturaData = await response.json();
    const facturaId = facturaData.Id;

    // Obtener los enlaces al PDF y XML (Facturama provee una ruta para descargarlos)
    const pdfUrl = `${FACTURAMA_API_URL}/cfdi/pdf/issued/${facturaId}`;
    const xmlUrl = `${FACTURAMA_API_URL}/cfdi/xml/issued/${facturaId}`;

    // Guardar los datos del CFDI generado en nuestra base de datos
    const supabase = await createClient();
    const { error: dbError } = await supabase.from("facturas").insert({
      order_id: orderId,
      facturama_id: facturaId,
      pdf_url: pdfUrl,
      xml_url: xmlUrl,
      total: totalFactura,
      rfc_receptor: cliente.rfc,
      status: "emitida",
    });

    if (dbError) {
      console.error("Error al guardar la factura emitida en DB:", dbError);
    }

    return {
      facturaId,
      pdfUrl,
      xmlUrl,
      facturaData,
    };
  } catch (error) {
    console.error("Facturama crearFacturaDirecta error:", error);
    throw error;
  }
}
