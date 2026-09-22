"use client";

import React, { useEffect, useState, useCallback } from "react";
import {
  Calculator,
  CreditCard,
  Info,
  Plus,
  Trash2,
  Edit2,
  CheckCircle2,
  Star,
  Loader2,
  X,
} from "lucide-react";
import { useSettingsContext } from "./SettingsContext";
import type { PaymentTerminal } from "@/types";

export function SettingsTerminalSection() {
  const { terminalCommissionRate, setTerminalCommissionRate } =
    useSettingsContext();

  const [terminals, setTerminals] = useState<PaymentTerminal[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTerminal, setEditingTerminal] =
    useState<PaymentTerminal | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form state
  const [formName, setFormName] = useState("");
  const [formShortName, setFormShortName] = useState("");
  const [formRate, setFormRate] = useState("0");
  const [formIsDefault, setFormIsDefault] = useState(false);

  // Simulator selected terminal ID or custom rate
  const [simulatedTerminalId, setSimulatedTerminalId] = useState<string>("");

  const fetchTerminals = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/admin/terminals");
      if (!res.ok) throw new Error("Error al obtener terminales");
      const data = await res.json();
      const list: PaymentTerminal[] = data.terminals || [];
      setTerminals(list);

      // Sincronizar tasa por defecto con el context
      const defaultTerm = list.find((t) => t.is_default && t.is_active) || list[0];
      if (defaultTerm) {
        setTerminalCommissionRate(String(defaultTerm.commission_rate));
        setSimulatedTerminalId(defaultTerm.id);
      }
    } catch {
      // Si falla la API (ej. entorno de test o desconectado), usar fallback
      const initialFallbackRate = Number(terminalCommissionRate) || 0;
      setTerminals([
        {
          id: "default-fallback",
          tenant_id: "",
          name: "General",
          short_name: "General",
          commission_rate: initialFallbackRate,
          is_default: true,
          is_active: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  }, [setTerminalCommissionRate, terminalCommissionRate]);

  useEffect(() => {
    fetchTerminals();
  }, [fetchTerminals]);

  const handleOpenAdd = () => {
    setEditingTerminal(null);
    setFormName("");
    setFormShortName("");
    setFormRate("0");
    setFormIsDefault(terminals.length === 0);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (t: PaymentTerminal) => {
    setEditingTerminal(t);
    setFormName(t.name);
    setFormShortName(t.short_name);
    setFormRate(String(t.commission_rate));
    setFormIsDefault(t.is_default);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formName.trim()) {
      setError("El nombre de la terminal es obligatorio");
      return;
    }

    try {
      setSaving(true);
      setError(null);
      const payload = {
        name: formName.trim(),
        short_name: formShortName.trim() || formName.trim(),
        commission_rate: parseFloat(formRate) || 0,
        is_default: formIsDefault,
      };

      if (editingTerminal) {
        const res = await fetch(`/api/admin/terminals/${editingTerminal.id}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Error al actualizar");
        }
      } else {
        const res = await fetch("/api/admin/terminals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        if (!res.ok) {
          const errData = await res.json();
          throw new Error(errData.error || "Error al crear");
        }
      }

      setIsModalOpen(false);
      await fetchTerminals();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (t: PaymentTerminal) => {
    try {
      const res = await fetch(`/api/admin/terminals/${t.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ is_active: !t.is_active }),
      });
      if (!res.ok) throw new Error("Error al cambiar estado");
      await fetchTerminals();
    } catch (err) {
      console.error(err);
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("¿Seguro que deseas eliminar o desactivar esta terminal?")) {
      return;
    }
    try {
      const res = await fetch(`/api/admin/terminals/${id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Error al eliminar");
      await fetchTerminals();
    } catch (err) {
      console.error(err);
    }
  };

  // Cálculo para el simulador
  const activeSelectedTerminal = terminals.find(
    (t) => t.id === simulatedTerminalId,
  );
  const simulatedRate = activeSelectedTerminal
    ? activeSelectedTerminal.commission_rate
    : parseFloat(terminalCommissionRate) || 0;

  const sampleAmount = 1000;
  const simulatedFee = (sampleAmount * simulatedRate) / 100;
  const simulatedNet = Math.max(0, sampleAmount - simulatedFee);

  return (
    <div className="rounded-xl bg-card border border-border p-6 space-y-6 transition hover:border-text-light/20 shadow-sm">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border pb-3">
        <div>
          <h3 className="text-xs font-black text-text-light/50 uppercase tracking-widest flex items-center gap-2">
            <CreditCard className="h-4 w-4 text-primary" /> Terminales Bancarias y Comisiones
          </h3>
          <p className="text-[11px] text-text-light/60 mt-0.5">
            Configura tus terminales físicas o pasarelas de pago con su respectiva comisión.
          </p>
        </div>
        <button
          type="button"
          onClick={handleOpenAdd}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-primary text-dark hover:bg-primary/90 transition shadow-sm cursor-pointer w-fit"
        >
          <Plus className="h-3.5 w-3.5" />
          Nueva Terminal
        </button>
      </div>

      {/* Input oculto para compatibilidad con el form principal */}
      <input
        type="hidden"
        name="terminalCommissionRate"
        id="terminalCommissionRate"
        value={terminalCommissionRate}
      />

      {/* Lista de Terminales */}
      <div className="space-y-3">
        <label className="text-xs font-bold text-text-light/60 uppercase tracking-wider block">
          Terminales Registradas ({terminals.length})
        </label>

        {loading ? (
          <div className="flex items-center justify-center p-6 text-text-light/40 gap-2">
            <Loader2 className="h-4 w-4 animate-spin text-primary" />
            <span className="text-xs font-medium">Cargando terminales...</span>
          </div>
        ) : terminals.length === 0 ? (
          <div className="rounded-lg border border-dashed border-border p-6 text-center text-text-light/50 text-xs">
            No tienes terminales registradas. Haz clic en &quot;Nueva Terminal&quot; para agregar una.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {terminals.map((t) => (
              <div
                key={t.id}
                className={`rounded-lg border p-3.5 transition flex flex-col justify-between gap-3 ${
                  t.is_active
                    ? "bg-dark/40 border-border hover:border-text-light/20"
                    : "bg-dark/20 border-border/40 opacity-60"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-bold text-sm text-text-light">
                        {t.name}
                      </span>
                      <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-white/10 text-text-light/80 border border-border">
                        {t.short_name}
                      </span>
                      {t.is_default && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-primary/15 text-primary border border-primary/30">
                          <Star className="h-2.5 w-2.5 fill-primary" /> Predeterminada
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-text-light/60 font-mono">
                      Comisión:{" "}
                      <span className="font-bold text-red-400">
                        {Number(t.commission_rate).toFixed(2)}%
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      title="Editar terminal"
                      onClick={() => handleOpenEdit(t)}
                      className="p-1.5 text-text-light/60 hover:text-text-light hover:bg-white/5 rounded-md transition"
                    >
                      <Edit2 className="h-3.5 w-3.5" />
                    </button>
                    <button
                      type="button"
                      title="Eliminar o desactivar"
                      onClick={() => handleDelete(t.id)}
                      className="p-1.5 text-red-400/60 hover:text-red-400 hover:bg-red-500/10 rounded-md transition"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>
                </div>

                <div className="flex items-center justify-between border-t border-border/50 pt-2 text-[11px]">
                  <label className="flex items-center gap-2 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={t.is_active}
                      onChange={() => handleToggleActive(t)}
                      className="rounded border-border bg-dark/60 text-primary focus:ring-0 cursor-pointer"
                    />
                    <span className={t.is_active ? "text-emerald-400 font-medium" : "text-text-light/40"}>
                      {t.is_active ? "Activa para cobro" : "Inactiva"}
                    </span>
                  </label>

                  <button
                    type="button"
                    onClick={() => setSimulatedTerminalId(t.id)}
                    className="text-primary hover:underline text-[10px] font-bold"
                  >
                    Simular
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Simulador en tiempo real */}
      <div className="rounded-xl bg-dark/40 border border-border/80 p-4 space-y-3 shadow-inner">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-xs font-black text-text-light uppercase tracking-wider">
            <Calculator className="h-3.5 w-3.5 text-primary" />
            <span>
              Simulador {activeSelectedTerminal ? `(${activeSelectedTerminal.name})` : "($1,000 MXN)"}
            </span>
          </div>
          {terminals.length > 1 && (
            <select
              value={simulatedTerminalId}
              onChange={(e) => setSimulatedTerminalId(e.target.value)}
              className="text-xs bg-card border border-border rounded px-2 py-1 text-text-light font-medium outline-none focus:border-primary"
            >
              {terminals.map((t) => (
                <option key={t.id} value={t.id}>
                  {t.short_name} ({t.commission_rate}%)
                </option>
              ))}
            </select>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
          <div className="bg-card/70 border border-border rounded-lg p-3">
            <span className="text-[10px] font-bold text-text-light/50 uppercase tracking-wider block">
              Cobro
            </span>
            <span className="text-base font-black text-text-light font-mono mt-0.5 block">
              ${sampleAmount.toFixed(2)}
            </span>
          </div>

          <div className="bg-card/70 border border-border rounded-lg p-3">
            <span className="text-[10px] font-bold text-red-400/70 uppercase tracking-wider block">
              Comisión ({simulatedRate.toFixed(2)}%)
            </span>
            <span className="text-base font-black text-red-400 font-mono mt-0.5 block">
              -${simulatedFee.toFixed(2)}
            </span>
          </div>

          <div className="bg-card/70 border border-border rounded-lg p-3">
            <span className="text-[10px] font-bold text-emerald-400/70 uppercase tracking-wider block">
              Neto
            </span>
            <span className="text-base font-black text-emerald-400 font-mono mt-0.5 block">
              ${simulatedNet.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="flex items-start gap-2 pt-1 text-[11px] text-text-light/60">
          <Info className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
          <p>
            {simulatedRate > 0
              ? "Se descuenta de la utilidad en cortes de caja y reportes financieros."
              : "Sin deducción en cortes ni reportes."}
          </p>
        </div>
      </div>

      {/* Modal Agregar / Editar Terminal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-card border border-border w-full max-w-md rounded-xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h4 className="font-bold text-sm text-text-light flex items-center gap-2">
                <CreditCard className="h-4 w-4 text-primary" />
                {editingTerminal ? "Editar Terminal" : "Nueva Terminal Bancaria"}
              </h4>
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="text-text-light/50 hover:text-text-light transition p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-xs text-red-400">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-text-light/70 block mb-1">
                  Nombre descriptivo
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Terminal Clip Barra, Terminal BBVA"
                  value={formName}
                  onChange={(e) => setFormName(e.target.value)}
                  className="w-full rounded-lg border border-border bg-dark/50 px-3.5 py-2 text-sm text-text-light outline-none focus:border-primary"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-xs font-bold text-text-light/70 block mb-1">
                    Nombre corto / Botón
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ej. Clip, BBVA, Amex"
                    value={formShortName}
                    onChange={(e) => setFormShortName(e.target.value)}
                    className="w-full rounded-lg border border-border bg-dark/50 px-3.5 py-2 text-sm text-text-light outline-none focus:border-primary"
                  />
                </div>

                <div>
                  <label className="text-xs font-bold text-text-light/70 block mb-1">
                    Comisión (%)
                  </label>
                  <div className="relative">
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      max="100"
                      required
                      placeholder="Ej. 3.60"
                      value={formRate}
                      onChange={(e) => setFormRate(e.target.value)}
                      className="w-full rounded-lg border border-border bg-dark/50 px-3.5 py-2 pr-8 text-sm text-text-light font-mono outline-none focus:border-primary"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-xs text-text-light/40 font-bold pointer-events-none">
                      %
                    </span>
                  </div>
                </div>
              </div>

              <label className="flex items-center gap-2 p-3 bg-dark/30 rounded-lg border border-border cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formIsDefault}
                  onChange={(e) => setFormIsDefault(e.target.checked)}
                  className="rounded border-border bg-dark/60 text-primary focus:ring-0"
                />
                <span className="text-xs font-medium text-text-light/80">
                  Marcar como terminal predeterminada en el cobro
                </span>
              </label>

              <div className="flex justify-end gap-2 pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={saving}
                  className="px-4 py-2 rounded-lg border border-border text-xs font-bold text-text-light/70 hover:bg-white/5 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 rounded-lg bg-primary text-dark text-xs font-bold hover:bg-primary/90 transition flex items-center gap-1.5"
                >
                  {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                  {editingTerminal ? "Guardar Cambios" : "Crear Terminal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
