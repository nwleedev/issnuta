import { NextResponse, type NextRequest } from "next/server";

/**
 * CORS Middleware for Static Assets
 *
 * Handles CORS for /storage/ path to allow cross-origin requests
 * from multiple domains (e.g., issnuta.com, hinaki.issnuta.com).
 *
 * Environment variable:
 * - CORS_ALLOWED_ORIGINS: Comma-separated list of allowed origins
 */

// Parse allowed origins from environment variable
function getAllowedOrigins(): Set<string> {
  const raw = process.env.CORS_ALLOWED_ORIGINS ?? "";
  const origins = new Set(
    raw
      .split(",")
      .map((o) => o.trim())
      .filter(Boolean)
  );

  // Default fallback for development
  if (origins.size === 0) {
    origins.add("http://localhost:3000");
  }

  return origins;
}

const ALLOWED_ORIGINS = getAllowedOrigins();

/**
 * Generate CORS headers based on request origin
 */
function getCorsHeaders(origin: string | null): Record<string, string> {
  const isAllowed = origin !== null && ALLOWED_ORIGINS.has(origin);

  return {
    "Access-Control-Allow-Origin": isAllowed ? origin : "",
    "Access-Control-Allow-Methods": "GET, HEAD, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Range",
    "Access-Control-Expose-Headers": "Content-Length, Content-Range",
    "Access-Control-Max-Age": "86400", // 24 hours
  };
}

export function middleware(request: NextRequest): NextResponse {
  const origin = request.headers.get("origin");
  const corsHeaders = getCorsHeaders(origin);

  // Handle OPTIONS preflight request
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: corsHeaders,
    });
  }

  // Add CORS headers to actual request
  const response = NextResponse.next();

  if (origin && ALLOWED_ORIGINS.has(origin)) {
    Object.entries(corsHeaders).forEach(([key, value]) => {
      if (value) {
        response.headers.set(key, value);
      }
    });
  }

  return response;
}

/**
 * Matcher configuration
 * - Applies only to /storage/ path (wasm, mjs, onnx, json files)
 */
export const config = {
  matcher: ["/storage/:path*"],
};
