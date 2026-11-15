import { revalidateTag, unstable_cache } from "next/cache";

/**
 * Shared Next.js Data Cache for enriched menu responses per tenant.
 * Revalidated immediately via `revalidateTag(..., { expire: 0 })` whenever
 * menu items, customizations, recipes, categories, or stock change.
 * Falls back cleanly to direct execution outside Next.js runtime (e.g. Vitest).
 */
const MENU_CACHE_TTL_SECONDS = 300; // 5 min safety net; mutations invalidate immediately

export function getMenuCacheTag(tenantId: string): string {
  return `menu:${tenantId}`;
}

export async function getOrLoadMenuCache<T>(
  tenantId: string,
  loader: () => Promise<T[]>,
): Promise<T[]> {
  try {
    const cachedLoader = unstable_cache(loader, ["api-menu", tenantId], {
      tags: [getMenuCacheTag(tenantId)],
      revalidate: MENU_CACHE_TTL_SECONDS,
    });
    return await cachedLoader();
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (message.includes("incrementalCache missing")) {
      return loader();
    }
    throw error;
  }
}

export function invalidateMenuCache(tenantId?: string): void {
  if (!tenantId) return;
  try {
    revalidateTag(getMenuCacheTag(tenantId), { expire: 0 });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (
      message.includes("static generation store missing") ||
      message.includes("incrementalCache missing")
    ) {
      return;
    }
    throw error;
  }
}
