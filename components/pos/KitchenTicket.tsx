import { OrderWithDetails } from "@/types";

interface KitchenTicketProps {
  order: OrderWithDetails;
}

const MIXED_ORDER_KEYWORD = "orden mixta";

const isMixedOrderItem = (name: string) =>
  name.toLowerCase().includes(MIXED_ORDER_KEYWORD);

export function KitchenTicket({ order }: KitchenTicketProps) {
  return (
    <div className="kitchen-ticket bg-white p-2 w-[80mm] mx-auto text-black font-mono border shadow-sm">
      <div className="text-center mb-2">
        <h2 className="text-xl font-black">*** COMANDA ***</h2>
        <p className="text-lg font-bold">ORDEN: #{order.orderNumber}</p>
        <p className="text-md">MESA: {order.table || "PARA LLEVAR"}</p>
        <div className="border-b-4 border-double my-2"></div>
      </div>

      <div className="space-y-4">
        {order.orderItems.map((item) => {
          const mixed = isMixedOrderItem(item.menuItem.name);
          const flavorLines = mixed && item.notes
            ? item.notes.split(",").map((s) => s.trim()).filter(Boolean)
            : [];

          return (
            <div key={item.id} className="border-b border-gray-100 pb-2">
              <div className="flex justify-between items-start">
                <span className="text-2xl font-black">[{item.quantity}]</span>
                <span className="text-xl font-bold flex-1 ml-3 uppercase leading-tight">
                  {item.menuItem.name}
                </span>
              </div>
              {flavorLines.length > 0 && (
                <ul className="mt-1 ml-10 space-y-0.5">
                  {flavorLines.map((line, i) => (
                    <li key={i} className="text-lg font-bold uppercase">
                      › {line}
                    </li>
                  ))}
                </ul>
              )}
              {item.notes && !mixed && (
                <div className="mt-1 ml-10 p-1 bg-black text-white text-md font-bold uppercase">
                  OJO: {item.notes}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {order.notes && (
        <div className="mt-4 p-2 border-2 border-black">
          <p className="text-sm font-bold">NOTAS GENERALES:</p>
          <p className="text-md uppercase">{order.notes}</p>
        </div>
      )}

      <div className="text-center mt-6">
        <p className="text-xs">{new Date().toLocaleTimeString()}</p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .kitchen-ticket, .kitchen-ticket * {
            visibility: visible;
          }
          .kitchen-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 80mm;
            border: none;
          }
        }
      `}</style>
    </div>
  );
}
