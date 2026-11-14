// POST /api/announcements/seen — marca un anuncio como visto por el usuario.
// Body: { key: string }. Guarda en profiles.seen_announcements vía RPC
// (merge atómico, solo sobre el perfil de auth.uid()).

import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getUser } from "@/lib/auth";
import {
  ANNOUNCEMENT_KEY_PATTERN,
  findAnnouncement,
  parseSeenAnnouncements,
} from "@/lib/announcements";

export async function POST(request: NextRequest) {
  try {
    const user = await getUser();
    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 });
    }

    const body = await request.json().catch(() => null);
    const key = typeof body?.key === "string" ? body.key : "";
    if (!ANNOUNCEMENT_KEY_PATTERN.test(key) || !findAnnouncement(key)) {
      return NextResponse.json({ error: "Anuncio desconocido" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data, error } = await supabase.rpc("mark_announcement_seen", {
      p_key: key,
    });
    if (error) throw error;

    return NextResponse.json({ seen: parseSeenAnnouncements(data) });
  } catch (error) {
    console.error("Error marking announcement as seen:", error);
    return NextResponse.json(
      { error: "No se pudo guardar el anuncio" },
      { status: 500 },
    );
  }
}
