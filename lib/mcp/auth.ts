import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";

export interface ApiKeyGenerationResult {
  rawKey: string;
  keyPrefix: string;
  keyHash: string;
}

export interface ValidationSuccess {
  valid: true;
  tenantId: string;
  scopes: string[];
  keyId: string;
  name: string;
}

export interface ValidationFailure {
  valid: false;
  error: string;
}

export type ValidationResult = ValidationSuccess | ValidationFailure;

/**
 * Genera una nueva API key con entropía criptográfica y formato kt_live_...
 */
export function generateApiKey(): ApiKeyGenerationResult {
  const randomBytes = crypto.randomBytes(24).toString("hex");
  const rawKey = `kt_live_${randomBytes}`;
  const keyPrefix = rawKey.substring(0, 16) + "...";
  const keyHash = hashApiKey(rawKey);

  return {
    rawKey,
    keyPrefix,
    keyHash,
  };
}

/**
 * Genera el hash criptográfico SHA-256 de una clave
 */
export function hashApiKey(key: string): string {
  return crypto.createHash("sha256").update(key).digest("hex");
}

/**
 * Extrae y valida el token desde un header o string crudo
 */
export function extractRawKey(headerOrKey: string): string | null {
  if (!headerOrKey || typeof headerOrKey !== "string") return null;

  const clean = headerOrKey.trim();
  if (clean.startsWith("Bearer ")) {
    return clean.slice(7).trim();
  }
  return clean;
}

/**
 * Valida una API key contra la base de datos y retorna el contexto de tenant aislado
 */
export async function validateMcpApiKey(
  headerOrKey: string | null | undefined,
): Promise<ValidationResult> {
  if (!headerOrKey) {
    return { valid: false, error: "API Key requerida" };
  }

  const rawKey = extractRawKey(headerOrKey);
  if (!rawKey || !rawKey.startsWith("kt_live_") || rawKey.length < 24) {
    return { valid: false, error: "Formato de API Key inválido" };
  }

  const keyHash = hashApiKey(rawKey);
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tenant_api_keys")
    .select("id, tenant_id, name, scopes")
    .eq("key_hash", keyHash)
    .single();

  if (error || !data) {
    return { valid: false, error: "API Key no válida o revocada" };
  }

  // Actualizar last_used_at de forma segura
  try {
    await supabase
      .from("tenant_api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", data.id);
  } catch {
    // Silencioso para no bloquear la consulta
  }

  const scopes = Array.isArray(data.scopes)
    ? (data.scopes as string[])
    : ["analytics:read", "orders:read", "inventory:read", "menu:read"];

  return {
    valid: true,
    tenantId: data.tenant_id,
    scopes,
    keyId: data.id,
    name: data.name,
  };
}
