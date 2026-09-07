"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Modal } from "@/components/ui/Modal";
import { useTenant } from "@/components/TenantProvider";
import {
  Check,
  Copy,
  DollarSign,
  MessageCircle,
  PackageCheck,
  Send,
  Sparkles,
  User,
} from "lucide-react";

export type WhatsAppTemplateKey = "saldo" | "pedido" | "aviso" | "personalizado";

export interface CustomerWhatsAppModalCustomer {
  id: string;
  name: string;
  phone?: string | null;
  email?: string | null;
  debt_balance?: number;
  loyalty_points?: number;
  pending_orders_count?: number;
}

export interface CustomerWhatsAppModalProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerWhatsAppModalCustomer | null;
  onCustomerUpdated?: () => void;
}

export function formatWhatsAppPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.length === 10) {
    return `52${digits}`;
  }
  return digits;
}

export function buildTemplateMessage({
  template,
  customerName,
  tenantName,
  debtBalance = 0,
  loyaltyPoints = 0,
}: {
  template: WhatsAppTemplateKey;
  customerName: string;
  tenantName: string;
  debtBalance?: number;
  loyaltyPoints?: number;
}): string {
  const cleanName = customerName.trim();
  switch (template) {
    case "saldo":
      if (debtBalance > 0) {
        return `¡Hola ${cleanName}! Te saludamos de ${tenantName}. Te recordamos que tienes un saldo pendiente de $${debtBalance.toFixed(2)}. Si necesitas consultar tu estado de cuenta o abonar, quedamos a tu servicio. ¡Gracias por tu preferencia!`;
      }
      return `¡Hola ${cleanName}! Te saludamos de ${tenantName}. Te confirmamos que tu cuenta se encuentra al corriente sin adeudos pendientes. ¡Agradecemos mucho tu preferencia!`;
    case "pedido":
      return `¡Hola ${cleanName}! Te saludamos de ${tenantName}. Te confirmamos que registramos tu pedido y lo estamos atendiendo. Te notificaremos en cuanto se encuentre listo. ¡Gracias!`;
    case "aviso":
      return `¡Hola ${cleanName}! Te saludamos de ${tenantName}. Te compartimos nuestras promociones del día. Recuerda que cuentas con ${loyaltyPoints} puntos en tu saldo. ¡Esperamos verte pronto!`;
    case "personalizado":
      return `¡Hola ${cleanName}! Te saludamos de ${tenantName}. `;
    default:
      return "";
  }
}

interface InnerModalContentProps {
  isOpen: boolean;
  onClose: () => void;
  customer: CustomerWhatsAppModalCustomer;
  onCustomerUpdated?: () => void;
}

function CustomerWhatsAppModalContent({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
}: InnerModalContentProps) {
  const tenant = useTenant();
  const tenantName = tenant?.name || "Kittn";

  const initialPhone = customer.phone ? customer.phone.replace(/\D/g, "") : "";
  const [phone, setPhone] = useState(initialPhone);
  const initialTemplate: WhatsAppTemplateKey =
    (customer.debt_balance || 0) > 0 ? "saldo" : "aviso";
  const [selectedTemplate, setSelectedTemplate] = useState<WhatsAppTemplateKey>(initialTemplate);
  const [message, setMessage] = useState(() =>
    buildTemplateMessage({
      template: initialTemplate,
      customerName: customer.name,
      tenantName,
      debtBalance: customer.debt_balance || 0,
      loyaltyPoints: customer.loyalty_points || 0,
    })
  );
  const [savePhone, setSavePhone] = useState(!customer.phone);
  const [copied, setCopied] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Sincronizar mensaje cuando cambia el cliente o la sucursal
  useEffect(() => {
    const freshPhone = customer.phone ? customer.phone.replace(/\D/g, "") : "";
    setPhone(freshPhone);
    setSavePhone(!customer.phone);
    setCopied(false);
    setErrorMessage(null);

    const defaultTpl: WhatsAppTemplateKey =
      (customer.debt_balance || 0) > 0 ? "saldo" : "aviso";
    setSelectedTemplate(defaultTpl);

    const freshMsg = buildTemplateMessage({
      template: defaultTpl,
      customerName: customer.name,
      tenantName,
      debtBalance: customer.debt_balance || 0,
      loyaltyPoints: customer.loyalty_points || 0,
    });
    setMessage(freshMsg);
  }, [customer, tenantName]);

  const handleSelectTemplate = (templateKey: WhatsAppTemplateKey) => {
    setSelectedTemplate(templateKey);
    const newMsg = buildTemplateMessage({
      template: templateKey,
      customerName: customer.name,
      tenantName,
      debtBalance: customer.debt_balance || 0,
      loyaltyPoints: customer.loyalty_points || 0,
    });
    setMessage(newMsg);
  };

  const cleanTargetPhone = useMemo(() => formatWhatsAppPhone(phone), [phone]);

  const handleCopyMessage = async () => {
    if (!message) return;
    try {
      await navigator.clipboard.writeText(message);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setErrorMessage("No se pudo copiar el mensaje al portapapeles.");
    }
  };

  const handleSendWhatsApp = async () => {
    setErrorMessage(null);

    const digitsOnly = phone.replace(/\D/g, "");
    if (!digitsOnly || digitsOnly.length < 10) {
      setErrorMessage("Ingresa un número celular válido de al menos 10 dígitos.");
      return;
    }

    if (!message.trim()) {
      setErrorMessage("El mensaje no puede estar vacío.");
      return;
    }

    // Si se activó guardar teléfono y el teléfono es nuevo o cambió
    if (savePhone && customer.id && digitsOnly !== (customer.phone || "").replace(/\D/g, "")) {
      try {
        setIsSaving(true);
        const res = await fetch("/api/customers", {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: customer.id,
            name: customer.name,
            phone: digitsOnly,
          }),
        });
        if (!res.ok) {
          const errData = await res.json().catch(() => null);
          throw new Error(errData?.error || "Error al actualizar teléfono");
        }
        if (onCustomerUpdated) {
          onCustomerUpdated();
        }
      } catch (err) {
        setErrorMessage(
          err instanceof Error
            ? err.message
            : "No se pudo guardar el teléfono en el perfil."
        );
        setIsSaving(false);
        return;
      } finally {
        setIsSaving(false);
      }
    }

    const waUrl = `https://wa.me/${cleanTargetPhone}?text=${encodeURIComponent(message.trim())}`;
    window.open(waUrl, "_blank", "noopener,noreferrer");
    onClose();
  };

  const templates: {
    key: WhatsAppTemplateKey;
    label: string;
    icon: React.ReactNode;
    desc: string;
  }[] = [
    {
      key: "saldo",
      label: "Saldo Pendiente",
      icon: <DollarSign className="h-4 w-4" />,
      desc:
        (customer.debt_balance || 0) > 0
          ? `Adeudo: $${Number(customer.debt_balance).toFixed(2)}`
          : "Al corriente",
    },
    {
      key: "pedido",
      label: "Confirmación de Pedido",
      icon: <PackageCheck className="h-4 w-4" />,
      desc: "Estado y preparación",
    },
    {
      key: "aviso",
      label: "Aviso / Promoción",
      icon: <Sparkles className="h-4 w-4" />,
      desc: `${customer.loyalty_points || 0} pts acumulados`,
    },
    {
      key: "personalizado",
      label: "Mensaje Libre",
      icon: <User className="h-4 w-4" />,
      desc: "Escribe tu propio texto",
    },
  ];

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Acciones Rápidas WhatsApp"
      subtitle={`Cliente: ${customer.name}`}
      icon={<MessageCircle className="h-5 w-5 text-emerald-400" />}
      maxWidth="lg"
    >
      <div className="p-6 space-y-5">
        {/* Mensaje de error si ocurre */}
        {errorMessage && (
          <div
            role="alert"
            className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl text-xs font-bold text-red-400 flex items-center justify-between"
          >
            <span>{errorMessage}</span>
            <button
              type="button"
              onClick={() => setErrorMessage(null)}
              className="text-red-400 hover:text-white"
            >
              ✕
            </button>
          </div>
        )}

        {/* Sección de Teléfono */}
        <div className="space-y-2 bg-dark/20 p-4 rounded-xl border border-border">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1">
            <label
              htmlFor="wa-phone-input"
              className="text-xs font-black text-text-light/70 uppercase tracking-wider"
            >
              Número de WhatsApp
            </label>
            {cleanTargetPhone && (
              <span className="text-[11px] font-mono text-emerald-400/90 font-bold">
                wa.me/{cleanTargetPhone}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <input
                id="wa-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value.replace(/\D/g, ""))}
                placeholder="Ej. 3312345678"
                className="w-full bg-card border border-border rounded-xl px-3 py-2 text-sm font-mono font-bold text-text-light placeholder:text-text-light/30 focus:border-emerald-400 outline-none transition-colors"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <label className="flex items-center gap-2 text-xs font-bold text-text-light/70 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={savePhone}
                onChange={(e) => setSavePhone(e.target.checked)}
                className="rounded border-border text-emerald-500 focus:ring-0 cursor-pointer"
              />
              Guardar número en el perfil del cliente
            </label>
            {phone.length === 10 && (
              <span className="text-[10px] text-text-light/50 font-bold">
                Prefijo +52 automático
              </span>
            )}
          </div>
        </div>

        {/* Selector de Plantillas */}
        <div className="space-y-2">
          <label className="text-xs font-black text-text-light/70 uppercase tracking-wider block">
            Selecciona una plantilla
          </label>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {templates.map((tpl) => {
              const isActive = selectedTemplate === tpl.key;
              return (
                <button
                  key={tpl.key}
                  type="button"
                  onClick={() => handleSelectTemplate(tpl.key)}
                  className={`p-3 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between ${
                    isActive
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-400 shadow-sm"
                      : "bg-card border-border text-text-light/70 hover:bg-white/5 hover:text-text-light"
                  }`}
                >
                  <div className="flex items-center gap-1.5 font-black text-xs">
                    {tpl.icon}
                    <span className="truncate">{tpl.label}</span>
                  </div>
                  <span className="text-[10px] font-bold text-text-light/50 truncate mt-1">
                    {tpl.desc}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Campo Editable de Mensaje */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <label
              htmlFor="wa-message-textarea"
              className="text-xs font-black text-text-light/70 uppercase tracking-wider"
            >
              Mensaje a enviar
            </label>
            <span className="text-[10px] text-text-light/40 font-mono font-bold">
              {message.length} caracteres
            </span>
          </div>
          <textarea
            id="wa-message-textarea"
            rows={4}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Escribe el mensaje..."
            className="w-full bg-card border border-border rounded-xl p-3 text-xs text-text-light leading-relaxed placeholder:text-text-light/30 focus:border-emerald-400 outline-none resize-none transition-colors font-sans"
          />
        </div>

        {/* Botones de Acción */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2 border-t border-border">
          <button
            type="button"
            onClick={handleCopyMessage}
            className="w-full sm:w-auto px-4 py-2.5 rounded-xl border border-border text-text-light/80 hover:text-white hover:bg-white/5 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4 text-emerald-400" />
                <span className="text-emerald-400">Copiado</span>
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copiar Mensaje
              </>
            )}
          </button>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 sm:flex-none px-4 py-2.5 rounded-xl border border-border text-text-light/60 hover:text-text-light font-bold text-xs uppercase tracking-wider transition-all cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSendWhatsApp}
              disabled={isSaving}
              className="flex-1 sm:flex-none px-5 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-600 active:scale-95 disabled:opacity-30 disabled:pointer-events-none text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20 cursor-pointer"
            >
              <Send className="h-4 w-4" />
              {isSaving ? "Guardando..." : "Abrir WhatsApp"}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
}

export function CustomerWhatsAppModal({
  isOpen,
  onClose,
  customer,
  onCustomerUpdated,
}: CustomerWhatsAppModalProps) {
  if (!isOpen || !customer) return null;

  return (
    <CustomerWhatsAppModalContent
      isOpen={isOpen}
      onClose={onClose}
      customer={customer}
      onCustomerUpdated={onCustomerUpdated}
    />
  );
}
