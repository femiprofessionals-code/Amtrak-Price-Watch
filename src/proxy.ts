import { NextResponse, type NextRequest } from "next/server";
import { jwtVerify } from "jose";

const PROTECTED_PREFIXES = ["/dashboard", "/alerts", "/notifications", "/settings"];
const AUTH_PAGES = ["/login", "/register", "/forgot-password", "/reset-password"];

/**
 * Optimistic, cookie-only auth check (no DB access — runs on every request).
 * Real authorization happens server-side in the data layer (`requireUser`).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get("tpw_session")?.value;

  let authenticated = false;
  if (token) {
    try {
      await jwtVerify(token, new TextEncoder().encode(process.env.SESSION_SECRET), {
        algorithms: ["HS256"],
      });
      authenticated = true;
    } catch {
      authenticated = false;
    }
  }

  const isProtected = PROTECTED_PREFIXES.some((p) => pathname.startsWith(p));
  if (isProtected && !authenticated) {
    const url = new URL("/login", request.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (authenticated && AUTH_PAGES.some((p) => pathname === p)) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/alerts/:path*",
    "/notifications/:path*",
    "/settings/:path*",
    "/login",
    "/register",
    "/forgot-password",
    "/reset-password",
  ],
};
