"use server";

import { createAdminClient } from "@/lib/supabase/admin";
import { getProfile } from "@/lib/auth";
import { getTenantContext } from "@/lib/tenant";
import { hasPermission } from "@/lib/permissions";
import { generateApiKey } from "./auth";

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
      rawKey,
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
