/**
 * Borradores de checkout de Pickup.
 *
 * Stripe limita cada valor de metadata a 500 caracteres; con personalización
 * el carrito no cabe. Guardamos el carrito YA VALIDADO Y CON PRECIO (calculado
 * por el servidor) y en la metadata solo viaja `draftId`. El webhook crea la
 * orden con ese borrador aunque una opción se agote mientras el cliente paga.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import type { ResolvedOrderItem } from "./server";

type AdminClient = ReturnType<typeof createAdminClient>;

export interface CheckoutDraftPayload {
  version: 1;
  items: ResolvedOrderItem[];
}

export async function saveCheckoutDraft(
  client: AdminClient,
  tenantId: string,
  orderId: string,
  items: ResolvedOrderItem[],
): Promise<string | null> {
  const payload: CheckoutDraftPayload = { version: 1, items };
  const { data, error } = await client
    .from("checkout_drafts")
    .insert({ tenant_id: tenantId, order_id: orderId, payload })
    .select("id")
    .single();
  if (error || !data) {
    console.error("[checkout] Could not save checkout draft:", error);
    return null;
  }
  return String((data as { id: string }).id);
}

export async function loadCheckoutDraft(
  client: AdminClient,
  draftId: string,
  tenantId: string,
): Promise<ResolvedOrderItem[] | null> {
  const { data, error } = await client
    .from("checkout_drafts")
    .select("id, payload, tenant_id")
    .eq("id", draftId)
    .eq("tenant_id", tenantId)
    .maybeSingle();
  if (error || !data) return null;
  const payload = (data as { payload: CheckoutDraftPayload }).payload;
  if (!payload || !Array.isArray(payload.items)) return null;
  return payload.items;
}

export async function markCheckoutDraftConsumed(
  client: AdminClient,
  draftId: string,
): Promise<void> {
  const { error } = await client
    .from("checkout_drafts")
    .update({ consumed_at: new Date().toISOString() })
    .eq("id", draftId);
  if (error) console.error("[checkout] Could not mark draft consumed:", error);
}
