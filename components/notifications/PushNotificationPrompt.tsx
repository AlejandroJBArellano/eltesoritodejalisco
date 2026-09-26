"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing, Loader2 } from "lucide-react";

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const rawData = window.atob(base64);
  const buffer = new ArrayBuffer(rawData.length);
  const outputArray = new Uint8Array(buffer);
  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray;
}

interface PushNotificationPromptProps {
  role?: "ADMIN" | "MANAGER" | "KITCHEN" | "CASHIER" | "WAITER";
  compact?: boolean;
  className?: string;
}

export function PushNotificationPrompt({
  role = "ADMIN",
  compact = false,
  className = "",
}: PushNotificationPromptProps) {
  const [isSupported, setIsSupported] = useState(false);
  const [permission, setPermission] =
    useState<NotificationPermission>("default");
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      "serviceWorker" in navigator &&
      "PushManager" in window &&
      "Notification" in window
    ) {
      setIsSupported(true);
      setPermission(Notification.permission);

      // Register SW on load and check existing push subscription
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => reg?.pushManager?.getSubscription())
        .then((sub) => {
          setIsSubscribed(Boolean(sub));
        })
        .catch((err) => {
          console.warn("[Push Notification Init Warning]", err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setIsSupported(false);
      setLoading(false);
    }
  }, []);

  const handleSubscribe = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      if (typeof window === "undefined" || !("Notification" in window)) {
        throw new Error("Tu navegador no soporta notificaciones.");
      }

      // 1. Request permission from browser
      const perm = await Notification.requestPermission();
      setPermission(perm);

      if (perm === "denied") {
        setErrorMsg(
          "Notificaciones bloqueadas en tu navegador. Habilítalas en el ícono de ajustes o candado en la barra de URL.",
        );
        setLoading(false);
        return;
      }

      if (perm !== "granted") {
        setLoading(false);
        return;
      }

      // 2. Validate VAPID key
      const vapidPublicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
      if (!vapidPublicKey) {
        throw new Error(
          "Falta configurar NEXT_PUBLIC_VAPID_PUBLIC_KEY en tu archivo .env.",
        );
      }

      // 3. Register SW and subscribe
      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      let sub = await reg.pushManager.getSubscription();
      if (!sub) {
        sub = await reg.pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey),
        });
      }

      // 4. Save subscription in backend
      const res = await fetch("/api/notifications/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          subscription: sub.toJSON(),
          role,
          userAgent: navigator.userAgent,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(
          errData.error ||
            "No se pudo registrar la suscripción en el servidor.",
        );
      }

      setIsSubscribed(true);
    } catch (err: unknown) {
      console.error("[Push Subscription Error]", err);
      const msg =
        err instanceof Error ? err.message : "Error al activar notificaciones.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleUnsubscribe = async () => {
    setErrorMsg(null);
    setLoading(true);

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        await fetch("/api/notifications/push/unsubscribe", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }

      setIsSubscribed(false);
    } catch (err: unknown) {
      console.error("[Push Unsubscription Error]", err);
      const msg =
        err instanceof Error
          ? err.message
          : "Error al desactivar notificaciones.";
      setErrorMsg(msg);
    } finally {
      setLoading(false);
    }
  };

  if (!isSupported) {
    return null;
  }

  if (compact) {
    return (
      <div className="relative inline-flex items-center">
        <button
          type="button"
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={loading}
          aria-label={
            permission === "denied"
              ? "Notificaciones bloqueadas"
              : isSubscribed
                ? "Notificaciones push activas"
                : "Activar notificaciones"
          }
          className={`inline-flex items-center justify-center gap-1.5 px-2 py-1 sm:px-2.5 sm:py-1 rounded-lg text-xs font-bold transition-all cursor-pointer select-none active:scale-[0.98] ${
            isSubscribed
              ? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 hover:bg-emerald-500/25"
              : permission === "denied"
                ? "bg-rose-500/10 text-rose-400 border border-rose-500/25 hover:bg-rose-500/20"
                : "bg-primary/20 text-primary border border-primary/40 hover:bg-primary/30"
          } ${className}`}
          title={
            permission === "denied"
              ? "Notificaciones bloqueadas en el navegador (clic para ver ayuda)"
              : isSubscribed
                ? "Notificaciones push activas (clic para pausar)"
                : "Activar notificaciones push en este dispositivo"
          }
        >
          {loading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />
          ) : isSubscribed ? (
            <BellRing className="w-3.5 h-3.5 shrink-0" />
          ) : permission === "denied" ? (
            <BellOff className="w-3.5 h-3.5 shrink-0" />
          ) : (
            <Bell className="w-3.5 h-3.5 shrink-0" />
          )}

          <span className="hidden sm:inline">
            {isSubscribed
              ? "Notificaciones Activas"
              : permission === "denied"
                ? "Notificaciones Bloqueadas"
                : "Activar Notificaciones"}
          </span>
          <span className="sm:hidden">
            {isSubscribed
              ? "Activas"
              : permission === "denied"
                ? "Bloqueadas"
                : "Activar"}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div
      className={`p-4 rounded-xl border border-border bg-card shadow-sm ${className}`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-lg bg-primary/10 border border-primary/20 flex items-center justify-center shrink-0">
            {isSubscribed ? (
              <BellRing className="w-5 h-5 text-emerald-400" />
            ) : permission === "denied" ? (
              <BellOff className="w-5 h-5 text-rose-400" />
            ) : (
              <Bell className="w-5 h-5 text-primary" />
            )}
          </div>
          <div className="min-w-0 flex-1">
            <h4 className="text-sm font-black text-text-light">
              Notificaciones Web Push
            </h4>
            <p className="text-xs text-text-light/60 mt-0.5 leading-relaxed">
              {permission === "denied"
                ? "Permiso bloqueado en tu navegador. Habilítalo en los ajustes o candado del sitio en la barra de URL."
                : isSubscribed
                  ? "Este dispositivo recibirá avisos de pedidos online y stock bajo."
                  : "Recibe alertas en tiempo real en esta pantalla aunque no esté visible."}
            </p>
            {errorMsg && (
              <p className="text-xs text-rose-400 font-medium mt-1 break-words">
                {errorMsg}
              </p>
            )}
          </div>
        </div>

        <button
          type="button"
          onClick={isSubscribed ? handleUnsubscribe : handleSubscribe}
          disabled={loading}
          className={`w-full sm:w-auto inline-flex items-center justify-center gap-2 px-3.5 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all shrink-0 cursor-pointer active:scale-[0.98] ${
            isSubscribed
              ? "bg-dark/40 text-text-light/80 hover:bg-dark/40 border border-border"
              : permission === "denied"
                ? "bg-rose-500/20 text-rose-300 border border-rose-500/30 hover:bg-rose-500/30"
                : "bg-primary text-background hover:bg-primary-hover shadow-sm"
          }`}
        >
          {loading && <Loader2 className="w-3.5 h-3.5 animate-spin shrink-0" />}
          <span>
            {loading
              ? "Procesando..."
              : isSubscribed
                ? "Desactivar"
                : permission === "denied"
                  ? "Reintentar"
                  : "Activar Alertas"}
          </span>
        </button>
      </div>
    </div>
  );
}
