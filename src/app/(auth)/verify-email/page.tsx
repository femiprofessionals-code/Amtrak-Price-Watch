import Link from "next/link";
import { consumeAuthToken } from "@/lib/auth";
import { db } from "@/lib/db";

export const metadata = { title: "Verify email" };

const buttonClasses =
  "inline-flex h-10 w-full items-center justify-center rounded-lg bg-primary px-4 text-sm font-medium text-primary-foreground shadow-soft transition-all duration-150 hover:bg-primary-hover";

function StatusCard({
  tone,
  icon,
  title,
  body,
  cta,
}: {
  tone: "success" | "danger";
  icon: React.ReactNode;
  title: string;
  body: string;
  cta: { href: string; label: string };
}) {
  return (
    <div className="animate-scale-in space-y-4 text-center">
      <span
        className={`mx-auto flex h-12 w-12 items-center justify-center rounded-full ${
          tone === "success" ? "bg-success-soft text-success" : "bg-danger-soft text-danger"
        }`}
      >
        {icon}
      </span>
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground">{body}</p>
      </div>
      <Link href={cta.href} className={buttonClasses}>
        {cta.label}
      </Link>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function AlertIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-6 w-6"
      aria-hidden
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 8v4" />
      <path d="M12 16h.01" />
    </svg>
  );
}

export default async function VerifyEmailPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { token } = await searchParams;

  if (!token) {
    return (
      <StatusCard
        tone="danger"
        icon={<AlertIcon />}
        title="Invalid verification link"
        body="This link is missing its verification token. Check the link in your email or request a new one after logging in."
        cta={{ href: "/login", label: "Go to log in" }}
      />
    );
  }

  const userId = await consumeAuthToken(token, "VERIFY_EMAIL");

  if (!userId) {
    return (
      <StatusCard
        tone="danger"
        icon={<AlertIcon />}
        title="Link expired or invalid"
        body="This verification link has already been used or has expired. Log in to request a new one."
        cta={{ href: "/login", label: "Go to log in" }}
      />
    );
  }

  await db.user.update({
    where: { id: userId },
    data: { emailVerifiedAt: new Date() },
  });

  return (
    <StatusCard
      tone="success"
      icon={<CheckIcon />}
      title="Email verified"
      body="Thanks for confirming your address. You're all set to start tracking fares."
      cta={{ href: "/dashboard", label: "Go to dashboard" }}
    />
  );
}
