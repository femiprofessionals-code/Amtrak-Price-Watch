import { cn } from "@/lib/cn";
import type { ReactNode } from "react";

/** Accessible accordion built on native <details>/<summary>. */
export function AccordionItem({
  question,
  children,
  className,
}: {
  question: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <details className={cn("group rounded-xl border border-border bg-card shadow-soft", className)}>
      <summary className="flex cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 text-[15px] font-medium [&::-webkit-details-marker]:hidden">
        {question}
        <svg
          className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-open:rotate-180"
          viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden
        >
          <path d="m6 9 6 6 6-6" />
        </svg>
      </summary>
      <div className="px-5 pb-4 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </details>
  );
}
