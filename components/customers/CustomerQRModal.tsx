"use client";

import { Modal } from "@/components/ui/Modal";
import { Check, Copy, Download, Printer, QrCode } from "lucide-react";
import React, { useRef, useState } from "react";

export interface CustomerQRModalProps {
  isOpen: boolean;
  onClose: () => void;
  tenantSlug: string;
  tenantName: string;
}

export function CustomerQRModal({
  isOpen,
  onClose,
  tenantSlug,
  tenantName,
}: CustomerQRModalProps) {
  const [copied, setCopied] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const printableAreaRef = useRef<HTMLDivElement>(null);

  // Generación de URL de destino para el cliente
  const registrationUrl =
    typeof window !== "undefined" && window.location.hostname.includes("localhost")
      ? `http://localhost:5173/registro`
      : `https://${tenantSlug}.trykittn.com/registro`;

  const qrImageUrl = `https://api.qrserver.com/v1/create-qr-code/?size=350x350&ecc=M&margin=1&data=${encodeURIComponent(
    registrationUrl,
  )}`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Error al copiar enlace:", err);
    }
  };

  const handleDownloadQR = async () => {
    try {
      setIsDownloading(true);
      const res = await fetch(qrImageUrl);
      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `qr-registro-${tenantSlug || "clientes"}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error al descargar QR:", err);
    } finally {
      setIsDownloading(false);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="QR de Registro de Clientes"
      subtitle="Exhibe o imprime este código para que tus comensales se registren desde su celular"
      maxWidth="md"
      icon={<QrCode className="h-5 w-5 text-emerald-400" />}
    >
      <div className="p-6 space-y-6">
        {/* Contenedor imprimible y visual */}
        <div
          ref={printableAreaRef}
          className="printable-qr-card rounded-2xl border border-border bg-white text-black p-6 flex flex-col items-center text-center shadow-inner"
        >
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
            <QrCode className="h-6 w-6" />
          </div>

          <h3 className="text-base font-black uppercase tracking-wider text-zinc-900">
            {tenantName || "Club de Clientes"}
          </h3>
          <p className="text-xs text-zinc-500 font-medium mt-0.5">
            ¡Escanea y únete a nuestro club de clientes!
          </p>

          {/* Imagen del QR */}
          <div className="mt-4 p-3 bg-white rounded-xl border border-zinc-200 shadow-sm inline-block">
            <img
              src={qrImageUrl}
              alt="Código QR de Registro"
              width={220}
              height={220}
              className="size-52 rounded-lg"
              data-testid="qr-registration-img"
            />
          </div>

          <div className="mt-4 space-y-1">
            <p className="text-xs font-bold text-zinc-800">
              🎁 Acumula puntos y recibe beneficios
            </p>
            <p className="text-[11px] text-zinc-500">
              Apunta la cámara de tu teléfono para auto-registrarte
            </p>
          </div>

          <div className="mt-3 pt-3 border-t border-dashed border-zinc-200 w-full">
            <span className="text-[10px] font-mono text-zinc-400 truncate block">
              {registrationUrl}
            </span>
          </div>
        </div>

        {/* Acciones del Modal */}
        <div className="space-y-3">
          {/* Enlace directo y botón de copiar */}
          <div className="flex items-center gap-2 rounded-xl bg-dark/40 border border-border p-2">
            <span className="text-xs font-mono text-text-light/70 truncate flex-1 px-2 select-all">
              {registrationUrl}
            </span>
            <button
              onClick={handleCopyLink}
              className="rounded-lg bg-white/5 hover:bg-white/10 px-3 py-1.5 text-xs font-bold text-text-light transition flex items-center gap-1.5 cursor-pointer"
            >
              {copied ? (
                <>
                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                  <span>Copiado</span>
                </>
              ) : (
                <>
                  <Copy className="h-3.5 w-3.5" />
                  <span>Copiar</span>
                </>
              )}
            </button>
          </div>

          {/* Botones de Descargar e Imprimir */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <button
              onClick={handleDownloadQR}
              disabled={isDownloading}
              className="rounded-xl border border-border bg-card hover:bg-white/5 px-4 py-2.5 text-xs font-bold text-text-light transition flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
            >
              <Download className="h-4 w-4 text-emerald-400" />
              <span>{isDownloading ? "Descargando..." : "Descargar PNG"}</span>
            </button>

            <button
              onClick={handlePrint}
              className="rounded-xl bg-emerald-500 hover:bg-emerald-400 text-black px-4 py-2.5 text-xs font-black uppercase tracking-wider transition flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20"
            >
              <Printer className="h-4 w-4" />
              <span>Imprimir</span>
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
