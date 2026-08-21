import { getOrderTipAmount } from "@/components/pos/paymentUtils";
import { useTenant } from "@/components/TenantProvider";
import { OrderWithDetails } from "@/types";

interface OrderTicketProps {
  order: OrderWithDetails;
}

export function OrderTicket({ order }: OrderTicketProps) {
  const {
    id: tenantId,
    name,
    system_name,
    rfc,
    postal_code,
    regimen_fiscal,
    slug,
    google_reviews_url,
    ticket_footer_text,
  } = useTenant();

  const formatDate = (date: Date | string) => {
    const dateStr =
      typeof date === "string" && !date.includes("Z") && !date.includes("+")
        ? `${date.replace(" ", "T")}Z`
        : date;
    return new Date(dateStr).toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
      timeZone: "America/Mexico_City",
    });
  };

  // Logic: Price already includes IVA (16%)
  const total = order.total;
  const subtotal = total / 1.16;
  const iva = total - subtotal;
  const tipAmount = getOrderTipAmount(order);
  const finalTotal = total + tipAmount;

  const pickupUrl = `https://${slug || tenantId}.trykittn.com`;
  const reviewsUrl = google_reviews_url?.trim() || null;

  return (
    <div className="ticket-container bg-white p-4 w-[80mm] mx-auto text-black font-mono text-sm border shadow-sm">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold">{name.toUpperCase()}</h2>
        {rfc && <p className="text-xs">RFC: {rfc}</p>}
        {postal_code && <p className="text-xs">C.P.: {postal_code}</p>}
        {regimen_fiscal && <p className="text-xs">Régimen: {regimen_fiscal}</p>}
        <div className="border-b border-dashed my-2"></div>
      </div>

      <div className="mb-2">
        <p>FOLIO: #{order.orderNumber}</p>
        <p>FECHA: {formatDate(order.createdAt)}</p>
        {order.table && <p>MESA: {order.table}</p>}
        {order.customer && <p>CLIENTE: {order.customer.name}</p>}
      </div>

      <div className="border-b border-dashed my-2"></div>

      <table className="w-full mb-2">
        <thead>
          <tr className="text-left">
            <th>CANT</th>
            <th>DESCRIPCIÓN</th>
            <th className="text-right">IMPORTE</th>
          </tr>
        </thead>
        <tbody>
          {order.orderItems.map((item) => (
            <tr key={item.id} className="align-top">
              <td className="pr-2">{item.quantity}</td>
              <td className="whitespace-normal wrap-break-word">{item.menuItem.name}</td>
              <td className="text-right pl-2">
                ${(item.quantity * item.unitPrice).toFixed(2)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-b border-dashed my-2"></div>

      <div className="text-right space-y-1">
        <p className="text-sm">SUBTOTAL: ${subtotal.toFixed(2)}</p>
        <p className="text-sm">IVA (16%): ${iva.toFixed(2)}</p>
        <p className="font-bold text-md">TOTAL VENTA: ${total.toFixed(2)}</p>

        {tipAmount > 0 && (
          <p className="font-bold text-md text-gray-700">
            PROPINA: ${tipAmount.toFixed(2)}
          </p>
        )}

        <p className="font-black text-xl mt-2 border-t border-black pt-1">
          PAGO TOTAL: ${finalTotal.toFixed(2)}
        </p>
      </div>

      <div className="text-center mt-6">
        <p className="text-xs font-bold">Venta al público en general</p>
        <p className="text-xs mt-2">¡Gracias por su preferencia!</p>

        <div className="border-t border-dashed border-gray-300 mt-4 pt-4">
          {reviewsUrl ? (
            /* Dual QR Layout: Side by Side */
            <div className="flex items-start justify-around gap-2 mb-3">
              {/* QR 1: Menú en Línea */}
              <div className="flex flex-col items-center flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1">
                  Pide en Línea
                </p>
                <div className="bg-white p-1 border border-gray-200 rounded-sm shadow-sm inline-block">
                  <img
                    data-testid="qr-pickup"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&ecc=M&data=${encodeURIComponent(
                      pickupUrl
                    )}`}
                    alt="Menú Digital Pickup"
                    width={70}
                    height={70}
                    className="size-17.5"
                  />
                </div>
                <p className="text-[9px] text-gray-500 mt-1">Menú Digital</p>
              </div>

              {/* QR 2: Califícanos */}
              <div className="flex flex-col items-center flex-1">
                <p className="text-[10px] font-bold uppercase tracking-wider mb-1">
                  Califícanos
                </p>
                <div className="bg-white p-1 border border-gray-200 rounded-sm shadow-sm inline-block">
                  <img
                    data-testid="qr-reviews"
                    src={`https://api.qrserver.com/v1/create-qr-code/?size=70x70&ecc=M&data=${encodeURIComponent(
                      reviewsUrl
                    )}`}
                    alt="Google Reviews"
                    width={70}
                    height={70}
                    className="size-17.5"
                  />
                </div>
                <p className="text-[9px] text-gray-500 mt-1">Google Maps</p>
              </div>
            </div>
          ) : (
            /* Single Centered QR Layout: Menú Digital */
            <div className="flex flex-col items-center justify-center mb-3">
              <p className="text-[11px] font-bold uppercase tracking-wider mb-1">
                Pide en Línea
              </p>
              <div className="bg-white p-1.5 border border-gray-200 rounded-sm shadow-sm">
                <img
                  data-testid="qr-pickup"
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=80x80&ecc=M&data=${encodeURIComponent(
                    pickupUrl
                  )}`}
                  alt="Menú Digital Pickup"
                  width={80}
                  height={80}
                  className="size-20"
                />
              </div>
              <p className="text-[10px] text-gray-500 mt-1">
                {slug ? `${slug}.trykittn.com` : "Menú Digital & Pickup"}
              </p>
            </div>
          )}

          {/* Redes Sociales / Mensaje personalizado */}
          {ticket_footer_text && (
            <p className="text-xs font-bold text-gray-800 mt-2 px-1 text-center whitespace-pre-wrap wrap-break-word">
              {ticket_footer_text}
            </p>
          )}

          {/* Mención discreta de la plataforma */}
          <p className="text-[9px] text-gray-400 mt-3 text-center">
            Powered by Kittn • trykittn.com
          </p>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .ticket-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 10px !important;
            margin: 0 auto !important;
          }
          /* Fuerza colores negro puro y elimina dithering de grises */
          .ticket-container,
          .ticket-container * {
            color: #000000 !important;
            border-color: #000000 !important;
            background-color: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          .ticket-container table {
            width: 100% !important;
            border-collapse: collapse !important;
          }
          .ticket-container tr {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .ticket-container td,
          .ticket-container th {
            vertical-align: top !important;
          }
          .ticket-container hr,
          .ticket-container .border-dashed {
            border-style: dashed !important;
            border-color: #000000 !important;
          }
          @page {
            size: 80mm auto;
            margin: 0;
          }
        }
      `}</style>
    </div>
  );
}
