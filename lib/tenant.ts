import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { headers } from "next/headers";
import { notFound } from "next/navigation";
import { cache } from "react";

export interface TenantContextType {
  id: string;
  name: string;
  system_name: string;
  slug: string;
  primary_color: string;
  secondary_color: string;
  dark_bg_color: string;
  logo_url: string | null;
  rfc: string | null;
  postal_code: string | null;
  regimen_fiscal: string | null;
  loyalty_enabled: boolean;
  loyalty_ratio: number;
}

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

// Cached function to fetch tenant details from the database based on the slug
export const getTenantBySlug = cache(
  async (slug: string): Promise<TenantContextType | null> => {
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

      return data as TenantContextType;
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
    notFound();
  }

  const tenant = await getTenantBySlug(slug);
  if (!tenant) {
    notFound();
  }

  return tenant;
}
