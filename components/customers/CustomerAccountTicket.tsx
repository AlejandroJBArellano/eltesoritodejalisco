"use client";

import { useTenant } from "@/components/TenantProvider";
import { MessageCircle, Printer } from "lucide-react";
import React from "react";

export interface AccountNoteItem {
  id: string;
  orderNumber: string;
  createdAt: string | Date;
  operationalDate?: string;
  total: number;
  totalPaid: number;
  remainingBalance: number;
  notes?: string | null;
  table?: string | null;
  items?: Array<{ quantity: number; name: string; unitPrice: number }>;
  payments?: Array<{
    id?: string;
    amount: number;
    method: string;
    createdAt: string | Date;
  }>;
}

export interface CustomerAccountTicketProps {
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
  };
  pendingNotes: AccountNoteItem[];
  totalDebt: number;
  lastPayment?: {
    amount: number;
    method: string;
    createdAt: string | Date;
  } | null;
}

export function CustomerAccountTicket({
  customer,
  pendingNotes,
  totalDebt,
  lastPayment,
}: CustomerAccountTicketProps) {
  const {
    name: tenantName,
    rfc,
    postal_code,
    regimen_fiscal,
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

  const totalSumNotes = pendingNotes.reduce((acc, n) => acc + n.total, 0);
  const totalSumPaid = pendingNotes.reduce((acc, n) => acc + n.totalPaid, 0);

  const generateWhatsAppUrl = () => {
    if (!customer.phone) return null;
    const cleanPhone = customer.phone.replace(/[^0-9]/g, "");
    if (!cleanPhone) return null;

    let msg = `¡Hola *${customer.name}*! Te compartimos tu Estado de Cuenta de *${tenantName}*:\n\n`;
    msg += `📌 *Resumen de Cuenta:*\n`;
    msg += `▪ Total notas pendientes: $${totalSumNotes.toFixed(2)}\n`;
    msg += `▪ Abonos realizados: $${totalSumPaid.toFixed(2)}\n`;
    msg += `▪ *SALDO TOTAL PENDIENTE: $${totalDebt.toFixed(2)}*\n\n`;

    msg += `🧾 *Desglose de Notas:*\n`;
    pendingNotes.forEach((n) => {
      msg += `• Nota #${n.orderNumber} (${formatDate(n.createdAt)}): Saldo $${n.remainingBalance.toFixed(2)}\n`;
    });

    if (lastPayment) {
      msg += `\nÚltimo abono: $${Number(lastPayment.amount).toFixed(2)} (${lastPayment.method}) el ${formatDate(lastPayment.createdAt)}\n`;
    }

    msg += `\nAgradecemos tu preferencia. ¡Buen día!`;
    return `https://wa.me/${cleanPhone}?text=${encodeURIComponent(msg)}`;
  };

  const waUrl = generateWhatsAppUrl();

  return (
    <div className="space-y-4">
      {/* Botones de acción (no se imprimen) */}
      <div className="flex justify-center gap-3 no-print flex-wrap">
        <button
          type="button"
          onClick={() => window.print()}
          className="bg-emerald-600 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:brightness-110 active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer"
        >
          <Printer className="h-4 w-4" /> Imprimir Estado de Cuenta
        </button>
        {waUrl && (
          <a
            href={waUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="bg-emerald-500 text-white px-5 py-2.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-lg hover:bg-emerald-600 active:scale-95 transition-all flex items-center gap-1.5"
          >
            <MessageCircle className="h-4 w-4" /> Enviar por WhatsApp
          </a>
        )}
      </div>

      {/* Ticket Container (80mm) */}
      <div
        data-testid="account-ticket-container"
        className="ticket-container bg-white p-4 w-[80mm] mx-auto text-black font-mono text-xs border shadow-sm"
      >
        <div className="text-center mb-3">
          <h2 className="text-base font-bold tracking-tight">
            {tenantName.toUpperCase()}
          </h2>
          {rfc && <p className="text-[10px]">RFC: {rfc}</p>}
          {postal_code && <p className="text-[10px]">C.P.: {postal_code}</p>}
          {regimen_fiscal && <p className="text-[10px]">Régimen: {regimen_fiscal}</p>}
          <div className="border-b border-dashed border-black my-2" />
          <p className="font-black text-xs uppercase tracking-wider">
            ESTADO DE CUENTA
          </p>
          <div className="border-b border-dashed border-black my-2" />
        </div>

        <div className="mb-2 space-y-0.5 text-[11px]">
          <p>
            <span className="font-bold">CLIENTE:</span> {customer.name}
          </p>
          {customer.phone && (
            <p>
              <span className="font-bold">TEL:</span> {customer.phone}
            </p>
          )}
          <p>
            <span className="font-bold">EMISIÓN:</span> {formatDate(new Date())}
          </p>
        </div>

        <div className="border-b border-dashed border-black my-2" />

        {/* Desglose de Notas */}
        <p className="font-bold text-[10px] uppercase mb-1">NOTAS PENDIENTES</p>
        <table className="w-full mb-2 text-[10px]">
          <thead>
            <tr className="text-left border-b border-black">
              <th className="pb-1">FOLIO</th>
              <th className="pb-1">FECHA</th>
              <th className="pb-1 text-right">TOTAL</th>
              <th className="pb-1 text-right">SALDO</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-dashed divide-gray-300">
            {pendingNotes.map((note) => (
              <tr key={note.id} className="align-top">
                <td className="py-1 font-bold">#{note.orderNumber}</td>
                <td className="py-1">{formatDate(note.createdAt)}</td>
                <td className="py-1 text-right">${note.total.toFixed(2)}</td>
                <td className="py-1 text-right font-bold">
                  ${note.remainingBalance.toFixed(2)}
                </td>
              </tr>
            ))}
            {pendingNotes.length === 0 && (
              <tr>
                <td colSpan={4} className="py-2 text-center text-gray-500 italic">
                  Sin notas pendientes
                </td>
              </tr>
            )}
          </tbody>
        </table>

        <div className="border-b border-dashed border-black my-2" />

        {/* Totales */}
        <div className="text-right space-y-1 text-xs">
          <p>Total Notas: ${totalSumNotes.toFixed(2)}</p>
          <p>Total Abonado: ${totalSumPaid.toFixed(2)}</p>
          <div className="border-t-2 border-black pt-1 mt-1">
            <p className="text-sm font-black">
              SALDO DEUDOR: ${totalDebt.toFixed(2)}
            </p>
          </div>
        </div>

        {/* Último Abono Registrado */}
        {lastPayment && (
          <div className="mt-3 p-2 bg-gray-100 rounded border border-gray-300 text-[10px] text-center">
            <p className="font-bold uppercase">Último Abono Registrado</p>
            <p>
              ${Number(lastPayment.amount).toFixed(2)} ({lastPayment.method}) -{" "}
              {formatDate(lastPayment.createdAt)}
            </p>
          </div>
        )}

        {/* Footer */}
        <div className="text-center mt-5 space-y-1 text-[10px]">
          <p className="font-bold">Válido como comprobante de cuenta por cobrar</p>
          <p className="text-gray-600">Agradecemos su preferencia y puntual pago</p>
          {ticket_footer_text && (
            <p className="mt-2 text-[9px] font-bold text-gray-800 whitespace-pre-wrap">
              {ticket_footer_text}
            </p>
          )}
          <p className="text-[8px] text-gray-400 mt-2">
            Powered by Kittn • trykittn.com
          </p>
        </div>
      </div>

      <style>{`
        @media print {
          .no-print,
          nav {
            display: none !important;
          }
          body {
            background: white !important;
            color: black !important;
          }
          .ticket-container {
            position: absolute !important;
            left: 0 !important;
            top: 0 !important;
            width: 80mm !important;
            border: none !important;
            box-shadow: none !important;
            background: white !important;
            padding: 5px !important;
            margin: 0 !important;
          }
          .ticket-container * {
            color: black !important;
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
