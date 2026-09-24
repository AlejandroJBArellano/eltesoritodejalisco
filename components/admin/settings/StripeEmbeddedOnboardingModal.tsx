"use client";

import React, { useState, useEffect } from "react";
import {
  loadConnectAndInitialize,
  type StripeConnectInstance,
} from "@stripe/connect-js";
import {
  ConnectComponentsProvider,
  ConnectAccountOnboarding,
} from "@stripe/react-connect-js";
import { Modal } from "@/components/ui/Modal";
import { CreditCard, Loader2, AlertCircle } from "lucide-react";

interface StripeEmbeddedOnboardingModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function StripeEmbeddedOnboardingModal({
  isOpen,
  onClose,
  onSuccess,
}: StripeEmbeddedOnboardingModalProps) {
  const [stripeConnectInstance, setStripeConnectInstance] =
    useState<StripeConnectInstance | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;

    let mounted = true;

    const initConnect = async () => {
      const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
      if (!publishableKey) {
        if (mounted) setError("No disponible");
        return;
      }

      try {
        const instance = loadConnectAndInitialize({
          publishableKey,
          fetchClientSecret: async () => {
            const res = await fetch("/api/stripe/connect/account-session", {
              method: "POST",
            });
            const data = await res.json();
            if (!res.ok || !data.client_secret) {
              throw new Error(
                data.error || "No se pudo obtener la sesión de Stripe",
              );
            }
            return data.client_secret;
          },
          appearance: {
            overlays: "dialog",
            variables: {
              colorPrimary: "#F97316",
              colorBackground: "#1e1e24",
              colorText: "#f3f4f6",
              colorDanger: "#ef4444",
              borderRadius: "10px",
            },
          },
        });

        if (mounted) {
          setStripeConnectInstance(instance);
        }
      } catch (err) {
        if (mounted) {
          console.error(err);
          setError(
            err instanceof Error
              ? err.message
              : "Error al inicializar Stripe Connect",
          );
        }
      }
    };

    initConnect();

    return () => {
      mounted = false;
    };
  }, [isOpen]);

  const loading = isOpen && !stripeConnectInstance && !error;

  const handleClose = () => {
    setStripeConnectInstance(null);
    setError(null);
    onClose();
  };

  const handleExit = () => {
    if (onSuccess) onSuccess();
    handleClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Conectar Pagos con Stripe"
      subtitle="Configura tu cuenta bancaria y datos para depósitos directos"
      icon={<CreditCard className="h-5 w-5 text-primary" />}
      maxWidth="3xl"
    >
      <div className="min-h-[480px] flex flex-col justify-center">
        {loading && (
          <div className="flex flex-col items-center justify-center py-16 gap-3 text-text-light/60">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-sm font-medium">
              Iniciando conexión segura con Stripe...
            </p>
          </div>
        )}

        {error && (
          <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl flex items-center gap-3 text-red-400 text-sm">
            <AlertCircle className="h-5 w-5 shrink-0" />
            <p>{error}</p>
          </div>
        )}

        {!loading && !error && stripeConnectInstance && (
          <div className="w-full">
            <ConnectComponentsProvider connectInstance={stripeConnectInstance}>
              <ConnectAccountOnboarding onExit={handleExit} />
            </ConnectComponentsProvider>
          </div>
        )}
      </div>
    </Modal>
  );
}
