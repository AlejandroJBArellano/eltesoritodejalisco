/**
 * Process-level in-memory cache for enriched menu responses per tenant.
 * Eliminates repeated 6-query database round-trips and customization tree
 * computation when multiple POS terminals or pickup clients request /api/menu.
 * Automatically invalidated on menu, recipe, customization, or stock mutations.
 */
const MENU_CACHE_TTL_MS = 30 * 1000; // 30 seconds

interface MenuCacheEntry {
  items: unknown[];
  expiresAt: number;
}

const menuMemoryCache = new Map<string, MenuCacheEntry>();

export function getCachedMenu(tenantId: string): unknown[] | null {
  const entry = menuMemoryCache.get(tenantId);
  if (entry && entry.expiresAt > Date.now()) {
    return entry.items;
  }
  if (entry) {
    menuMemoryCache.delete(tenantId);
  }
  return null;
}

export function setCachedMenu(tenantId: string, items: unknown[]): void {
  menuMemoryCache.set(tenantId, {
    items,
    expiresAt: Date.now() + MENU_CACHE_TTL_MS,
  });
}

export function invalidateMenuCache(tenantId?: string): void {
  if (tenantId) {
    menuMemoryCache.delete(tenantId);
  } else {
    menuMemoryCache.clear();
  }
}
