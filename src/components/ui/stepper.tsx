import { cn } from "@/lib/cn";
import { Fragment } from "react";

/** Horizontal progress stepper for multi-step flows. */
export function Stepper({ steps, current }: { steps: string[]; current: number }) {
  return (
    <ol className="flex items-center gap-2" aria-label="Progress">
      {steps.map((label, i) => {
        const state = i < current ? "done" : i === current ? "active" : "todo";
        return (
          <Fragment key={label}>
            {i > 0 && (
              <span
                aria-hidden
                className={cn("h-px flex-1 transition-colors duration-300", i <= current ? "bg-primary" : "bg-border")}
              />
            )}
            <li
              aria-current={state === "active" ? "step" : undefined}
              className="flex items-center gap-2"
            >
              <span
                className={cn(
                  "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all duration-300",
                  state === "done" && "bg-primary text-primary-foreground",
                  state === "active" && "bg-primary text-primary-foreground ring-4 ring-primary/20",
                  state === "todo" && "bg-muted text-muted-foreground",
                )}
                aria-hidden
              >
                {state === "done" ? (
                  <svg className="h-3.5 w-3.5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 6 9 17l-5-5" />
                  </svg>
                ) : (
                  i + 1
                )}
              </span>
              <span
                className={cn(
                  "hidden text-[13px] font-medium sm:block",
                  state === "active" ? "text-foreground" : "text-muted-foreground",
                )}
              >
                {label}
              </span>
            </li>
          </Fragment>
        );
      })}
    </ol>
  );
}
