"use client";

import { useId, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Loader2, Sparkles } from "lucide-react";
import { useOptionalUser } from "@/components/UserProvider";
import { getPendingAnnouncements, type Announcement } from "@/lib/announcements";

/**
 * Muestra al entrar el primer anuncio pendiente del usuario. Al aceptarlo se
 * guarda en su perfil (profiles.seen_announcements) y no vuelve a aparecer.
 */
export function AnnouncementGate() {
  const user = useOptionalUser();
  const router = useRouter();
  const titleId = useId();
  const [acknowledged, setAcknowledged] = useState<Set<string>>(new Set());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const pending = useMemo(
    () =>
      getPendingAnnouncements(user?.profile ?? null).filter(
        (a) => !acknowledged.has(a.key),
      ),
    [user?.profile, acknowledged],
  );
  const current: Announcement | undefined = pending[0];
  if (!current) return null;

  const showCta =
    current.cta &&
    (!current.cta.permission || user?.hasPermission?.(current.cta.permission));

  const accept = async (goTo?: string) => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/announcements/seen", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ key: current.key }),
      });
      if (!response.ok) {
        const data = await response.json().catch(() => null);
        throw new Error(data?.error || "No se pudo guardar");
      }
      setAcknowledged((prev) => new Set(prev).add(current.key));
      if (goTo) router.push(goTo);
      else router.refresh();
    } catch (err) {
      setError(
        err instanceof Error
          ? `${err.message}. Intenta de nuevo.`
          : "No se pudo guardar. Intenta de nuevo.",
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-md no-print">
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-2xl"
      >
        <div className="space-y-4 p-6 sm:p-7">
          <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest text-primary">
            <Sparkles className="h-4 w-4" /> Novedad
          </div>
          <h2
            id={titleId}
            className="text-xl font-black leading-tight tracking-tight text-text-light"
          >
            {current.title}
          </h2>
          {current.body.map((p, i) => (
            <p key={i} className="text-sm leading-relaxed text-text-light/70">
              {p}
            </p>
          ))}
          {current.highlights && current.highlights.length > 0 && (
            <ul className="space-y-2">
              {current.highlights.map((h, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-text-light/80">
                  <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                  <span>{h}</span>
                </li>
              ))}
            </ul>
          )}
          {error && (
            <p className="text-xs font-bold text-red-400" role="alert">
              {error}
            </p>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-border bg-dark/30 px-6 py-4 sm:flex-row sm:justify-end">
          {showCta && current.cta && (
            <button
              type="button"
              disabled={saving}
              onClick={() => accept(current.cta!.href)}
              className="rounded-lg border border-border bg-card px-4 py-2.5 text-xs font-bold uppercase tracking-wider text-text-light transition hover:bg-dark/40 disabled:opacity-50 cursor-pointer"
            >
              {current.cta.label}
            </button>
          )}
          <button
            type="button"
            disabled={saving}
            onClick={() => accept()}
            autoFocus
            className="flex items-center justify-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-xs font-black uppercase tracking-wider text-dark transition hover:brightness-110 disabled:opacity-50 cursor-pointer"
          >
            {saving && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
            Entendido
          </button>
        </div>
      </div>
    </div>
  );
}
