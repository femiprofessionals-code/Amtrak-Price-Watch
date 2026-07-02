import { cn } from "@/lib/cn";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      aria-hidden
      className={cn(
        "animate-shimmer rounded-lg bg-[linear-gradient(110deg,var(--muted)40%,var(--border)50%,var(--muted)60%)] bg-[length:200%_100%]",
        className,
      )}
    />
  );
}
