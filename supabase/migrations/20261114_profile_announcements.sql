-- =============================================================================
-- Migración: Anuncios vistos por usuario
--
-- profiles.seen_announcements guarda qué anuncios ya aceptó cada usuario:
--   { "customization-v1": "2026-11-14T03:12:00Z", ... }
-- Un anuncio se muestra mientras su clave NO exista en el objeto.
-- =============================================================================

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS seen_announcements JSONB NOT NULL DEFAULT '{}'::jsonb;

-- Marca un anuncio como visto para el usuario autenticado (merge atómico).
CREATE OR REPLACE FUNCTION public.mark_announcement_seen(p_key TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_uid UUID := auth.uid();
  v_result JSONB;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'Not authenticated';
  END IF;
  IF p_key IS NULL OR p_key !~ '^[a-z0-9][a-z0-9._-]{0,63}$' THEN
    RAISE EXCEPTION 'Invalid announcement key';
  END IF;

  UPDATE profiles
     SET seen_announcements = COALESCE(seen_announcements, '{}'::jsonb)
                              || jsonb_build_object(p_key, to_jsonb(now())),
         updated_at = now()
   WHERE id = v_uid
  RETURNING seen_announcements INTO v_result;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_announcement_seen(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_announcement_seen(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_announcement_seen(TEXT) TO authenticated, service_role;
