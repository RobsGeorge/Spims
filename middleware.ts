import { NextRequest, NextResponse } from "next/server";
import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";
import { v4 as uuidv4 } from "uuid";

const intlMiddleware = createMiddleware(routing);

// Paths that never require auth (next-intl needs its own handling for locales)
const PUBLIC_API_PATHS = [
  "/api/auth/",
  "/api/branding",
  "/api/webhooks/",
  "/api/verify/",
  "/api/languages",
];

function isPublicApi(pathname: string): boolean {
  if (PUBLIC_API_PATHS.some((p) => pathname.startsWith(p))) return true;
  if (/^\/api\/offerings\/[^/]+\/preview$/.test(pathname)) return true;
  return false;
}

function isApiRoute(pathname: string): boolean {
  return pathname.startsWith("/api/");
}

export default async function middleware(req: NextRequest) {
  const pathname = req.nextUrl.pathname;

  // 1. Attach a request ID to every request for tracing
  const requestId = uuidv4();
  const requestHeaders = new Headers(req.headers);
  requestHeaders.set("x-request-id", requestId);

  // 2. For API routes: minimal processing (intl middleware is for pages)
  if (isApiRoute(pathname)) {
    if (isPublicApi(pathname)) {
      return NextResponse.next({
        request: { headers: requestHeaders },
      });
    }
    // For protected API routes: auth is handled inside the route handlers via
    // getSession() + authorize(). The middleware just passes the request ID.
    return NextResponse.next({
      request: { headers: requestHeaders },
    });
  }

  // 3. For page routes: run next-intl middleware (locale detection + redirect)
  const response = intlMiddleware(req);

  // Propagate request ID to the response so route handlers can read it
  response.headers.set("x-request-id", requestId);

  return response;
}

export const config = {
  // Match all routes except Next.js internals and static files
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
