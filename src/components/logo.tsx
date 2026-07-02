import Link from "next/link";
import { cn } from "@/lib/cn";

export function LogoMark({ className }: { className?: string }) {
  return (
    <span
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-soft",
        className,
      )}
      aria-hidden
    >
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-[18px] w-[18px]">
        <path d="M8 3.1V7a4 4 0 0 0 8 0V3.1" />
        <path d="M9 15h6" />
        <path d="M17 3H7a2 2 0 0 0-2 2v10a4 4 0 0 0 4 4h6a4 4 0 0 0 4-4V5a2 2 0 0 0-2-2Z" />
        <path d="m8 19-2 3" />
        <path d="m18 22-2-3" />
      </svg>
    </span>
  );
}

export function Logo({ href = "/", className }: { href?: string; className?: string }) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5 font-semibold tracking-tight", className)}>
      <LogoMark />
      <span className="text-[15px]">Travel Price Watch</span>
    </Link>
  );
}
