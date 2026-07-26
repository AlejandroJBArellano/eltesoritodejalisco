"use client";

import { SmartBatch } from "@/types";
import {
  AlertTriangle,
  Clock,
  Package,
  Play,
  RefreshCw,
  Sparkles,
  Trash2,
  UtensilsCrossed
} from "lucide-react";
import { useEffect, useState } from "react";

interface IngredientBatchControlProps {
  ingredientName: string;
  ingredientId: string;
}

interface BatchSummaryResponse {
  totalItems: number;
  summary?: Record<string, number>;
}

export function IngredientBatchControl({
  ingredientName,
  ingredientId,
}: IngredientBatchControlProps) {
  const [activeBatch, setActiveBatch] = useState<SmartBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<BatchSummaryResponse | null>(null);
  const [isArmed, setIsArmed] = useState(false);

  // Helper for duration display
  const getDuration = (start: string | Date) => {
    if (!start) return "0m";
    const startDate = new Date(start);
    if (isNaN(startDate.getTime())) return "0m";

    const now = new Date();
    const diffMs = now.getTime() - startDate.getTime();

    const diffHrs = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMins = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

    if (diffHrs > 0) return `${diffHrs}h ${diffMins}m`;
    return `${diffMins}m`;
  };

  const fetchActiveBatch = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/inventory/smart-batch?ingredientId=${ingredientId}`
      );
      if (res.ok) {
        const data = await res.json();
        setActiveBatch(data.activeBatch);
      } else {
        setActiveBatch(null);
      }
    } catch {
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchActiveBatch();

    const interval = setInterval(() => {
      if (activeBatch) {
        setActiveBatch({ ...activeBatch });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [ingredientId]);

  const handleStartBatch = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/inventory/smart-batch", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ingredientId,
          name: `${ingredientName} Batch`,
        }),
      });

      if (res.ok) {
        const newBatch = await res.json();
        setActiveBatch(newBatch);
        setShowSummary(false);
        setSummaryData(null);
      } else {
        const err = await res.json();
        setError(err.error || "Error al abrir el lote");
      }
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  const handleFinishBatch = async () => {
    if (!activeBatch) return;

    if (!isArmed) {
      setIsArmed(true);
      setTimeout(() => setIsArmed(false), 4000);
      return;
    }
    setIsArmed(false);

    setLoading(true);
    try {
      const res = await fetch(
        `/api/inventory/smart-batch/${activeBatch.id}/finish`,
        {
          method: "POST",
        }
      );

      if (res.ok) {
        const data = await res.json();
        setSummaryData(data);
        setActiveBatch(null);
        setShowSummary(true);
      } else {
        const err = await res.json();
        setError(err.error || "Error al finalizar el lote");
      }
    } catch {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !activeBatch && !summaryData) {
    return (
      <div className="flex h-full min-h-[220px] flex-col items-center justify-center rounded-2xl border border-white/5 bg-[#242424] p-6 text-[#E0E0E0]/60">
        <RefreshCw className="h-6 w-6 animate-spin text-emerald-400 mb-2" />
        <span className="text-xs font-bold uppercase tracking-wider">
          Cargando inventario...
        </span>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-[#242424] shadow-lg transition-all hover:border-white/20">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/5 bg-[#1A1A1A] p-4">
        <h3 className="flex items-center gap-2 font-black text-[#E0E0E0]">
          <Package className="h-5 w-5 text-emerald-400" />
          <span>{ingredientName}</span>
        </h3>
        {activeBatch ? (
          <span className="flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-2.5 py-0.5 text-[10px] font-black uppercase tracking-wider text-emerald-400">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping" aria-hidden="true" />
            En Uso
          </span>
        ) : (
          <span className="rounded-full border border-white/10 bg-white/5 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-[#E0E0E0]/50">
            Cerrado
          </span>
        )}
      </div>

      {/* Body */}
      <div className="flex flex-1 flex-col justify-between p-5">
        {error && (
          <div className="mb-4 flex items-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 p-3 text-xs font-bold text-red-400">
            <AlertTriangle className="h-4 w-4 flex-shrink-0 text-red-400" />
            <span>{error}</span>
          </div>
        )}

        {!activeBatch ? (
          <div className="flex flex-1 flex-col justify-between space-y-4">
            {showSummary && summaryData && (
              <div className="rounded-xl border border-amber-500/20 bg-amber-500/10 p-4 text-xs">
                <div className="mb-2 flex items-center gap-1.5 border-b border-amber-500/20 pb-2 font-bold text-amber-300">
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>Rendimiento del Lote Anterior:</span>
                </div>
                <div className="max-h-32 space-y-1.5 overflow-y-auto pr-1 text-amber-200/90 custom-scrollbar">
                  {summaryData.summary &&
                    Object.entries(summaryData.summary).map(
                      ([item, count]) => (
                        <div
                          key={item}
                          className="flex justify-between items-center text-xs"
                        >
                          <span className="truncate pr-2 text-[#E0E0E0]/80">
                            {item}
                          </span>
                          <span className="font-mono font-bold text-amber-300">
                            {count}
                          </span>
                        </div>
                      )
                    )}
                  {(!summaryData.summary ||
                    Object.keys(summaryData.summary).length === 0) && (
                      <p className="italic text-amber-200/60">
                        No se registraron ventas en este lote.
                      </p>
                    )}
                </div>
                <div className="mt-3 flex justify-between border-t border-amber-500/20 pt-2 font-black text-amber-300">
                  <span>Total Producido:</span>
                  <span>{summaryData.totalItems} platillos</span>
                </div>
              </div>
            )}

            <div className="my-auto py-4 text-center">
              <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-2xl bg-white/5 border border-white/10 text-[#E0E0E0]/40">
                <UtensilsCrossed className="h-6 w-6" />
              </div>
              <p className="text-xs font-medium text-[#E0E0E0]/60">
                El lote actual está sin iniciar o agotado.
              </p>
            </div>

            <button
              type="button"
              onClick={handleStartBatch}
              disabled={loading}
              aria-label={`Abrir nuevo lote para ${ingredientName}`}
              className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-3.5 text-sm font-black text-black uppercase tracking-wider shadow-lg shadow-emerald-500/20 transition-all hover:bg-emerald-400 active:scale-[0.98] disabled:opacity-50"
            >
              {loading ? (
                <>
                  <RefreshCw className="h-4 w-4 animate-spin" />
                  <span>Abriendo Lote...</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 fill-black" />
                  <span>Abrir Nuevo Lote</span>
                </>
              )}
            </button>
          </div>
        ) : (
          <div className="flex flex-1 flex-col justify-between space-y-4">
            <div className="rounded-xl border border-blue-500/20 bg-blue-500/10 p-5 text-center shadow-inner">
              <span className="flex items-center justify-center gap-1 text-[10px] font-black uppercase tracking-widest text-blue-400">
                <Clock className="h-3.5 w-3.5" />
                Tiempo Transcurrido
              </span>
              <div className="my-2 font-mono text-3xl font-black text-blue-300">
                {getDuration(activeBatch.startedAt)}
              </div>
              <span className="text-[11px] font-medium text-blue-300/60">
                Iniciado a las{" "}
                {new Date(activeBatch.startedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <button
              type="button"
              onClick={handleFinishBatch}
              disabled={loading}
              aria-label={isArmed ? `Confirmar cierre de lote para ${ingredientName}` : `Marcar lote de ${ingredientName} como agotado`}
              className={`flex w-full flex-col items-center justify-center gap-1 rounded-xl p-4 transition-all shadow-md active:scale-[0.98] ${isArmed
                  ? "border-2 border-red-500 bg-red-600/90 text-white shadow-lg shadow-red-500/30 scale-[1.01]"
                  : "border border-red-500/30 bg-red-500/10 text-red-400 hover:bg-red-500/20 hover:border-red-500/50"
                }`}
            >
              <div className="flex items-center gap-2 text-sm font-black uppercase tracking-wider">
                {isArmed ? (
                  <>
                    <AlertTriangle className="h-4 w-4" />
                    <span>¿Confirmar Cierre de Lote?</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="h-4 w-4" />
                    <span>Marcar Lote como Agotado</span>
                  </>
                )}
              </div>
              <span
                className={`text-[10px] font-medium ${isArmed ? "text-white/90 font-bold" : "text-red-400/70"
                  }`}
              >
                {isArmed
                  ? "Presiona nuevamente para finalizar"
                  : "Presiona al vaciar completamente el contenedor"}
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

