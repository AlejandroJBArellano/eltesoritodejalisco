import { getOrderTipAmount } from "@/components/pos/paymentUtils";
import { useTenant } from "@/components/TenantProvider";
import { OrderWithDetails } from "@/types";
import { QRCodeSVG } from "qrcode.react";

interface OrderTicketProps {
  order: OrderWithDetails;
}

export function OrderTicket({ order }: OrderTicketProps) {
  const { id: tenantId, name, system_name, rfc, postal_code, regimen_fiscal } = useTenant();

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
            <tr key={item.id}>
              <td>{item.quantity}</td>
              <td className="max-w-[40mm] truncate">{item.menuItem.name}</td>
              <td className="text-right">
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

        <div className="border-t border-dashed border-gray-300 mt-4 pt-4 flex flex-col items-center justify-center">
          <p className="text-xs font-bold text-gray-800">Powered by Kittn</p>
          <p className="text-[10px] text-gray-500 mb-2">Get Yours at trykittn.com</p>
          <div className="bg-white p-1.5 border border-gray-200 rounded-sm shadow-sm">
            <QRCodeSVG
              value={`https://trykittn.com?ref=pos_${order.id}_${tenantId}`}
              size={80}
              level="M"
            />
          </div>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .ticket-container,
          .ticket-container * {
            visibility: visible;
          }
          .ticket-container {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            border: none;
            box-shadow: none;
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
