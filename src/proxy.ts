import { type NextRequest, NextResponse } from "next/server";

import { SESSION_COOKIE, SESSION_TTL_MS, sessionCookieOptions } from "@/lib/auth/cookies";

/**
 * Request proxy (formerly "middleware"). This is an optimistic first line only:
 *  - redirects visitors without a session cookie away from app pages;
 *  - rejects cross-origin state-changing API requests (CSRF defence).
 * Authoritative authentication/authorization happens server-side on every
 * page, action and route handler (src/lib/auth/current-user.ts).
 */
const PROTECTED_PREFIXES = [
  "/dashboard",
  "/practice",
  "/sessions",
  "/history",
  "/progress",
  "/achievements",
  "/settings",
  "/onboarding",
];

/** API routes that accept cross-origin/server-to-server calls with their own verification. */
const CSRF_EXEMPT_API = ["/api/inngest", "/api/health"];

const SAFE_METHODS = new Set(["GET", "HEAD", "OPTIONS"]);

/** Routes Next prerenders to static HTML (no per-request nonce possible). */
const STATIC_PAGES = new Set(["/", "/styleguide", "/privacy", "/terms"]);

function isProtected(pathname: string) {
  return PROTECTED_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  // Browsers always send Origin on cross-origin POST/PUT/PATCH/DELETE.
  if (!origin) return true;
  const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
  try {
    return new URL(origin).host === host;
  } catch {
    return false;
  }
}

/**
 * Content Security Policy. Scripts are nonce-locked; `strict-dynamic` lets the
 * nonced Next bootstrap load its own chunks. Styles need 'unsafe-inline'
 * because Next/Tailwind inject inline <style>. Dev additionally needs
 * 'unsafe-eval' for React Refresh.
 */
function buildCsp(nonce: string | null): string {
  const dev = process.env.NODE_ENV !== "production";
  // Statically prerendered pages are cached HTML, so Next cannot inject a
  // per-request nonce into them; those routes fall back to 'unsafe-inline'.
  // They render no user data and no user-generated content.
  const scriptSrc = nonce
    ? `'self' 'nonce-${nonce}' 'strict-dynamic'${dev ? " 'unsafe-eval'" : ""}`
    : `'self' 'unsafe-inline'${dev ? " 'unsafe-eval'" : ""}`;
  return [
    "default-src 'self'",
    `script-src ${scriptSrc}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "media-src 'self' blob:",
    "font-src 'self' data:",
    // The app talks to its own origin (AI calls happen server-side), plus
    // Vercel Blob for direct recording uploads.
    `connect-src 'self' https://vercel.com https://blob.vercel-storage.com https://*.blob.vercel-storage.com${dev ? " ws: http://localhost:*" : ""}`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
    "worker-src 'self' blob:",
    ...(dev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");
}

export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (pathname.startsWith("/api/")) {
    if (
      !SAFE_METHODS.has(request.method) &&
      !CSRF_EXEMPT_API.some((p) => pathname.startsWith(p)) &&
      !isSameOrigin(request)
    ) {
      return NextResponse.json({ error: "Cross-origin request blocked." }, { status: 403 });
    }
    return NextResponse.next();
  }

  const token = request.cookies.get(SESSION_COOKIE)?.value;

  if (isProtected(pathname) && !token) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.search = `?next=${encodeURIComponent(pathname + search)}`;
    return NextResponse.redirect(url);
  }

  // Expose the requested path to Server Components so auth redirects can
  // return the user to where they were going.
  const headers = new Headers(request.headers);
  headers.set("x-pathname", pathname + search);

  // Nonce-based CSP for dynamically rendered routes: Next reads the nonce from
  // the request CSP header and applies it to its own scripts.
  const nonce = STATIC_PAGES.has(pathname)
    ? null
    : Buffer.from(crypto.randomUUID()).toString("base64");
  const csp = buildCsp(nonce);
  if (nonce) {
    headers.set("content-security-policy", csp);
    headers.set("x-nonce", nonce);
  }

  const response = NextResponse.next({ request: { headers } });
  response.headers.set("content-security-policy", csp);

  // Slide the cookie's lifetime on full page loads only. Server Components can't
  // set cookies, and the database expiry (extended server-side) stays
  // authoritative. RSC/server-action requests are skipped: after sign-out, the
  // action's internal redirect render still carries the old cookie, and
  // re-issuing it there would undo the logout.
  const isDocumentLoad = !request.headers.has("rsc") && !request.headers.has("next-action");
  if (token && request.method === "GET" && isDocumentLoad) {
    response.cookies.set(
      SESSION_COOKIE,
      token,
      sessionCookieOptions(new Date(Date.now() + SESSION_TTL_MS)),
    );
  }
  return response;
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
