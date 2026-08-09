import { OrderWithDetails } from "@/types";

interface KitchenTicketProps {
  order: OrderWithDetails;
}

const MIXED_ORDER_KEYWORD = "orden mixta";

const isMixedOrderItem = (name: string) =>
  name.toLowerCase().includes(MIXED_ORDER_KEYWORD);

const formatDate = (dateInput: Date | string | undefined) => {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleDateString("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
};

const formatTime = (dateInput: Date | string | undefined) => {
  if (!dateInput) return "";
  const date = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
  if (isNaN(date.getTime())) return "";
  return date.toLocaleTimeString("es-MX", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
};

export function KitchenTicket({ order }: KitchenTicketProps) {
  const orderDate = formatDate(order.createdAt);
  const orderTime = formatTime(order.createdAt);
  const printTime = formatTime(new Date());

  return (
    <div className="kitchen-ticket bg-white p-3 w-[80mm] mx-auto text-black font-mono border border-gray-300 shadow-sm text-sm antialiased select-none">
      {/* Header */}
      <div className="text-center mb-3">
        <h2 className="text-2xl font-black tracking-wider">*** COMANDA ***</h2>
        <div className="border-b border-dashed border-black my-2"></div>
        <p className="text-3xl font-black my-1">#{order.orderNumber}</p>
        <div className="border-b border-dashed border-black my-2"></div>

        <div className="text-left space-y-1 text-xs">
          <div className="flex justify-between">
            <span className="font-bold">SERVICIO:</span>
            <span className="font-black uppercase">
              {order.table ? `MESA ${order.table}` : "PARA LLEVAR"}
            </span>
          </div>
          {order.source && (
            <div className="flex justify-between">
              <span className="font-bold">ORIGEN:</span>
              <span className="font-black uppercase">{order.source}</span>
            </div>
          )}
          {order.pickupTime && (
            <div className="flex justify-between bg-black text-white px-1 font-bold">
              <span>ENTREGA:</span>
              <span className="font-black">{formatTime(order.pickupTime)}</span>
            </div>
          )}
        </div>
        <div className="border-b-2 border-black my-2"></div>
      </div>

      {/* Items */}
      <div className="space-y-3">
        {order.orderItems.map((item) => {
          const mixed = isMixedOrderItem(item.menuItem.name);
          const flavorLines =
            mixed && item.notes
              ? item.notes
                  .split(",")
                  .map((s) => s.trim())
                  .filter(Boolean)
              : [];

          return (
            <div key={item.id} className="border-b border-dashed border-gray-300 pb-2 kitchen-item-row">
              <div className="flex justify-between items-start">
                <span className="text-2xl font-black mr-2 bg-black text-white px-1.5 py-0.5 rounded-sm">
                  {item.quantity}
                </span>
                <span className="text-lg font-bold flex-1 uppercase leading-tight">
                  {item.menuItem.name}
                </span>
              </div>
              {flavorLines.length > 0 && (
                <ul className="mt-1 ml-8 space-y-0.5">
                  {flavorLines.map((line, i) => (
                    <li key={i} className="text-sm font-bold uppercase">
                      ▪ {line}
                    </li>
                  ))}
                </ul>
              )}
              {item.notes && !mixed && (
                <div className="mt-1.5 ml-8 p-1.5 border-2 border-black text-sm font-black uppercase bg-gray-100 flex items-start gap-1">
                  <span>⚠️</span>
                  <span className="flex-1">OJO: {item.notes}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* General Notes */}
      {order.notes && (
        <div className="mt-4 p-2 border-4 border-double border-black">
          <p className="text-xs font-black">NOTAS GENERALES:</p>
          <p className="text-sm font-bold uppercase mt-1 leading-snug">{order.notes}</p>
        </div>
      )}

      {/* Footer / Timestamps */}
      <div className="border-t border-dashed border-black mt-4 pt-2 text-[10px] space-y-0.5 text-gray-600">
        <div className="flex justify-between">
          <span>ORDENADO:</span>
          <span>{orderDate} {orderTime}</span>
        </div>
        <div className="flex justify-between font-bold text-black">
          <span>IMPRESO:</span>
          <span>{printTime}</span>
        </div>
      </div>

      <style jsx global>{`
        @media print {
          .kitchen-ticket {
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
          .kitchen-ticket,
          .kitchen-ticket * {
            color: #000000 !important;
            border-color: #000000 !important;
            background-color: transparent !important;
            box-shadow: none !important;
            text-shadow: none !important;
          }
          /* Conserva el fondo negro y texto blanco para cantidades */
          .kitchen-ticket .bg-black {
            background-color: #000000 !important;
            color: #ffffff !important;
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Conserva texto blanco en el bloque de pickupTime que tiene bg-black */
          .kitchen-ticket .bg-black * {
            color: #ffffff !important;
          }
          .kitchen-ticket .border-2,
          .kitchen-ticket .border-4 {
            border-color: #000000 !important;
          }
          .kitchen-ticket .kitchen-item-row {
            page-break-inside: avoid !important;
            break-inside: avoid !important;
          }
          .kitchen-ticket hr,
          .kitchen-ticket .border-dashed {
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

