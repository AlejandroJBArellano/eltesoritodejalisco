import { OrderWithDetails } from "@/types";

interface OrderTicketProps {
  order: OrderWithDetails;
}

export function OrderTicket({ order }: OrderTicketProps) {
  const formatDate = (date: Date | string) => {
    return new Date(date).toLocaleString("es-MX", {
      dateStyle: "short",
      timeStyle: "short",
    });
  };

  return (
    <div className="ticket-container bg-white p-4 w-[80mm] mx-auto text-black font-mono text-sm border shadow-sm">
      <div className="text-center mb-4">
        <h2 className="text-lg font-bold">EL TESORITO DE JALISCO</h2>
        <p className="text-xs">Sabor Tradicional</p>
        <div className="border-b border-dashed my-2"></div>
      </div>

      <div className="mb-2">
        <p>ORDEN: #{order.orderNumber}</p>
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
              <td className="text-right">${(item.quantity * item.unitPrice).toFixed(2)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="border-b border-dashed my-2"></div>

      <div className="text-right space-y-1">
        <p className="font-bold text-lg">TOTAL: ${order.total.toFixed(2)}</p>
      </div>

      <div className="text-center mt-6">
        <p className="text-xs">¡Gracias por su preferencia!</p>
        <p className="text-[10px] text-gray-400 mt-2">TesoritoOS</p>
      </div>

      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          .ticket-container, .ticket-container * {
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
