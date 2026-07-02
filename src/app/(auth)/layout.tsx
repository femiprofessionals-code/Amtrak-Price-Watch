import Link from "next/link";
import { Logo } from "@/components/logo";
import { Card } from "@/components/ui/card";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-10">
      {/* Decorative background */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(60%_45%_at_50%_0%,var(--color-primary-soft),transparent_70%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(var(--color-border)_1px,transparent_1px),linear-gradient(90deg,var(--color-border)_1px,transparent_1px)] bg-[size:56px_56px] opacity-[0.18] [mask-image:radial-gradient(70%_50%_at_50%_0%,black,transparent)]"
      />

      <div className="relative z-10 flex w-full flex-col items-center gap-8">
        <Logo href="/" />

        <Card className="w-full max-w-md animate-fade-up rounded-2xl p-8 shadow-lifted">
          {children}
        </Card>

        <Link
          href="/"
          className="text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          &larr; Back to home
        </Link>
      </div>
    </div>
  );
}
