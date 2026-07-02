import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { HeroIllustration } from "./hero-illustration";

export function Hero() {
  return (
    <section className="relative overflow-hidden" aria-labelledby="hero-heading">
      {/* decorative background wash */}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[560px] bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,color-mix(in_oklab,var(--primary)_10%,transparent),transparent)]"
      />

      <div className="mx-auto grid max-w-6xl items-center gap-14 px-4 py-20 sm:px-6 sm:py-28 lg:grid-cols-2 lg:gap-10">
        <div className="max-w-xl">
          <div className="animate-fade-up">
            <Badge variant="primary">
              <span
                aria-hidden
                className="h-1.5 w-1.5 rounded-full bg-success"
              />
              Watching fares around the clock
            </Badge>
          </div>
          <h1
            id="hero-heading"
            className="mt-5 animate-fade-up text-4xl font-semibold tracking-tight text-balance [animation-delay:80ms] sm:text-5xl lg:text-6xl"
          >
            Never overpay for a train ticket again
          </h1>
          <p className="mt-5 animate-fade-up text-lg leading-relaxed text-muted-foreground [animation-delay:160ms]">
            Travel Price Watch tracks Amtrak fares for the trips you care about
            and emails you the moment the price drops below your target.
          </p>
          <div className="mt-8 flex animate-fade-up flex-wrap items-center gap-3 [animation-delay:240ms]">
            <Link
              href="/register"
              className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
            >
              Start tracking free
            </Link>
            <Link
              href="#how-it-works"
              className="inline-flex h-11 items-center justify-center gap-2 rounded-lg border border-border bg-card px-6 text-[15px] font-medium shadow-soft transition-colors hover:bg-muted"
            >
              See how it works
              <svg
                className="h-4 w-4 text-muted-foreground"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                aria-hidden
              >
                <path d="M12 5v14" />
                <path d="m19 12-7 7-7-7" />
              </svg>
            </Link>
          </div>
          <p className="mt-4 animate-fade-up text-sm text-muted-foreground [animation-delay:320ms]">
            Free to use. No credit card required.
          </p>
        </div>

        <div className="animate-fade-up pb-8 [animation-delay:200ms] lg:pb-0">
          <HeroIllustration />
        </div>
      </div>
    </section>
  );
}
