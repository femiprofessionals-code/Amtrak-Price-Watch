import "server-only";

/**
 * Google OAuth 2.0 (authorization-code flow) without extra dependencies.
 *
 * Setup: create OAuth credentials at https://console.cloud.google.com/apis/credentials
 * with redirect URI `<NEXT_PUBLIC_APP_URL>/api/auth/google/callback`, then set
 * GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET.
 */

export function googleConfigured(): boolean {
  return Boolean(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
}

function redirectUri(): string {
  return `${process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000"}/api/auth/google/callback`;
}

export function googleAuthUrl(state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID!,
    redirect_uri: redirectUri(),
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
}

export type GoogleProfile = {
  sub: string;
  email: string;
  emailVerified: boolean;
  name: string;
};

/**
 * Exchanges the authorization code for tokens and returns the user profile
 * from the ID token. The token comes straight from Google over TLS, so
 * decoding its payload without signature verification is safe here.
 */
export async function exchangeGoogleCode(code: string): Promise<GoogleProfile | null> {
  const res = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: process.env.GOOGLE_CLIENT_ID!,
      client_secret: process.env.GOOGLE_CLIENT_SECRET!,
      redirect_uri: redirectUri(),
      grant_type: "authorization_code",
    }),
  });
  if (!res.ok) {
    console.error("[oauth] Google token exchange failed:", res.status, await res.text());
    return null;
  }

  const { id_token: idToken } = (await res.json()) as { id_token?: string };
  if (!idToken) return null;

  try {
    const payload = JSON.parse(Buffer.from(idToken.split(".")[1], "base64url").toString());
    if (!payload.sub || !payload.email) return null;
    return {
      sub: String(payload.sub),
      email: String(payload.email).toLowerCase(),
      emailVerified: payload.email_verified === true,
      name: String(payload.name || payload.email.split("@")[0]),
    };
  } catch {
    return null;
  }
}
