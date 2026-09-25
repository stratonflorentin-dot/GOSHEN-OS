import { NextResponse, type NextRequest } from "next/server";
import { getSessionCookie } from "better-auth/cookies";

/**
 * Lightweight edge check: redirects unauthenticated visitors away from app
 * pages. Full session verification (and RLS) happens server-side per request.
 * Static assets, API routes, and auth pages stay accessible without a session.
 */
export function middleware(request: NextRequest) {
  const hasSession = getSessionCookie(request);
  const { pathname } = request.nextUrl;

  if (!hasSession) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // App pages only; exclude static assets, images, api, and auth pages.
    "/((?!_next/static|_next/image|favicon.ico|api/|login|register|check-email).*)",
  ],
};
