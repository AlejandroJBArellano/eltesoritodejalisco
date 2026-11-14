-- =============================================================================
-- Fix: mark_announcement_seen fallaba para usuarios con perfiles en varios
-- tenants. `UPDATE ... RETURNING ... INTO` en PL/pgSQL lanza
-- "query returned more than one row" si actualiza más de una fila.
--
-- El anuncio es de la plataforma: al aceptarlo se marca en TODOS los perfiles
-- del usuario (no se repite al cambiar de sucursal). Misma firma ⇒ sin
-- sobrecargas (PGRST203).
-- =============================================================================

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

  WITH updated AS (
    UPDATE profiles
       SET seen_announcements = COALESCE(seen_announcements, '{}'::jsonb)
                                || jsonb_build_object(p_key, to_jsonb(now())),
           updated_at = now()
     WHERE id = v_uid
    RETURNING seen_announcements
  )
  SELECT seen_announcements INTO v_result FROM updated LIMIT 1;

  RETURN COALESCE(v_result, '{}'::jsonb);
END;
$function$;

REVOKE ALL ON FUNCTION public.mark_announcement_seen(TEXT) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.mark_announcement_seen(TEXT) FROM anon;
GRANT EXECUTE ON FUNCTION public.mark_announcement_seen(TEXT) TO authenticated, service_role;
