const reasons = [
  {
    title: "Built for train travel",
    description:
      "Flight trackers ignore the rails. We focus entirely on Amtrak fares, which move more often than most riders realize.",
  },
  {
    title: "No spam, ever",
    description:
      "One email when your target is hit. No digests, no newsletters, no \"deals you might like\".",
  },
  {
    title: "Free while in beta",
    description:
      "Every feature is free today. If we ever add paid plans, existing watches stay free.",
  },
  {
    title: "Your data stays yours",
    description:
      "We store your watches and email address — nothing else. No ads, no selling data, no third-party trackers.",
  },
];

function CheckIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      className="h-4 w-4"
      aria-hidden
    >
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

export function WhyUs() {
  return (
    <section aria-labelledby="why-us-heading" className="py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-start gap-12 px-4 sm:px-6 lg:grid-cols-[1fr_1.2fr] lg:gap-16">
        <div className="max-w-md lg:sticky lg:top-28">
          <p className="text-sm font-medium text-primary">Why choose us</p>
          <h2
            id="why-us-heading"
            className="mt-3 text-3xl font-semibold tracking-tight text-balance sm:text-4xl"
          >
            The watcher that works while you don&apos;t
          </h2>
          <p className="mt-4 text-lg leading-relaxed text-muted-foreground">
            Fares on popular corridors can swing by $40 or more in a single
            week. Checking manually means catching the drop by luck — we catch
            it by design.
          </p>
        </div>
        <ul className="grid grid-cols-1 gap-5 sm:grid-cols-2">
          {reasons.map((reason) => (
            <li
              key={reason.title}
              className="rounded-2xl border border-border bg-card p-6 shadow-soft"
            >
              <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-success-soft text-success">
                <CheckIcon />
              </span>
              <h3 className="mt-3 text-[15px] font-semibold tracking-tight">
                {reason.title}
              </h3>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {reason.description}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}
