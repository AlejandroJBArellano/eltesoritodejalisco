"use client";

import { useState } from "react";
import { OrderWithDetails } from "@/types";

type FacturacionModalProps = {
  order: OrderWithDetails | null;
  onClose: () => void;
};

export function FacturacionModal({ order, onClose }: FacturacionModalProps) {
  const [type, setType] = useState<"TICKET" | "DIRECTA">("TICKET");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    rfc: "",
    nombre: "",
    usoCfdi: "G03",
    regimenFiscal: "616",
    codigoPostal: "",
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      // Calculate subtotal and IVA assuming total includes 16% IVA
      // Example: total = subtotal * 1.16
      const subtotal = order.total / 1.16;
      const iva = order.total - subtotal;
      
      const payload = {
        orderId: order.id,
        venta: {
          subtotal,
          iva,
          propina: 0, // Props would come from payments if we wanted to pass it, but it's ignored anyway
        },
        tipo: type,
        cliente: type === "DIRECTA" ? formData : undefined,
      };

      const response = await fetch("/api/facturacion", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Error al facturar");
      }

      setSuccess(`Factura generada con éxito. ID: ${data.facturaId || data.ticketId}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error desconocido");
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!order) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 no-print">
      <div className="bg-[#1E1E1E] rounded-[2.5rem] max-w-md w-full p-8 shadow-2xl border border-white/10 max-h-[90vh] overflow-y-auto custom-scrollbar">
        <div className="flex justify-between items-center mb-6">
          <h3 className="text-xl font-black text-white uppercase tracking-tighter">
            🧾 Facturación
          </h3>
          <button onClick={onClose} className="text-zinc-600 hover:text-white transition-colors">
            ✕
          </button>
        </div>

        {success ? (
          <div className="text-center space-y-6">
            <div className="bg-green-500/10 text-green-400 p-4 rounded-2xl border border-green-500/20 font-black">
              {success}
            </div>
            <button
              onClick={onClose}
              className="w-full bg-[#B2FBA5] text-[#000000] py-3 rounded-full font-black hover:brightness-105 transition-colors shadow-[0_0_15px_#B2FBA544] uppercase"
            >
              Cerrar
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white/5 p-4 rounded-2xl border border-white/10 text-center">
              <p className="text-[10px] font-black text-zinc-500 uppercase tracking-widest mb-1">Total a facturar</p>
              <p className="text-3xl font-black text-white tabular-nums">${order.total.toFixed(2)}</p>
            </div>

            <div className="flex gap-2 p-1 bg-white/5 rounded-2xl">
              <button
                type="button"
                onClick={() => setType("TICKET")}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  type === "TICKET"
                    ? "bg-[#89CFF0] text-[#000000] shadow-md"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Auto-Factura
              </button>
              <button
                type="button"
                onClick={() => setType("DIRECTA")}
                className={`flex-1 py-2 rounded-xl text-xs font-black uppercase transition-all ${
                  type === "DIRECTA"
                    ? "bg-[#89CFF0] text-[#000000] shadow-md"
                    : "text-zinc-500 hover:text-white"
                }`}
              >
                Directa 4.0
              </button>
            </div>

            {type === "DIRECTA" && (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider mb-1 block">
                    RFC
                  </label>
                  <input
                    type="text"
                    name="rfc"
                    required
                    value={formData.rfc}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#89CFF0] transition-all uppercase"
                    placeholder="XAXX010101000"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider mb-1 block">
                    Razón Social
                  </label>
                  <input
                    type="text"
                    name="nombre"
                    required
                    value={formData.nombre}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#89CFF0] transition-all uppercase"
                    placeholder="PÚBLICO EN GENERAL"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider mb-1 block">
                      CP Fiscal
                    </label>
                    <input
                      type="text"
                      name="codigoPostal"
                      required
                      value={formData.codigoPostal}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#89CFF0] transition-all"
                      placeholder="00000"
                      maxLength={5}
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider mb-1 block">
                      Uso CFDI
                    </label>
                    <select
                      name="usoCfdi"
                      value={formData.usoCfdi}
                      onChange={handleChange}
                      className="w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#89CFF0] transition-all"
                    >
                      <option value="G03">G03 Gastos</option>
                      <option value="G01">G01 Adq. Merc.</option>
                      <option value="P01">P01 Por Definir</option>
                      <option value="S01">S01 Sin Efectos</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label className="text-[10px] font-black text-zinc-600 uppercase tracking-wider mb-1 block">
                    Régimen
                  </label>
                  <select
                    name="regimenFiscal"
                    value={formData.regimenFiscal}
                    onChange={handleChange}
                    className="w-full rounded-xl border border-white/5 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-[#89CFF0] transition-all"
                  >
                    <option value="616">616 Sin obligaciones</option>
                    <option value="601">601 General de Ley</option>
                    <option value="605">605 Sueldos</option>
                    <option value="612">612 PF Actividad Emp.</option>
                    <option value="626">626 RESICO</option>
                  </select>
                </div>
              </div>
            )}

            {error && (
              <p className="text-xs text-red-400 font-bold bg-red-500/10 p-3 rounded-xl border border-red-500/20 text-center">
                ⚠️ {error}
              </p>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-[#89CFF0] text-[#000000] py-4 rounded-full font-black text-lg hover:brightness-105 active:scale-[0.98] transition-all shadow-[0_0_20px_#89CFF044] disabled:opacity-50 uppercase"
            >
              {isSubmitting ? "PROCESANDO..." : "GENERAR"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
