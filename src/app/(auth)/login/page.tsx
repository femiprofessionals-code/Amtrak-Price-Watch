import { LoginForm } from "@/components/auth/login-form";
import { googleConfigured } from "@/lib/oauth";

export const metadata = { title: "Log in" };

const OAUTH_ERRORS: Record<string, string> = {
  google_failed: "Google sign-in didn't complete. Please try again.",
  google_unconfigured: "Google sign-in isn't available right now. Use your email and password.",
};

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { next, error } = await searchParams;
  return (
    <LoginForm
      next={next}
      googleEnabled={googleConfigured()}
      oauthError={error ? (OAUTH_ERRORS[error] ?? "Sign-in failed. Please try again.") : undefined}
    />
  );
}
