import { Badge } from "@/components/ui/badge";

function Sparkline() {
  return (
    <svg
      viewBox="0 0 240 72"
      className="h-auto w-full text-success"
      role="img"
      aria-label="Price history trending down from $87 to $59"
    >
      <defs>
        <linearGradient id="spark-fill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.18" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path
        d="M2 14 L32 20 L62 16 L92 30 L122 26 L152 42 L182 38 L212 54 L238 60 V72 H2 Z"
        fill="url(#spark-fill)"
        stroke="none"
      />
      <path
        d="M2 14 L32 20 L62 16 L92 30 L122 26 L152 42 L182 38 L212 54 L238 60"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx="238" cy="60" r="4" fill="currentColor" />
      <circle
        cx="238"
        cy="60"
        r="8"
        fill="currentColor"
        opacity="0.25"
      />
    </svg>
  );
}

function BellIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" />
      <path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" />
    </svg>
  );
}

/**
 * Decorative composition: a floating "price alert" dashboard card with a
 * downward sparkline, plus a small email-notification chip.
 */
export function HeroIllustration() {
  return (
    <div className="relative mx-auto w-full max-w-md" aria-hidden={false}>
      {/* soft radial glow behind the card */}
      <div
        aria-hidden
        className="absolute -inset-10 -z-10 rounded-full bg-[radial-gradient(closest-side,color-mix(in_oklab,var(--primary)_16%,transparent),transparent_70%)]"
      />

      {/* main price alert card */}
      <div className="rotate-2 rounded-2xl border border-border bg-card p-6 shadow-lifted transition-transform duration-300 hover:rotate-0">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-medium tracking-wide text-muted-foreground uppercase">
              Northeast Regional
            </p>
            <p className="mt-1 flex items-center gap-2 text-lg font-semibold tracking-tight">
              NYC
              <svg
                className="h-4 w-4 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-label="to"
                role="img"
              >
                <path d="M5 12h14" />
                <path d="m13 6 6 6-6 6" />
              </svg>
              BOS
            </p>
          </div>
          <Badge variant="success">Target hit · $59</Badge>
        </div>

        <div className="mt-5">
          <Sparkline />
        </div>

        <div className="mt-5 flex items-end justify-between border-t border-border pt-4">
          <div>
            <p className="text-xs text-muted-foreground">Current fare</p>
            <p className="text-2xl font-semibold tracking-tight text-success">
              $59
              <span className="ml-2 text-sm font-normal text-muted-foreground line-through">
                $87
              </span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">Your target</p>
            <p className="text-sm font-medium">$60 or less</p>
          </div>
        </div>
      </div>

      {/* floating notification chip */}
      <div className="absolute -bottom-6 -left-2 -rotate-3 sm:-left-8">
        <div className="flex items-center gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-lifted">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary-soft text-primary">
            <BellIcon className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-medium">Price drop alert</p>
            <p className="text-xs text-muted-foreground">
              Email sent · just now
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
