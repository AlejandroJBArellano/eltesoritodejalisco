import crypto from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";

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

/**
 * Server Action: Generar nueva API key para el tenant autenticado
 */
export async function createTenantApiKeyAction(name = "Claude / Cursor MCP") {
  const profile = await getProfile();
  if (
    !profile ||
    (profile.role !== "ADMIN" &&
      profile.role !== "MANAGER" &&
      !hasPermission(profile, "settings.manage_restaurant"))
  ) {
    return { error: "No autorizado" };
  }

  const tenant = await getTenantContext();
  const { rawKey, keyPrefix, keyHash } = generateApiKey();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tenant_api_keys")
    .insert({
      tenant_id: tenant.id,
      name,
      key_hash: keyHash,
      key_prefix: keyPrefix,
      scopes: [
        "analytics:read",
        "orders:read",
        "inventory:read",
        "menu:read",
        "finances:read",
      ],
      created_by: profile.id,
    })
    .select("id, name, key_prefix, created_at")
    .single();

  if (error) {
    return { error: "Error al generar la API key" };
  }

  return {
    success: true,
    key: {
      id: data.id,
      name: data.name,
      keyPrefix: data.key_prefix,
      createdAt: data.created_at,
      rawKey, // Solo se retorna al crearse por única vez
    },
  };
}

/**
 * Server Action: Listar las API keys activas del tenant
 */
export async function listTenantApiKeysAction() {
  const profile = await getProfile();
  if (
    !profile ||
    (profile.role !== "ADMIN" &&
      profile.role !== "MANAGER" &&
      !hasPermission(profile, "settings.manage_restaurant"))
  ) {
    return { error: "No autorizado", keys: [] };
  }

  const tenant = await getTenantContext();
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("tenant_api_keys")
    .select("id, name, key_prefix, scopes, last_used_at, created_at")
    .eq("tenant_id", tenant.id)
    .order("created_at", { ascending: false });

  if (error) {
    return { error: "Error al listar las claves", keys: [] };
  }

  return { success: true, keys: data || [] };
}

/**
 * Server Action: Revocar una API key
 */
export async function revokeTenantApiKeyAction(keyId: string) {
  const profile = await getProfile();
  if (
    !profile ||
    (profile.role !== "ADMIN" &&
      profile.role !== "MANAGER" &&
      !hasPermission(profile, "settings.manage_restaurant"))
  ) {
    return { error: "No autorizado" };
  }

  const tenant = await getTenantContext();
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("tenant_api_keys")
    .delete()
    .eq("id", keyId)
    .eq("tenant_id", tenant.id);

  if (error) {
    return { error: "Error al revocar la API key" };
  }

  return { success: true };
}
