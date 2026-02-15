"use client";

import { SmartBatch } from "@/types";
import { useEffect, useState } from "react";

interface IngredientBatchControlProps {
  ingredientName: string;
  ingredientId: string;
}

export function IngredientBatchControl({
  ingredientName,
  ingredientId,
}: IngredientBatchControlProps) {
  const [activeBatch, setActiveBatch] = useState<SmartBatch | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showSummary, setShowSummary] = useState(false);
  const [summaryData, setSummaryData] = useState<any>(null);

  // Helper for duration display
  const getDuration = (start: string | Date) => {
    const startDate = new Date(start);
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
        `/api/inventory/smart-batch?ingredientId=${ingredientId}`,
      );
      if (res.ok) {
        const data = await res.json();
        setActiveBatch(data.activeBatch);
      } else {
        // If 404 or empty, just null
        setActiveBatch(null);
      }
    } catch (err) {
      console.error(err);
      setError("Error de conexión");
    } finally {
      setLoading(false);
    }
  };

  // 1. Fetch active batch on mount
  useEffect(() => {
    fetchActiveBatch();

    // Auto refresh every minute to update the timer text
    const interval = setInterval(() => {
      if (activeBatch) {
        // Force re-render for timer
        setActiveBatch({ ...activeBatch });
      }
    }, 60000);

    return () => clearInterval(interval);
  }, [ingredientId]);

  // 2. Start a new batch
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
        setError(err.error || "Error al abrir");
      }
    } catch (err) {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  // 3. Finish the current batch
  const handleFinishBatch = async () => {
    if (!activeBatch) return;

    if (!confirm(`¿Confirmas que se ACABÓ el ${ingredientName}?`)) {
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(
        `/api/inventory/smart-batch/${activeBatch.id}/finish`,
        {
          method: "POST",
        },
      );

      if (res.ok) {
        const data = await res.json();
        setSummaryData(data); // Save the result to show
        setActiveBatch(null); // No active batch anymore
        setShowSummary(true);
      } else {
        const err = await res.json();
        setError(err.error || "Error al finalizar");
      }
    } catch (err) {
      setError("Error de red");
    } finally {
      setLoading(false);
    }
  };

  if (loading && !activeBatch && !summaryData)
    return (
      <div className="p-4 text-center animate-pulse">Scanning inventory...</div>
    );

  return (
    <div className="bg-white border-2 border-slate-200 rounded-xl shadow-sm overflow-hidden flex flex-col h-full">
      <div className="p-4 border-b bg-slate-50 flex justify-between items-center">
        <h3 className="font-bold text-slate-800 flex items-center gap-2">
          🪣 {ingredientName}
        </h3>
        {activeBatch && (
          <span className="text-xs bg-green-100 text-green-800 px-2 py-1 rounded-full font-bold animate-pulse">
            EN USO
          </span>
        )}
      </div>

      <div className="p-4 flex-1 flex flex-col justify-center">
        {error && (
          <div className="mb-4 p-3 bg-red-50 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {!activeBatch ? (
          <div className="space-y-4">
            {showSummary && summaryData && (
              <div className="p-3 bg-yellow-50 rounded-lg border border-yellow-200 text-sm">
                <h4 className="font-bold text-yellow-800 mb-2 border-b border-yellow-200 pb-1">
                  Rendimiento del último bote:
                </h4>
                <div className="space-y-1 text-yellow-900 max-h-32 overflow-y-auto">
                  {summaryData.summary &&
                    Object.entries(summaryData.summary).map(
                      ([item, count]: any) => (
                        <div key={item} className="flex justify-between">
                          <span className="truncate pr-2">{item}</span>
                          <span className="font-mono font-bold">{count}</span>
                        </div>
                      ),
                    )}
                  {(!summaryData.summary ||
                    Object.keys(summaryData.summary).length === 0) && (
                    <p className="italic opacity-70">
                      No se vendió nada con este ingrediente.
                    </p>
                  )}
                </div>
                <div className="pt-2 mt-2 border-t border-yellow-200 font-bold flex justify-between text-yellow-800">
                  <span>Total Producido:</span>
                  <span>{summaryData.totalItems} platos</span>
                </div>
              </div>
            )}

            <div className="text-center py-2 text-gray-500 text-sm">
              <p>El bote está vacío o cerrado.</p>
            </div>

            <button
              onClick={handleStartBatch}
              disabled={loading}
              className="w-full py-4 bg-green-600 hover:bg-green-700 active:bg-green-800 text-white rounded-lg text-lg font-bold shadow transition-all flex items-center justify-center gap-2"
            >
              {loading ? "Abriendo..." : "🟢 ABRIR NUEVO BOTE"}
            </button>
          </div>
        ) : (
          <div className="space-y-4 flex flex-col flex-1">
            <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 text-center">
              <span className="text-xs text-blue-500 uppercase font-bold tracking-wider">
                Tiempo Activo
              </span>
              <div className="text-4xl font-mono font-black text-blue-900 my-1">
                {getDuration(activeBatch.startedAt)}
              </div>
              <span className="text-xs text-blue-400">
                Desde{" "}
                {new Date(activeBatch.startedAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>
            </div>

            <div className="flex-1"></div>

            <button
              onClick={handleFinishBatch}
              disabled={loading}
              className="w-full py-6 bg-white border-2 border-red-500 text-red-600 hover:bg-red-50 active:bg-red-100 rounded-xl text-xl font-bold transition-all shadow-sm hover:shadow-md flex flex-col items-center justify-center gap-1 group"
            >
              <span className="group-hover:scale-105 transition-transform">
                🗑️ YA SE ACABÓ
              </span>
              <span className="text-xs font-normal opacity-70 text-red-400">
                Solo presiona cuando rasques el fondo
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
