/**
 * Anuncios de novedades dentro de KittnOS.
 *
 * Cada anuncio tiene una clave única. Cuando el usuario lo acepta, la clave se
 * guarda en profiles.seen_announcements (JSONB: { [clave]: fechaISO }) y ya no
 * se vuelve a mostrar. Para publicar uno nuevo basta con agregarlo aquí.
 */
import { hasAnyPermission, type PermissionKey } from "@/lib/permissions";

export interface Announcement {
  /** Clave única y estable: minúsculas, números, punto, guion o guion bajo. */
  key: string;
  title: string;
  /** Párrafos del cuerpo. */
  body: string[];
  /** Puntos destacados opcionales. */
  highlights?: string[];
  /** Solo usuarios con al menos uno de estos permisos lo ven (vacío = todos). */
  audience?: PermissionKey[];
  /** Botón de acción opcional (también marca el anuncio como visto). */
  cta?: {
    label: string;
    href: string;
    /** Permiso requerido para mostrar el botón. */
    permission?: PermissionKey;
  };
}

export const ANNOUNCEMENT_KEY_PATTERN = /^[a-z0-9][a-z0-9._-]{0,63}$/;

export const ANNOUNCEMENTS: Announcement[] = [
  {
    key: "customization-v1",
    title: "¡Ya puedes crear platillos personalizados!",
    body: [
      "Arma platillos como Tacos Mixtos, bowls o combos: el cliente elige sabores, extras o salsas en un modal, tanto en el POS como en Pickup.",
    ],
    highlights: [
      "Grupos con mínimo y máximo, opciones repetibles (3 de pastor) o de una sola vez.",
      "Precio por opción o por cantidad de piezas (3 tacos = $120).",
      "Descuenta inventario por opción y marca como “Agotado” lo que se acabe.",
      "La cocina recibe todo en una sola línea: 2x Pastor, 1x Birria.",
    ],
    audience: ["menu.manage_customization", "pos.view"],
    cta: {
      label: "Configurar en Menú",
      href: "/menu",
      permission: "menu.manage_customization",
    },
  },
];

export type SeenAnnouncements = Record<string, string>;

/** Normaliza el valor de la columna (puede venir null o con basura). */
export function parseSeenAnnouncements(value: unknown): SeenAnnouncements {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const out: SeenAnnouncements = {};
  for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
    if (typeof v === "string") out[k] = v;
  }
  return out;
}

interface ProfileLike {
  role?: string | null;
  permissions?: string[] | null;
  role_data?: {
    permissions?: string[] | null;
    is_system?: boolean;
    system_slug?: string | null;
  } | null;
  seen_announcements?: unknown;
}

/**
 * Anuncios pendientes del usuario, en orden. Si el perfil no trae la columna
 * (migración pendiente) no se muestra nada para no repetir el anuncio.
 */
export function getPendingAnnouncements(
  profile: ProfileLike | null | undefined,
  catalog: Announcement[] = ANNOUNCEMENTS,
): Announcement[] {
  if (!profile || typeof profile !== "object") return [];
  if (!("seen_announcements" in profile)) return [];
  const seen = parseSeenAnnouncements(profile.seen_announcements);
  return catalog.filter(
    (a) =>
      !seen[a.key] &&
      (!a.audience || a.audience.length === 0 || hasAnyPermission(profile, a.audience)),
  );
}

export function findAnnouncement(key: string): Announcement | undefined {
  return ANNOUNCEMENTS.find((a) => a.key === key);
}
