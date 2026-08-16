import { createAdminClient } from "@/lib/supabase/admin";
import type { Tables } from "@/types/supabase";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";

export type TenantContextType = Tables<"tenants">;

export function getTenantSlugFromHost(host: string | null): string | null {
  if (!host) return null;

  // Clean host (remove port if any)
  const hostname = host.split(":")[0];

  // Localhost test: e.g. tesorito.localhost
  if (hostname.endsWith(".localhost")) {
    const parts = hostname.split(".");
    if (parts.length > 1) {
      return parts[0];
    }
  }

  // Production admin dashboard: [tenant].admin.trykittn.com
  if (hostname.endsWith(".admin.trykittn.com")) {
    const parts = hostname.split(".");
    if (parts.length >= 4) {
      return parts[0];
    }
  }

  // Production pickup client: [tenant].trykittn.com
  if (
    hostname.endsWith(".trykittn.com") &&
    !hostname.endsWith("admin.trykittn.com")
  ) {
    const parts = hostname.split(".");
    if (parts.length >= 3) {
      return parts[0];
    }
  }

  return null;
}

/** Process-level in-memory cache for tenant lookups.
 *  react.cache() only survives a single render tree — it does NOT persist
 *  between Route Handler invocations. This Map lives in the Node.js worker
 *  process and eliminates the DB round-trip (~60-80ms) for every API request
 *  once the tenant has been fetched once.
 *  TTL: 5 minutes — safe for config data that rarely changes.
 */
const TENANT_CACHE_TTL_MS = 5 * 60 * 1000; // 5 min

interface TenantCacheEntry {
  data: TenantContextType;
  expiresAt: number;
}

const tenantMemoryCache = new Map<string, TenantCacheEntry>();

export function invalidateTenantCache(slug?: string) {
  if (slug) {
    tenantMemoryCache.delete(slug);
  } else {
    tenantMemoryCache.clear();
  }
}

// Cached function to fetch tenant details from the database based on the slug.
// react.cache() deduplicates concurrent calls within the same render pass;
// tenantMemoryCache deduplicates across requests within the same worker process.
export const getTenantBySlug = cache(
  async (slug: string): Promise<TenantContextType | null> => {
    // 1. Check process-level cache first
    const cached = tenantMemoryCache.get(slug);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.data;
    }

    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("tenants")
        .select("*")
        .eq("slug", slug)
        .single();

      if (error || !data) {
        console.error(`Tenant not found for slug: ${slug}`, error);
        return null;
      }

      const tenant = data as TenantContextType;

      // 2. Populate process-level cache
      tenantMemoryCache.set(slug, {
        data: tenant,
        expiresAt: Date.now() + TENANT_CACHE_TTL_MS,
      });

      return tenant;
    } catch (err) {
      console.error("Error in getTenantBySlug:", err);
      return null;
    }
  },
);

// Helper to resolve tenant context dynamically in server components, layouts, or route handlers
export async function getTenantContext(): Promise<TenantContextType> {
  const headersList = await headers();

  // Check if a client or middleware set the tenant slug header explicitly
  let slug = headersList.get("x-tenant-slug");

  // Fallback to resolving from host header
  if (!slug) {
    const host = headersList.get("host");
    slug = getTenantSlugFromHost(host);
  }

  if (!slug) {
    redirect("https://trykittn.com");
  }

  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    redirect("https://trykittn.com");
  }

  return tenant;
}
