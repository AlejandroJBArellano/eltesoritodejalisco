import { createClient } from "@/lib/supabase/server";
import { cache } from "react";
import { headers } from "next/headers";

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
  stripe_secret_key?: string | null;
  stripe_webhook_secret?: string | null;
}

export function getTenantSlugFromHost(host: string | null): string {
  if (!host) return "tesorito";

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

  return "tesorito";
}

// Cached function to fetch tenant details from the database based on the slug
export const getTenantBySlug = cache(
  async (slug: string): Promise<TenantContextType | null> => {
    try {
      const supabase = await createClient();
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

  const tenant = await getTenantBySlug(slug);
  if (tenant) return tenant;

  // Fallback tenant profile if database lookup fails
  return {
    id: "808b838b-f7e2-4f88-955d-ab4639a2e485", // Seeded tesorito UUID
    name: "El Tesorito de Jalisco",
    system_name: "TesoritoOS",
    slug: "tesorito",
    primary_color: "#FFB7CE",
    secondary_color: "#FFD1DC",
    dark_bg_color: "#121212",
    logo_url: null,
    rfc: "AIVK991104QJ0",
    postal_code: "09090",
    regimen_fiscal: "626 - Simplificado de Confianza (RESICO)",
    stripe_secret_key: null,
    stripe_webhook_secret: null,
  };
}
