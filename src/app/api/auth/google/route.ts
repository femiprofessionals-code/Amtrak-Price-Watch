import { NextResponse, type NextRequest } from "next/server";
import { randomBytes } from "crypto";
import { googleConfigured, googleAuthUrl } from "@/lib/oauth";

/** Starts the Google sign-in flow. */
export async function GET(request: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.redirect(new URL("/login?error=google_unconfigured", request.url));
  }

  const state = randomBytes(16).toString("hex");
  const next = request.nextUrl.searchParams.get("next") ?? "";

  const response = NextResponse.redirect(googleAuthUrl(state));
  const cookieOpts = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax" as const,
    path: "/",
    maxAge: 600,
  };
  response.cookies.set("tpw_oauth_state", state, cookieOpts);
  if (next.startsWith("/") && !next.startsWith("//")) {
    response.cookies.set("tpw_oauth_next", next, cookieOpts);
  }
  return response;
}
