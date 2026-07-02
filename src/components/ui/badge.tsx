import { cn } from "@/lib/cn";
import type { HTMLAttributes } from "react";

type Variant = "default" | "success" | "danger" | "warning" | "primary" | "outline";

const variants: Record<Variant, string> = {
  default: "bg-muted text-muted-foreground",
  success: "bg-success-soft text-success",
  danger: "bg-danger-soft text-danger",
  warning: "bg-warning-soft text-warning",
  primary: "bg-primary-soft text-primary",
  outline: "border border-border text-muted-foreground",
};

export function Badge({
  variant = "default",
  className,
  ...props
}: HTMLAttributes<HTMLSpanElement> & { variant?: Variant }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium whitespace-nowrap",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
