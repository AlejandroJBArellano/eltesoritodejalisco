"use client";

import { Modal } from "@/components/ui/Modal";
import {
  CustomerAccountTicket,
  type AccountNoteItem,
} from "@/components/customers/CustomerAccountTicket";
import { CustomerAbonoModal } from "@/components/customers/CustomerAbonoModal";
import {
  AlertCircle,
  Calendar,
  ChevronDown,
  ChevronUp,
  DollarSign,
  FileText,
  Printer,
  RefreshCw,
} from "lucide-react";
import React, { useCallback, useEffect, useState } from "react";

export interface CustomerAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: {
    id: string;
    name: string;
    phone?: string | null;
    email?: string | null;
    debt_balance?: number;
  } | null;
  onAbonoSuccess?: () => void;
}

export function CustomerAccountModal({
  isOpen,
  onClose,
  customer,
  onAbonoSuccess,
}: CustomerAccountModalProps) {
  const [activeTab, setActiveTab] = useState<"resumen" | "ticket">("resumen");
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [pendingNotes, setPendingNotes] = useState<AccountNoteItem[]>([]);
  const [totalDebt, setTotalDebt] = useState<number>(0);
  const [lastPayment, setLastPayment] = useState<{
    amount: number;
    method: string;
    createdAt: string | Date;
  } | null>(null);

  const [expandedNoteId, setExpandedNoteId] = useState<string | null>(null);
  const [isAbonoOpen, setIsAbonoOpen] = useState(false);

  const fetchStatement = useCallback(async () => {
    if (!customer?.id) return;
    try {
      setIsLoading(true);
      setErrorMessage(null);
      const res = await fetch(
        `/api/customers/${customer.id}/account-statement`
      );
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Error al cargar estado de cuenta");
      }

      setPendingNotes(data.pendingNotes || []);
      setTotalDebt(Number(data.totalDebt || 0));

      // Extraer el abono más reciente si existe
      let latestP: { amount: number; method: string; createdAt: string | Date } | null = null;
      (data.pendingNotes || []).forEach((note: AccountNoteItem) => {
        (note.payments || []).forEach((p: { amount: number; method: string; createdAt: string | Date }) => {
          if (!latestP || new Date(p.createdAt) > new Date(latestP.createdAt)) {
            latestP = p;
          }
        });
      });
      setLastPayment(latestP);
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Error inesperado"
      );
    } finally {
      setIsLoading(false);
    }
  }, [customer?.id]);

  useEffect(() => {
    if (isOpen && customer?.id) {
      setActiveTab("resumen");
      void fetchStatement();
    }
  }, [isOpen, customer?.id, fetchStatement]);

  if (!isOpen || !customer) return null;

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

  const handleAbonoSuccess = () => {
    void fetchStatement();
    onAbonoSuccess?.();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Estado de Cuenta"
        subtitle={`Cliente: ${customer.name}${customer.phone ? ` • Tel: ${customer.phone}` : ""}`}
        maxWidth="lg"
      >
        <div className="space-y-5">
          {/* Tabs Selector */}
          <div className="flex border-b border-border">
            <button
              type="button"
              onClick={() => setActiveTab("resumen")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === "resumen"
                  ? "border-amber-400 text-amber-400 bg-amber-500/5"
                  : "border-transparent text-text-light/50 hover:text-text-light hover:bg-white/5"
              }`}
            >
              <FileText className="h-4 w-4" /> Resumen y Notas
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("ticket")}
              className={`flex items-center gap-2 px-4 py-2.5 text-xs font-black uppercase tracking-wider border-b-2 transition-all cursor-pointer ${
                activeTab === "ticket"
                  ? "border-emerald-400 text-emerald-400 bg-emerald-500/5"
                  : "border-transparent text-text-light/50 hover:text-text-light hover:bg-white/5"
              }`}
            >
              <Printer className="h-4 w-4" /> Ticket 80mm
            </button>
            <div className="ml-auto flex items-center pr-2">
              <button
                type="button"
                onClick={fetchStatement}
                disabled={isLoading}
                className="text-text-light/40 hover:text-text-light p-1 rounded-lg transition-all"
                title="Actualizar"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
                />
              </button>
            </div>
          </div>

          {errorMessage && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs font-bold flex items-center gap-2">
              <AlertCircle className="h-4 w-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {activeTab === "ticket" ? (
            <CustomerAccountTicket
              customer={customer}
              pendingNotes={pendingNotes}
              totalDebt={totalDebt}
              lastPayment={lastPayment}
            />
          ) : (
            <div className="space-y-4">
              {/* Tarjeta de Saldo Deudor y Acciones */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-dark/50 border border-border p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] font-black text-text-light/50 uppercase tracking-widest">
                    Saldo Deudor Total
                  </span>
                  <span className={`text-2xl font-black mt-1 ${totalDebt > 0 ? "text-amber-400" : "text-emerald-400"}`}>
                    ${totalDebt.toFixed(2)}
                  </span>
                </div>

                <div className="bg-dark/50 border border-border p-4 rounded-2xl flex flex-col justify-between">
                  <span className="text-[10px] font-black text-text-light/50 uppercase tracking-widest">
                    Notas Pendientes
                  </span>
                  <span className="text-2xl font-black text-text-light mt-1">
                    {pendingNotes.length}
                  </span>
                </div>

                <div className="flex flex-col justify-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsAbonoOpen(true)}
                    disabled={totalDebt <= 0 || isLoading}
                    className="w-full bg-amber-500 hover:bg-amber-400 text-black py-2.5 px-3 rounded-xl font-black text-xs uppercase tracking-wider shadow-md transition-all disabled:opacity-40 cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <DollarSign className="h-4 w-4" /> Registrar Abono
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveTab("ticket")}
                    className="w-full bg-white/5 border border-border hover:bg-white/10 text-text-light py-2 px-3 rounded-xl font-black text-xs uppercase tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5"
                  >
                    <Printer className="h-4 w-4" /> Imprimir Ticket
                  </button>
                </div>
              </div>

              {/* Listado de Notas Pendientes */}
              <div className="space-y-2">
                <h4 className="text-xs font-black text-text-light uppercase tracking-wider flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-400" />
                  Desglose de Notas Anteriores ({pendingNotes.length})
                </h4>

                {isLoading && pendingNotes.length === 0 ? (
                  <div className="py-8 text-center text-xs text-text-light/40">
                    Cargando notas pendientes...
                  </div>
                ) : pendingNotes.length === 0 ? (
                  <div className="py-8 text-center bg-dark/30 rounded-2xl border border-border text-xs text-text-light/40">
                    Este cliente está al corriente. No tiene notas pendientes.
                  </div>
                ) : (
                  <div className="divide-y divide-border rounded-xl border border-border overflow-hidden bg-card">
                    {pendingNotes.map((note) => {
                      const isExpanded = expandedNoteId === note.id;
                      return (
                        <div key={note.id} className="p-3.5 space-y-2">
                          <div
                            className="flex items-center justify-between cursor-pointer"
                            onClick={() =>
                              setExpandedNoteId(isExpanded ? null : note.id)
                            }
                          >
                            <div className="flex items-center gap-3">
                              <span className="font-mono font-black text-sm text-text-light">
                                #{note.orderNumber}
                              </span>
                              <span className="text-xs text-text-light/50 flex items-center gap-1">
                                <Calendar className="h-3 w-3" />
                                {formatDate(note.createdAt)}
                              </span>
                              {note.table && (
                                <span className="text-[10px] uppercase px-2 py-0.5 rounded bg-white/5 text-text-light/60">
                                  {note.table}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-4">
                              <div className="text-right">
                                <p className="text-[10px] text-text-light/40 uppercase">
                                  Saldo Nota
                                </p>
                                <p className="font-black text-sm text-amber-400">
                                  ${note.remainingBalance.toFixed(2)}
                                </p>
                              </div>
                              {note.items && note.items.length > 0 && (
                                <div className="text-text-light/40 hover:text-text-light">
                                  {isExpanded ? (
                                    <ChevronUp className="h-4 w-4" />
                                  ) : (
                                    <ChevronDown className="h-4 w-4" />
                                  )}
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Detalle expandible de platillos y abonos */}
                          {isExpanded && (
                            <div className="pt-2 border-t border-border/50 text-xs space-y-2 bg-dark/30 p-2.5 rounded-lg">
                              <div className="flex justify-between text-[11px] text-text-light/60 pb-1 border-b border-border/30">
                                <span>Total Original: ${note.total.toFixed(2)}</span>
                                <span>Abonado: ${note.totalPaid.toFixed(2)}</span>
                              </div>

                              {note.items && note.items.length > 0 && (
                                <div className="space-y-1">
                                  <p className="text-[10px] font-bold text-text-light/40 uppercase">
                                    Productos:
                                  </p>
                                  {note.items.map((item, idx) => (
                                    <div
                                      key={idx}
                                      className="flex justify-between text-[11px] text-text-light/80"
                                    >
                                      <span>
                                        {item.quantity}x {item.name}
                                      </span>
                                      <span>
                                        $
                                        {(item.quantity * item.unitPrice).toFixed(
                                          2
                                        )}
                                      </span>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Modal de Abonos */}
      {isAbonoOpen && (
        <CustomerAbonoModal
          isOpen={isAbonoOpen}
          onClose={() => setIsAbonoOpen(false)}
          customerId={customer.id}
          customerName={customer.name}
          totalDebt={totalDebt}
          onSuccess={handleAbonoSuccess}
        />
      )}
    </>
  );
}
