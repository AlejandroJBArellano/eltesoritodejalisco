"use client";

import { useState, useTransition } from "react";
import { Mail, Loader2, CheckCircle2 } from "lucide-react";

export function AlertButton() {
  const [isPending, startTransition] = useTransition();
  const [result, setResult] = useState<"success" | "error" | null>(null);

  const handleSend = () => {
    setResult(null);
    startTransition(async () => {
      try {
        const res = await fetch("/api/inventory/alert", { method: "POST" });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResult("success");
        setTimeout(() => setResult(null), 4000);
      } catch {
        setResult("error");
        setTimeout(() => setResult(null), 4000);
      }
    });
  };

  return (
    <button
      type="button"
      onClick={handleSend}
      disabled={isPending}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2.5 text-xs font-black uppercase tracking-wider border transition-all disabled:opacity-60 ${
        result === "success"
          ? "bg-emerald-500/15 border-emerald-500/30 text-emerald-400"
          : result === "error"
          ? "bg-red-500/15 border-red-500/30 text-red-400"
          : "bg-white/5 border-border text-text-light/60 hover:text-text-light hover:bg-white/10"
      }`}
    >
      {isPending ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : result === "success" ? (
        <CheckCircle2 className="h-3.5 w-3.5" />
      ) : (
        <Mail className="h-3.5 w-3.5" />
      )}
      {isPending
        ? "Enviando..."
        : result === "success"
        ? "¡Enviado!"
        : result === "error"
        ? "Error al enviar"
        : "Enviar Alerta"}
    </button>
  );
}
