import { NextResponse } from "next/server";
import { getTenantContext } from "@/lib/tenant";

/**
 * GET /api/tenant
 * Returns the resolved tenant configuration based on host subdomain or headers
 */
export async function GET() {
  try {
    const tenant = await getTenantContext();
    return NextResponse.json(
      { tenant },
      {
        headers: {
          "Cache-Control": "public, max-age=10, s-maxage=60, stale-while-revalidate=600",
        },
      }
    );
  } catch (error: any) {
    if (error?.digest?.startsWith("NEXT_REDIRECT")) {
      return NextResponse.json(
        { error: "Tenant not found", redirect: "https://trykittn.com" },
        { status: 404 },
      );
    }
    console.error("Error fetching tenant config:", error);
    return NextResponse.json(
      { error: "Failed to fetch tenant config" },
      { status: 500 },
    );
  }
}
