"use client";

import { type FormEvent, useEffect, useRef, useState } from "react";

// ─── CFDI Catalogues (SAT) ────────────────────────────────────────────────────

const USO_CFDI_OPTIONS = [
  { value: "G01", label: "G01 – Adquisición de mercancias" },
  { value: "G02", label: "G02 – Devoluciones, descuentos o bonificaciones" },
  { value: "G03", label: "G03 – Gastos en general" },
  { value: "I01", label: "I01 – Construcciones" },
  { value: "I02", label: "I02 – Mobilario y equipo de oficina" },
  { value: "I03", label: "I03 – Equipo de transporte" },
  { value: "I04", label: "I04 – Equipo de computo" },
  { value: "I08", label: "I08 – Otra maquinaria y equipo" },
  { value: "D01", label: "D01 – Honorarios médicos y dentales" },
  { value: "D10", label: "D10 – Pagos por servicios educativos" },
  { value: "S01", label: "S01 – Sin efectos fiscales" },
  { value: "CP01", label: "CP01 – Pagos" },
];

const REGIMEN_FISCAL_OPTIONS = [
  { value: "601", label: "601 – General de Ley Personas Morales" },
  { value: "603", label: "603 – Personas Morales con fines no lucrativos" },
  { value: "605", label: "605 – Sueldos y Salarios" },
  { value: "606", label: "606 – Arrendamiento" },
  { value: "607", label: "607 – Régimen de Enajenación o Adquisición de Bienes" },
  { value: "608", label: "608 – Demás ingresos" },
  { value: "610", label: "610 – Residentes en el Extranjero" },
  { value: "611", label: "611 – Ingresos por Dividendos" },
  { value: "612", label: "612 – Personas Físicas con Actividades Empresariales" },
  { value: "614", label: "614 – Ingresos por intereses" },
  { value: "616", label: "616 – Sin obligaciones fiscales" },
  { value: "621", label: "621 – Incorporación Fiscal" },
  { value: "622", label: "622 – Actividades Agrícolas, Ganaderas, etc." },
  { value: "623", label: "623 – Opcional para Grupos de Sociedades" },
  { value: "624", label: "624 – Coordinados" },
  { value: "625", label: "625 – Régimen de las Actividades Empresariales con ingresos" },
  { value: "626", label: "626 – Régimen Simplificado de Confianza (RESICO)" },
];

// ─── Types ────────────────────────────────────────────────────────────────────

type FacturarModalProps = {
  orderId: string;
  orderNumber: string;
  orderTotal: number;
  onClose: () => void;
  onSuccess: (cfdiUid: string, folioFiscal: string | null) => void;
};

// ─── RFC validation helpers ────────────────────────────────────────────────────

const RFC_MORAL_REGEX = /^[A-ZÑ&]{3}[0-9]{6}[A-Z0-9]{3}$/i;
const RFC_FISICA_REGEX = /^[A-ZÑ&]{4}[0-9]{6}[A-Z0-9]{3}$/i;
const RFC_GENERICO = /^(XAXX010101000|XEXX010101000)$/i;

function validateRfc(rfc: string): string | null {
  const r = rfc.trim().toUpperCase();
  if (!r) return "El RFC es obligatorio";
  if (!RFC_MORAL_REGEX.test(r) && !RFC_FISICA_REGEX.test(r) && !RFC_GENERICO.test(r)) {
    return "RFC inválido (debe tener 12 o 13 caracteres con formato correcto)";
  }
  return null;
}

function isPersonaMoral(rfc: string): boolean {
  return rfc.trim().length === 12 && !RFC_GENERICO.test(rfc.trim());
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function FacturarModal({
  orderId,
  orderNumber,
  orderTotal,
  onClose,
  onSuccess,
}: FacturarModalProps) {
  const [rfc, setRfc] = useState("");
  const [razonSocial, setRazonSocial] = useState("");
  const [regimenFiscal, setRegimenFiscal] = useState("616");
  const [cp, setCp] = useState("");
  const [usoCfdi, setUsoCfdi] = useState("G03");

  const [rfcError, setRfcError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [result, setResult] = useState<{
    cfdiUid: string;
    folioFiscal: string | null;
    pdfUrl: string;
    xmlUrl: string;
    isrAplicado: boolean;
  } | null>(null);

  const rfcInputRef = useRef<HTMLInputElement>(null);

  // Auto-focus RFC input on open
  useEffect(() => {
    rfcInputRef.current?.focus();
  }, []);

  // Derive ISR note
  const showIsrNote = rfc.trim().length === 12 && !RFC_GENERICO.test(rfc.trim());

  const handleRfcChange = (value: string) => {
    setRfc(value.toUpperCase());
    setRfcError(null);
    setFormError(null);
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    const rfcErr = validateRfc(rfc);
    if (rfcErr) {
      setRfcError(rfcErr);
      return;
    }
    if (!razonSocial.trim()) {
      setFormError("El nombre / razón social es obligatorio");
      return;
    }
    if (!cp.trim() || !/^\d{5}$/.test(cp.trim())) {
      setFormError("El código postal debe tener 5 dígitos");
      return;
    }

    setIsSubmitting(true);
    setFormError(null);

    try {
      const res = await fetch("/api/factura", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderId,
          rfcReceptor: rfc.trim().toUpperCase(),
          razonSocialReceptor: razonSocial.trim(),
          regimenFiscalReceptor: regimenFiscal,
          cpReceptor: cp.trim(),
          usoCfdi,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setFormError(data?.error ?? "Error al timbrar la factura");
        return;
      }

      setResult({
        cfdiUid: data.cfdiUid,
        folioFiscal: data.folioFiscal ?? null,
        pdfUrl: data.pdfUrl,
        xmlUrl: data.xmlUrl,
        isrAplicado: data.isrAplicado,
      });

      onSuccess(data.cfdiUid, data.folioFiscal ?? null);
    } catch {
      setFormError("Error de conexión. Intenta de nuevo.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4">
      <div className="w-full max-w-md rounded-2xl bg-[#242424] shadow-2xl border border-blue-500/20 max-h-[95vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-gray-700">
          <div>
            <h3 className="text-lg font-black text-white">🧾 Generar Factura</h3>
            <p className="text-xs text-gray-400 mt-0.5">
              Orden #{orderNumber} · ${orderTotal.toFixed(2)} MXN
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-gray-600 px-2.5 py-1.5 text-sm text-gray-400 hover:text-white hover:border-gray-400 transition-all"
          >
            ✕
          </button>
        </div>

        {result ? (
          // ── Success state ──────────────────────────────────────────────────
          <div className="px-6 py-6 space-y-5">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="text-5xl">✅</div>
              <h4 className="text-xl font-black text-white">¡Factura Timbrada!</h4>
              {result.folioFiscal && (
                <p className="text-xs text-gray-400 break-all">
                  Folio Fiscal (UUID): <span className="text-blue-400 font-mono">{result.folioFiscal}</span>
                </p>
              )}
              {result.isrAplicado && (
                <p className="text-xs text-amber-400 bg-amber-900/20 rounded-lg px-3 py-2 w-full">
                  ⚠️ Se aplicó retención de ISR 1.25% (RESICO – Persona Moral)
                </p>
              )}
            </div>

            <div className="space-y-3">
              <a
                href={result.pdfUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-red-600 py-3 text-sm font-bold text-white hover:bg-red-700 transition-all"
              >
                📄 Descargar PDF
              </a>
              <a
                href={result.xmlUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 w-full rounded-xl bg-[#181818] border border-gray-600 py-3 text-sm font-bold text-gray-300 hover:border-blue-500 hover:text-white transition-all"
              >
                📎 Descargar XML
              </a>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-gray-600 py-3 text-sm font-bold text-gray-400 hover:bg-[#181818] transition-all"
            >
              Cerrar
            </button>
          </div>
        ) : (
          // ── Form ───────────────────────────────────────────────────────────
          <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
            {formError && (
              <div className="rounded-lg border border-red-500/30 bg-red-900/20 px-4 py-3 text-sm text-red-400">
                {formError}
              </div>
            )}

            {/* RFC */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                RFC del cliente *
              </label>
              <input
                ref={rfcInputRef}
                type="text"
                value={rfc}
                onChange={(e) => handleRfcChange(e.target.value)}
                placeholder="Ej. XAXX010101000 o ABC010101AAA"
                maxLength={13}
                className="w-full rounded-lg border border-gray-600 bg-[#181818] text-white px-3 py-2.5 text-sm font-mono focus:border-blue-500 focus:outline-none uppercase placeholder:normal-case"
              />
              {rfcError && (
                <p className="mt-1 text-xs text-red-400">{rfcError}</p>
              )}
              {showIsrNote && !rfcError && (
                <p className="mt-1 text-xs text-amber-400">
                  📌 Persona Moral detectada – se aplicará retención ISR 1.25% (RESICO)
                </p>
              )}
              {rfc.trim().length === 13 && !rfcError && (
                <p className="mt-1 text-xs text-green-400">
                  ✓ Persona Física – sin retención de ISR
                </p>
              )}
            </div>

            {/* Razón Social */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Nombre / Razón Social *
              </label>
              <input
                type="text"
                value={razonSocial}
                onChange={(e) => { setRazonSocial(e.target.value); setFormError(null); }}
                placeholder="Ej. JUAN PEREZ GARCIA o EMPRESA SA DE CV"
                className="w-full rounded-lg border border-gray-600 bg-[#181818] text-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none"
              />
            </div>

            {/* CP + Uso CFDI in two columns */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Código Postal *
                </label>
                <input
                  type="text"
                  value={cp}
                  onChange={(e) => { setCp(e.target.value.replace(/\D/g, "").slice(0, 5)); setFormError(null); }}
                  placeholder="Ej. 44100"
                  maxLength={5}
                  className="w-full rounded-lg border border-gray-600 bg-[#181818] text-white px-3 py-2.5 text-sm font-mono focus:border-blue-500 focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                  Uso CFDI *
                </label>
                <select
                  value={usoCfdi}
                  onChange={(e) => setUsoCfdi(e.target.value)}
                  className="w-full rounded-lg border border-gray-600 bg-[#181818] text-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none leading-normal"
                >
                  {USO_CFDI_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Régimen Fiscal Receptor */}
            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1.5">
                Régimen Fiscal del Receptor *
              </label>
              <select
                value={regimenFiscal}
                onChange={(e) => setRegimenFiscal(e.target.value)}
                className="w-full rounded-lg border border-gray-600 bg-[#181818] text-white px-3 py-2.5 text-sm focus:border-blue-500 focus:outline-none leading-normal"
              >
                {REGIMEN_FISCAL_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>

            {/* Info box */}
            <div className="rounded-lg bg-[#181818] border border-gray-700 px-4 py-3 text-xs text-gray-500">
              <p>
                💡 Si el cliente tiene su <strong className="text-gray-400">constancia de situación fiscal</strong>, puede escanear el QR para obtener su RFC automáticamente.
              </p>
            </div>

            {/* Actions */}
            <div className="flex gap-3 pt-1">
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="flex-1 rounded-xl border border-gray-600 py-3 text-sm font-bold text-gray-400 hover:bg-[#181818] transition-all disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 rounded-xl bg-blue-600 py-3 text-sm font-bold text-white hover:bg-blue-700 transition-all disabled:opacity-70"
              >
                {isSubmitting ? "Timbrando..." : "🧾 Timbrar Factura"}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
