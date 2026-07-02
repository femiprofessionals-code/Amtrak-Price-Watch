import Link from "next/link";

export function CtaBanner() {
  return (
    <section aria-labelledby="cta-heading" className="py-20 sm:py-28">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="relative overflow-hidden rounded-2xl border border-border bg-card px-6 py-16 text-center shadow-lifted sm:px-16">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_70%_120%_at_50%_-20%,color-mix(in_oklab,var(--primary)_14%,transparent),transparent)]"
          />
          <div className="relative">
            <h2
              id="cta-heading"
              className="text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
            >
              Your next fare drop is coming. Catch it.
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg leading-relaxed text-muted-foreground">
              Set up your first price watch in about two minutes and let us do
              the refreshing for you.
            </p>
            <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
              <Link
                href="/register"
                className="inline-flex h-11 items-center justify-center rounded-lg bg-primary px-6 text-[15px] font-medium text-primary-foreground shadow-soft transition-colors hover:bg-primary-hover"
              >
                Start tracking free
              </Link>
              <Link
                href="/login"
                className="inline-flex h-11 items-center justify-center rounded-lg px-6 text-[15px] font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              >
                Log in
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
