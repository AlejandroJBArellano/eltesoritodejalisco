import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/middleware";

const ALLOWED_ORIGINS = [
  "https://mili-order-portal.vercel.app",
  "http://localhost:5173", // Local dev pickup client
];

function getCorsHeaders(request: NextRequest) {
  const origin = request.headers.get("origin");
  const headers = new Headers();

  if (origin && (ALLOWED_ORIGINS.includes(origin) || origin.startsWith("http://localhost:"))) {
    headers.set("Access-Control-Allow-Origin", origin);
    headers.set("Access-Control-Allow-Methods", "GET, POST, OPTIONS, PUT, PATCH, DELETE");
    headers.set("Access-Control-Allow-Headers", "Content-Type, Authorization, stripe-signature");
    headers.set("Access-Control-Allow-Credentials", "true");
  }
  return headers;
}

function isPublicRoute(request: NextRequest): boolean {
  const path = request.nextUrl.pathname;
  const method = request.method;

  if (path === "/api/webhooks/stripe" && method === "POST") return true;
  if (path === "/api/menu" && method === "GET") return true;
  if (path === "/api/menu-categories" && method === "GET") return true;
  if (path === "/api/business-hours" && method === "GET") return true;
  if (path === "/api/payments/checkout-session" && method === "POST") return true;
  if (path === "/api/payments/session-order" && method === "GET") return true;

  // Match /api/orders/[id] (GET)
  const segments = path.split("/");
  if (
    segments[1] === "api" &&
    segments[2] === "orders" &&
    segments.length === 4 &&
    method === "GET"
  ) {
    return true;
  }

  return false;
}

export async function middleware(request: NextRequest) {
  // CORS Preflight check
  if (request.method === "OPTIONS") {
    const corsHeaders = getCorsHeaders(request);
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  const isPublic = isPublicRoute(request);
  const response = await updateSession(request, isPublic);

  // Apply CORS headers for public API calls or requests originating from allowed clients
  const corsHeaders = getCorsHeaders(request);
  corsHeaders.forEach((value, key) => {
    response.headers.set(key, value);
  });

  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
