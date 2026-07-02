import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/db";
import { createSession } from "@/lib/session";
import { exchangeGoogleCode, googleConfigured } from "@/lib/oauth";

/** Completes the Google sign-in flow: verifies state, links or creates the user. */
export async function GET(request: NextRequest) {
  const fail = (reason: string) =>
    NextResponse.redirect(new URL(`/login?error=${reason}`, request.url));

  if (!googleConfigured()) return fail("google_unconfigured");

  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  const cookieState = request.cookies.get("tpw_oauth_state")?.value;
  if (!code || !state || !cookieState || state !== cookieState) return fail("google_failed");

  const profile = await exchangeGoogleCode(code);
  if (!profile) return fail("google_failed");

  // Prefer the Google id; fall back to email to link pre-existing accounts.
  let user = await db.user.findUnique({ where: { googleId: profile.sub } });
  if (!user) {
    const byEmail = await db.user.findUnique({ where: { email: profile.email } });
    if (byEmail) {
      user = await db.user.update({
        where: { id: byEmail.id },
        data: {
          googleId: profile.sub,
          // Google verified this email, so the account is verified too.
          ...(byEmail.emailVerifiedAt || !profile.emailVerified ? {} : { emailVerifiedAt: new Date() }),
        },
      });
    } else {
      user = await db.user.create({
        data: {
          email: profile.email,
          name: profile.name,
          googleId: profile.sub,
          emailVerifiedAt: profile.emailVerified ? new Date() : null,
        },
      });
      await db.notification.create({
        data: {
          userId: user.id,
          type: "SYSTEM",
          title: "Welcome to Travel Price Watch",
          body: "Create your first alert and we'll start watching fares for you.",
        },
      });
    }
  }

  await createSession(user.id);

  const nextPath = request.cookies.get("tpw_oauth_next")?.value;
  const dest =
    nextPath && nextPath.startsWith("/") && !nextPath.startsWith("//") ? nextPath : "/dashboard";

  const response = NextResponse.redirect(new URL(dest, request.url));
  response.cookies.delete("tpw_oauth_state");
  response.cookies.delete("tpw_oauth_next");
  return response;
}
