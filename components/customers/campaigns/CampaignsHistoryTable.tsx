"use client";

import { useState, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import {
  TableSearchInput,
  TablePagination,
} from "@/components/ui/DataTableControls";
import {
  Mail,
  CheckCircle2,
  XCircle,
  Clock,
  Users,
  Eye,
  RefreshCw,
  AlertCircle,
  Award,
} from "lucide-react";
import type { Tables } from "@/types/supabase";

export type CampaignWithRecipients = Tables<"loyalty_campaigns"> & {
  recipients?: Tables<"loyalty_campaign_recipients">[];
};

interface CampaignsHistoryTableProps {
  campaigns: CampaignWithRecipients[];
  isLoading: boolean;
  onRefresh: () => void;
}

export function CampaignsHistoryTable({
  campaigns,
  isLoading,
  onRefresh,
}: CampaignsHistoryTableProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [selectedCampaign, setSelectedCampaign] =
    useState<CampaignWithRecipients | null>(null);

  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((c) => {
      if (statusFilter !== "all" && c.status !== statusFilter) {
        return false;
      }
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase();
        const matchName = c.name.toLowerCase().includes(q);
        const matchSubject = c.subject.toLowerCase().includes(q);
        if (!matchName && !matchSubject) return false;
      }
      return true;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const totalPages = Math.ceil(filteredCampaigns.length / pageSize) || 1;
  const paginatedCampaigns = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredCampaigns.slice(start, start + pageSize);
  }, [filteredCampaigns, currentPage, pageSize]);

  const formatDate = (dateStr: string | null) => {
    if (!dateStr) return "-";
    const date = new Date(dateStr);
    return date.toLocaleString("es-MX", {
      timeZone: "America/Mexico_City",
      dateStyle: "medium",
      timeStyle: "short",
    });
  };

  const getTemplateLabel = (key: string) => {
    switch (key) {
      case "te_extranamos":
        return {
          label: "Te Extrañamos",
          color: "text-emerald-400 bg-emerald-500/10 border-emerald-500/20",
        };
      case "canje_puntos":
        return {
          label: "Canje de Puntos",
          color: "text-amber-400 bg-amber-500/10 border-amber-500/20",
        };
      default:
        return {
          label: "Personalizado",
          color: "text-primary bg-primary/10 border-primary/20",
        };
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "SENT":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 px-2.5 py-0.5 text-[11px] font-black text-emerald-400">
            <CheckCircle2 className="h-3 w-3" />
            Enviada
          </span>
        );
      case "SENDING":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 border border-primary/20 px-2.5 py-0.5 text-[11px] font-black text-primary animate-pulse">
            <RefreshCw className="h-3 w-3 animate-spin" />
            Enviando...
          </span>
        );
      case "FAILED":
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-red-500/10 border border-red-500/20 px-2.5 py-0.5 text-[11px] font-black text-red-400">
            <XCircle className="h-3 w-3" />
            Error
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded-full bg-white/5 border border-border px-2.5 py-0.5 text-[11px] font-black text-text-light/70">
            <Clock className="h-3 w-3" />
            Borrador
          </span>
        );
    }
  };

  return (
    <section className="rounded-xl bg-card p-6 shadow-xs border border-border space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-border pb-4">
        <h2 className="text-base font-black text-text-light tracking-tight uppercase flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Historial de Campañas ({filteredCampaigns.length})
        </h2>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Status filter chips */}
          <div className="flex items-center gap-1.5 bg-dark/40 p-1 rounded-lg border border-border">
            {[
              { label: "Todas", value: "all" },
              { label: "Enviadas", value: "SENT" },
              { label: "Con Error", value: "FAILED" },
            ].map((f) => (
              <button
                key={f.value}
                type="button"
                onClick={() => {
                  setStatusFilter(f.value);
                  setCurrentPage(1);
                }}
                className={`px-2.5 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                  statusFilter === f.value
                    ? "bg-card text-text-light shadow-xs border border-border"
                    : "text-text-light/50 hover:text-text-light"
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>

          <TableSearchInput
            value={searchQuery}
            onChange={(v) => {
              setSearchQuery(v);
              setCurrentPage(1);
            }}
            placeholder="Buscar por campaña o asunto..."
          />

          <button
            onClick={onRefresh}
            className="text-xs text-text-light/60 hover:text-text-light flex items-center gap-1.5 font-bold cursor-pointer transition-colors"
            title="Actualizar listado"
            data-testid="refresh-campaigns-btn"
          >
            <RefreshCw
              className={`h-3.5 w-3.5 ${isLoading ? "animate-spin" : ""}`}
            />
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-border">
        <table className="w-full text-left text-xs">
          <thead className="bg-dark/40 uppercase tracking-wider text-text-light/60 border-b border-border">
            <tr>
              <th className="py-3 px-4 font-bold">Campaña / Asunto</th>
              <th className="py-3 px-4 font-bold">Plantilla</th>
              <th className="py-3 px-4 font-bold">Destinatarios</th>
              <th className="py-3 px-4 font-bold">Estado</th>
              <th className="py-3 px-4 font-bold">Fecha de Envío</th>
              <th className="py-3 px-4 font-bold text-right">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {paginatedCampaigns.map((c) => {
              const tmpl = getTemplateLabel(c.template_key);
              return (
                <tr
                  key={c.id}
                  className="hover:bg-white/2 dark:hover:bg-card-light/10 transition-colors"
                >
                  <td className="py-3.5 px-4 font-bold text-text-light">
                    <p className="text-sm font-black text-white">{c.name}</p>
                    <p className="text-xs font-normal text-text-light/60 mt-0.5 line-clamp-1">
                      {c.subject}
                    </p>
                  </td>

                  <td className="py-3.5 px-4">
                    <span
                      className={`inline-block px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${tmpl.color}`}
                    >
                      {tmpl.label}
                    </span>
                  </td>

                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-3.5 w-3.5 text-text-light/40" />
                      <span className="font-mono font-bold text-text-light">
                        {c.sent_count} / {c.total_recipients}
                      </span>
                      {c.failed_count > 0 && (
                        <span className="text-[10px] text-red-400 font-bold">
                          ({c.failed_count} fallidos)
                        </span>
                      )}
                    </div>
                  </td>

                  <td className="py-3.5 px-4">{getStatusBadge(c.status)}</td>

                  <td className="py-3.5 px-4 text-text-light/70">
                    {formatDate(c.sent_at || c.created_at)}
                  </td>

                  <td className="py-3.5 px-4 text-right">
                    <button
                      type="button"
                      onClick={() => setSelectedCampaign(c)}
                      className="rounded-lg bg-white/5 border border-border px-3 py-1.5 text-xs font-bold text-text-light hover:bg-white/10 transition-all flex items-center gap-1.5 ml-auto cursor-pointer"
                      data-testid={`view-campaign-details-${c.id}`}
                    >
                      <Eye className="h-3.5 w-3.5 text-emerald-400" />
                      Ver Detalle
                    </button>
                  </td>
                </tr>
              );
            })}

            {paginatedCampaigns.length === 0 && (
              <tr>
                <td
                  colSpan={6}
                  className="py-8 text-center text-xs text-text-light/40 italic"
                >
                  No se encontraron campañas registradas.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <TablePagination
        currentPage={currentPage}
        totalPages={totalPages}
        totalItems={filteredCampaigns.length}
        pageSize={pageSize}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
      />

      {/* MODAL DE DETALLE DE DESTINATARIOS */}
      {selectedCampaign && (
        <Modal
          isOpen={Boolean(selectedCampaign)}
          onClose={() => setSelectedCampaign(null)}
          title={`Detalle: ${selectedCampaign.name}`}
          subtitle={selectedCampaign.subject}
          icon={<Mail className="h-5 w-5 text-emerald-400" />}
          maxWidth="2xl"
        >
          <div className="space-y-4">
            {/* Metadata bar */}
            <div className="grid grid-cols-3 gap-3 text-xs">
              <div className="rounded-xl bg-dark/40 p-3 border border-border">
                <span className="text-text-light/50 block text-[10px] font-bold uppercase">
                  Total Enviados
                </span>
                <strong className="text-emerald-400 text-sm font-bold font-mono tabular-nums">
                  {selectedCampaign.sent_count} /{" "}
                  {selectedCampaign.total_recipients}
                </strong>
              </div>
              <div className="rounded-xl bg-dark/40 p-3 border border-border">
                <span className="text-text-light/50 block text-[10px] font-bold uppercase">
                  Fallidos
                </span>
                <strong
                  className={`text-sm font-bold font-mono tabular-nums ${
                    selectedCampaign.failed_count > 0
                      ? "text-red-400"
                      : "text-text-light/60"
                  }`}
                >
                  {selectedCampaign.failed_count}
                </strong>
              </div>
              <div className="rounded-xl bg-dark/40 p-3 border border-border">
                <span className="text-text-light/50 block text-[10px] font-bold uppercase">
                  Fecha
                </span>
                <span className="text-text-light font-bold text-[11px]">
                  {formatDate(
                    selectedCampaign.sent_at || selectedCampaign.created_at,
                  )}
                </span>
              </div>
            </div>

            {/* Recipient list */}
            <div className="space-y-2">
              <h4 className="text-xs font-black uppercase tracking-wider text-text-light/70">
                Lista de Destinatarios (
                {selectedCampaign.recipients?.length || 0})
              </h4>

              <div className="max-h-60 overflow-y-auto rounded-xl border border-border divide-y divide-border">
                {(selectedCampaign.recipients || []).map((r) => (
                  <div
                    key={r.id}
                    className="p-3 flex items-center justify-between text-xs bg-dark/40 hover:bg-white/2"
                  >
                    <div>
                      <p className="font-bold text-white">{r.customer_name}</p>
                      <p className="text-[11px] text-text-light/50 font-mono">
                        {r.customer_email}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      {r.loyalty_points > 0 && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-black text-amber-400">
                          <Award className="h-3 w-3" />
                          {r.loyalty_points} pts
                        </span>
                      )}

                      {r.status === "SENT" ? (
                        <span className="inline-flex items-center gap-1 text-emerald-400 font-bold text-[11px]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Entregado
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 text-red-400 font-bold text-[11px]"
                          title={r.error_message || "Error al enviar"}
                        >
                          <AlertCircle className="h-3.5 w-3.5" />
                          Fallido
                        </span>
                      )}
                    </div>
                  </div>
                ))}

                {(!selectedCampaign.recipients ||
                  selectedCampaign.recipients.length === 0) && (
                  <p className="p-4 text-center text-xs text-text-light/40 italic">
                    Sin registros de destinatarios individuales.
                  </p>
                )}
              </div>
            </div>

            <div className="flex justify-end pt-2 border-t border-border">
              <button
                type="button"
                onClick={() => setSelectedCampaign(null)}
                className="rounded-xl border border-border px-4 py-2 text-xs font-bold text-text-light hover:bg-white/5 cursor-pointer"
              >
                Cerrar
              </button>
            </div>
          </div>
        </Modal>
      )}
    </section>
  );
}
